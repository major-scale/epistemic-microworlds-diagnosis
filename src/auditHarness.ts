import { diagnose, nextAutomaticProbe, type Observation } from "./engine";
import { COMPONENTS, type ComponentId } from "./model";
import { blindOracleForFault } from "./oracle";

export interface AuditSummary {
  readonly seeds: number;
  readonly resolved: number;
  readonly undecided: number;
  readonly wrong: number;
}

export function runDiagnosisCase(fault: ComponentId): Readonly<{ verdict: string; suspects: readonly ComponentId[]; wrong: boolean }> {
  const oracle = blindOracleForFault(fault);
  const observations: Observation[] = [];
  for (;;) {
    const state = diagnose(observations);
    if (state.verdict === "RESOLVED" || state.verdict === "UNDECIDED" || state.verdict === "INCONSISTENT") {
      const wrong = state.verdict === "RESOLVED" ? state.suspects[0] !== fault : !state.suspects.includes(fault);
      return Object.freeze({ verdict: state.verdict, suspects: state.suspects, wrong });
    }
    const next = nextAutomaticProbe(state);
    if (!next) return Object.freeze({ verdict: "UNDECIDED", suspects: state.suspects, wrong: !state.suspects.includes(fault) });
    observations.push(Object.freeze({ probeId: next, result: oracle.measure(next) }));
  }
}

export function runSeedAudit(seedCount: number): AuditSummary {
  let resolved = 0; let undecided = 0; let wrong = 0;
  let draw = 0x6d2b79f5;
  for (let index = 0; index < seedCount; index += 1) {
    draw = (Math.imul(draw ^ (draw >>> 15), 1 | draw) + 0x9e3779b9 + index) >>> 0;
    const fault = COMPONENTS[draw % COMPONENTS.length]!.id;
    const result = runDiagnosisCase(fault);
    if (result.verdict === "RESOLVED") resolved += 1;
    else if (result.verdict === "UNDECIDED") undecided += 1;
    if (result.wrong) wrong += 1;
  }
  return Object.freeze({ seeds: seedCount, resolved, undecided, wrong });
}
