import { COMPONENTS, PROBES, PROBE_BY_ID, SETTLING_MEASUREMENT, type ComponentId, type ProbeId } from "./model";

export type MeasurementBit = "AGREES" | "DISAGREES";

export interface Observation {
  readonly probeId: ProbeId;
  readonly result: MeasurementBit;
}

export type ComponentState = "SUSPECT" | "CLEARED" | "IMPLICATED";
export type Verdict = "OPEN" | "INVESTIGATING" | "RESOLVED" | "UNDECIDED" | "INCONSISTENT";

export interface ProbeRank {
  readonly probeId: ProbeId;
  readonly tier: "BEST NEXT" | "STRONG CHOICE" | "BROAD CHOICE" | "NO SPLIT";
  readonly worstRemaining: number;
}

export interface DiagnosisState {
  readonly verdict: Verdict;
  readonly observations: readonly Observation[];
  readonly clearedBy: ReadonlyMap<ComponentId, readonly ProbeId[]>;
  readonly conflicts: readonly (readonly ComponentId[])[];
  readonly minimalHittingSets: readonly (readonly ComponentId[])[];
  readonly suspects: readonly ComponentId[];
  readonly componentStates: ReadonlyMap<ComponentId, ComponentState>;
  readonly rankedProbes: readonly ProbeRank[];
  readonly settlingMeasurement: typeof SETTLING_MEASUREMENT | null;
}

const canonicalSet = (set: readonly ComponentId[]): string => [...set].sort().join("|");
const isSubset = (left: readonly ComponentId[], right: readonly ComponentId[]): boolean =>
  left.every((component) => right.includes(component));
const hits = (candidate: readonly ComponentId[], conflict: readonly ComponentId[]): boolean =>
  candidate.some((component) => conflict.includes(component));

/** Recursive transversal construction. It branches only on the first conflict
 * not yet hit and prunes every strict superset of a diagnosis already found. */
export function minimalHittingSets(conflicts: readonly (readonly ComponentId[])[]): readonly (readonly ComponentId[])[] {
  if (conflicts.length === 0) return Object.freeze([]);
  if (conflicts.some((conflict) => conflict.length === 0)) return Object.freeze([]);
  const results: ComponentId[][] = [];
  const visit = (chosen: readonly ComponentId[]): void => {
    if (results.some((result) => isSubset(result, chosen))) return;
    const unhit = conflicts.find((conflict) => !hits(chosen, conflict));
    if (!unhit) {
      for (let index = results.length - 1; index >= 0; index -= 1)
        if (isSubset(chosen, results[index]!)) results.splice(index, 1);
      results.push([...chosen].sort());
      return;
    }
    for (const component of unhit) if (!chosen.includes(component)) visit([...chosen, component]);
  };
  visit([]);
  return Object.freeze(results.sort((a, b) => a.length - b.length || canonicalSet(a).localeCompare(canonicalSet(b)))
    .map((set) => Object.freeze(set)));
}

/** Independent exhaustive stake. This does not reuse the recursive builder;
 * a corrupted traversal therefore cannot certify itself. */
export function stakeMinimalHittingSets(
  conflicts: readonly (readonly ComponentId[])[],
  claimed: readonly (readonly ComponentId[])[],
): void {
  const universe = COMPONENTS.map((component) => component.id);
  const exhaustive: ComponentId[][] = [];
  const combinations = 2 ** universe.length;
  for (let mask = 1; mask < combinations; mask += 1) {
    const candidate = universe.filter((_component, index) => (mask & (2 ** index)) !== 0);
    if (!conflicts.every((conflict) => hits(candidate, conflict))) continue;
    if (exhaustive.some((existing) => isSubset(existing, candidate))) continue;
    for (let index = exhaustive.length - 1; index >= 0; index -= 1)
      if (isSubset(candidate, exhaustive[index]!)) exhaustive.splice(index, 1);
    exhaustive.push(candidate);
  }
  const expected = exhaustive.map(canonicalSet).sort();
  const actual = claimed.map(canonicalSet).sort();
  if (expected.length !== actual.length || expected.some((key, index) => key !== actual[index]))
    throw new Error(`DX HITTING SET STAKE TRIPPED: claimed ${actual.join(",")} expected ${expected.join(",")}`);
}

const rankUnusedProbes = (suspects: readonly ComponentId[], observations: readonly Observation[]): readonly ProbeRank[] => {
  const used = new Set(observations.map((observation) => observation.probeId));
  const rows = PROBES.filter((probe) => !used.has(probe.id)).map((probe) => {
    const disagree = suspects.filter((component) => probe.dependencies.includes(component)).length;
    const agree = suspects.length - disagree;
    return { probeId: probe.id as ProbeId, worstRemaining: Math.max(disagree, agree), splits: disagree > 0 && agree > 0 };
  }).sort((left, right) => Number(right.splits) - Number(left.splits) || left.worstRemaining - right.worstRemaining || left.probeId.localeCompare(right.probeId));
  const splittable = rows.filter((row) => row.splits);
  return Object.freeze(rows.map((row, index) => Object.freeze({
    probeId: row.probeId,
    worstRemaining: row.worstRemaining,
    tier: !row.splits ? "NO SPLIT" as const : index === 0 ? "BEST NEXT" as const : index < Math.max(2, Math.ceil(splittable.length / 2)) ? "STRONG CHOICE" as const : "BROAD CHOICE" as const,
  })));
};

export function diagnose(observations: readonly Observation[]): DiagnosisState {
  const clearedMutable = new Map<ComponentId, ProbeId[]>();
  for (const observation of observations) {
    const probe = PROBE_BY_ID.get(observation.probeId);
    if (!probe) throw new Error(`DX DIAGNOSIS REJECTED: unknown probe ${observation.probeId}`);
    if (observation.result !== "AGREES") continue;
    for (const component of probe.dependencies) {
      const by = clearedMutable.get(component) ?? [];
      if (!by.includes(observation.probeId)) by.push(observation.probeId);
      clearedMutable.set(component, by);
    }
  }
  const cleared = new Set(clearedMutable.keys());
  const conflicts = observations.filter((observation) => observation.result === "DISAGREES").map((observation) => {
    const probe = PROBE_BY_ID.get(observation.probeId)!;
    return Object.freeze(probe.dependencies.filter((component) => !cleared.has(component)));
  });
  const inconsistent = conflicts.some((conflict) => conflict.length === 0);
  const hittingSets = inconsistent ? Object.freeze([]) : minimalHittingSets(conflicts);
  /* Exhaustive completeness is an independent audit boundary, not a second
   * combinatorial engine inside every interactive click. The shipped suite
   * calls stakeMinimalHittingSets and deliberately corrupts its input. */
  const suspects = conflicts.length === 0
    ? COMPONENTS.map((component) => component.id).filter((component) => !cleared.has(component))
    : hittingSets.filter((set) => set.length === 1).map((set) => set[0]!);
  const ranked = rankUnusedProbes(suspects, observations);
  const hasSplit = ranked.some((row) => row.tier !== "NO SPLIT");
  const verdict: Verdict = observations.length === 0 ? "OPEN"
    : inconsistent || suspects.length === 0 ? "INCONSISTENT"
    : suspects.length === 1 ? "RESOLVED"
    : !hasSplit ? "UNDECIDED"
    : "INVESTIGATING";
  const states = new Map<ComponentId, ComponentState>();
  for (const component of COMPONENTS.map((row) => row.id)) {
    states.set(component, cleared.has(component) ? "CLEARED"
      : conflicts.some((conflict) => conflict.includes(component)) ? "IMPLICATED"
      : "SUSPECT");
  }
  return Object.freeze({
    verdict,
    observations: Object.freeze([...observations]),
    clearedBy: new Map([...clearedMutable].map(([component, probes]) => [component, Object.freeze(probes)])),
    conflicts: Object.freeze(conflicts),
    minimalHittingSets: hittingSets,
    suspects: Object.freeze(suspects),
    componentStates: states,
    rankedProbes: ranked,
    settlingMeasurement: verdict === "UNDECIDED" ? SETTLING_MEASUREMENT : null,
  });
}

export const bestNextProbe = (state: DiagnosisState): ProbeId | null =>
  state.rankedProbes.find((row) => row.tier === "BEST NEXT")?.probeId ?? null;

/** The automatic lesson always begins at the observed symptom. Every later
 * step is chosen from the diagnoser's current information state. */
export const nextAutomaticProbe = (state: DiagnosisState): ProbeId | null => {
  if (state.verdict === "RESOLVED" || state.verdict === "UNDECIDED" || state.verdict === "INCONSISTENT") return null;
  return state.observations.length === 0 ? "speaker" : bestNextProbe(state);
};
