import "./style.css";
import { assertNoMeasurementText } from "./copyLaw";
import { diagnose, nextAutomaticProbe, type DiagnosisState, type Observation } from "./engine";
import { COMPONENTS, COMPONENT_BY_ID, PROBE_BY_ID, type ComponentId, type ProbeId } from "./model";
import { blindOracleFromSeed, type BlindOracle } from "./oracle";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("DX SURFACE REFUSED: app root is missing");

const CONFLICT_COLOURS = Object.freeze(["#ff6f91", "#6fe7ff", "#d6a8ff", "#ffd166", "#7ce6a1"]);
let oracle: BlindOracle | null = null;
let observations: Observation[] = [];
let caseActive = false;

const labelOf = (component: ComponentId): string => COMPONENT_BY_ID.get(component)?.label ?? component;
const probeLabel = (probeId: ProbeId): string => PROBE_BY_ID.get(probeId)?.label ?? probeId;
const escaped = (value: string): string => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const verdictCopy = (state: DiagnosisState): Readonly<{ eyebrow: string; title: string; detail: string }> => {
  if (!caseActive) return Object.freeze({
    eyebrow: "READY",
    title: "START WITH A HIDDEN FAILURE",
    detail: "Inject a random fault. The engine will remain blind to its identity.",
  });
  if (state.verdict === "OPEN") return Object.freeze({
    eyebrow: "FAULT HIDDEN",
    title: "THE ENGINE KNOWS NOTHING YET",
    detail: "Press STEP. The first automatic check begins at the speaker symptom.",
  });
  if (state.verdict === "INVESTIGATING") {
    const latest = state.observations.at(-1)!;
    return Object.freeze({
      eyebrow: "NARROWING",
      title: `${latest.result} AT ${probeLabel(latest.probeId)}`,
      detail: latest.result === "AGREES"
        ? "Every dependency of that check was cleared. The engine now chooses its next question."
        : "A conflict halo was added. Nothing was cleared by disagreement alone.",
    });
  }
  if (state.verdict === "RESOLVED") {
    const named = state.suspects[0]!;
    const hidden = oracle?.revealForTerminalComparison();
    return Object.freeze({
      eyebrow: "ISOLATED",
      title: `ENGINE NAMES ${labelOf(named)}`,
      detail: hidden ? `HIDDEN FAULT REVEALED AS ${labelOf(hidden)} - ${named === hidden ? "MATCH" : "MISMATCH"}` : "THE CASE HAS ENDED.",
    });
  }
  if (state.verdict === "UNDECIDED") return Object.freeze({
    eyebrow: "HONEST STOP",
    title: `UNDECIDED - ${state.suspects.map(labelOf).join(" OR ")}`,
    detail: state.settlingMeasurement?.explanation ?? "The available observations cannot separate the remaining citizens.",
  });
  return Object.freeze({ eyebrow: "REFUSED", title: "OBSERVATIONS CONFLICT", detail: "No single hidden fault can explain this observation record." });
};

const conflictIndexesFor = (state: DiagnosisState, component: ComponentId): readonly number[] =>
  state.conflicts.map((conflict, index) => conflict.includes(component) ? index : -1).filter((index) => index >= 0);

const componentMarkup = (
  state: DiagnosisState,
  component: typeof COMPONENTS[number],
  automaticDependencies: ReadonlySet<ComponentId>,
  survivingCandidates: ReadonlySet<ComponentId>,
): string => {
  const status = state.componentStates.get(component.id) ?? "SUSPECT";
  const cleared = state.clearedBy.get(component.id) ?? [];
  const rings = conflictIndexesFor(state, component.id).map((conflictIndex, ringIndex) =>
    `0 0 0 ${4 + ringIndex * 5}px ${CONFLICT_COLOURS[conflictIndex % CONFLICT_COLOURS.length]}`).join(",");
  const style = rings ? ` style="box-shadow:${rings}"` : "";
  const why = cleared.length > 0 ? `Cleared by ${cleared.map(probeLabel).join(" and ")}` : `${status.toLowerCase()} in the current diagnosis`;
  const target = automaticDependencies.has(component.id) ? " automatic-target" : "";
  const eliminated = caseActive && !survivingCandidates.has(component.id) ? " not-single-candidate" : "";
  return `<article class="component state-${status.toLowerCase()}${target}${eliminated}" data-component="${component.id}" tabindex="0" title="${escaped(why)}"${style}>
    <span class="component-symbol" aria-hidden="true">${component.row === "power" ? "PWR" : "SIG"}</span>
    <strong>${component.label}</strong><small>${status}</small>
  </article>`;
};

const rowMarkup = (
  state: DiagnosisState,
  row: "power" | "signal",
  title: string,
  automaticDependencies: ReadonlySet<ComponentId>,
  survivingCandidates: ReadonlySet<ComponentId>,
): string => `<section class="circuit-row" aria-label="${title}">
  <header><span>${title}</span><i></i></header>
  <div class="component-chain">${COMPONENTS.filter((component) => component.row === row).map((component) => componentMarkup(state, component, automaticDependencies, survivingCandidates)).join("<span class=\"wire\" aria-hidden=\"true\"></span>")}</div>
</section>`;

const observationsMarkup = (state: DiagnosisState): string => {
  if (state.observations.length === 0) return `<p class="empty-copy">The engine has received no observation.</p>`;
  let conflictIndex = 0;
  return state.observations.map((observation) => {
    const isConflict = observation.result === "DISAGREES";
    const colour = isConflict ? CONFLICT_COLOURS[conflictIndex++ % CONFLICT_COLOURS.length] : "#7ce6a1";
    return `<article class="observation ${observation.result.toLowerCase()}" style="--observation:${colour}">
      <span>${observation.result}</span><strong>${probeLabel(observation.probeId)}</strong>
      <small>${isConflict ? "AT LEAST ONE DEPENDENCY IS BROKEN" : "EVERY DEPENDENCY CLEARED"}</small>
    </article>`;
  }).join("");
};

const candidateMarkup = (state: DiagnosisState): string => {
  if (!caseActive) return `<p class="empty-copy">No hidden case is active.</p>`;
  if (state.suspects.length > 0) return `<div class="candidate-list">${state.suspects.map((component) => `<span>${labelOf(component)}</span>`).join("")}</div>`;
  return `<p class="empty-copy">No single-fault candidate survives.</p>`;
};

const automaticMarkup = (state: DiagnosisState, next: ProbeId | null): string => {
  if (!caseActive) return `<div class="automatic-copy"><span>WAITING</span><h2>INJECT A RANDOM FAULT</h2><p>The fault stays hidden until the diagnosis ends.</p></div>`;
  if (!next) return `<div class="automatic-copy complete"><span>AUTOMATIC LOGIC COMPLETE</span><h2>${state.verdict === "UNDECIDED" ? "THE ENGINE STOPPED HONESTLY" : "THE ENGINE HAS FINISHED"}</h2><p>Inject another random fault to run a new case.</p></div>`;
  const probe = PROBE_BY_ID.get(next)!;
  const tier = state.observations.length === 0 ? "SYMPTOM CHECK" : state.rankedProbes.find((rank) => rank.probeId === next)?.tier ?? "AUTOMATIC CHOICE";
  return `<div class="automatic-copy"><span>NEXT AUTOMATIC CHECK - ${tier}</span><h2>${probe.label}</h2><p>Gold outlines show every component whose correctness this prediction trusts. Press STEP to return one bit and update the logic.</p></div>`;
};

const render = (): void => {
  const state = diagnose(observations);
  const copy = verdictCopy(state);
  const next = caseActive ? nextAutomaticProbe(state) : null;
  const nextDependencies = new Set<ComponentId>(next ? PROBE_BY_ID.get(next)?.dependencies ?? [] : []);
  const survivingCandidates = new Set<ComponentId>(state.suspects);
  const terminal = state.verdict === "RESOLVED" || state.verdict === "UNDECIDED" || state.verdict === "INCONSISTENT";
  app.innerHTML = `<header class="masthead">
    <div><p class="kicker">THE CHAMP / AUTOMATIC MODEL-BASED DIAGNOSIS</p><h1>THE LOGIC MADE VISIBLE</h1><p>Inject one hidden failure, then advance the engine one decision at a time.</p></div>
    <nav><button id="inject-fault">${caseActive ? "INJECT ANOTHER FAULT" : "INJECT RANDOM FAULT"}</button><button id="step-case" class="primary-action" ${!caseActive || terminal ? "disabled" : ""}>${terminal ? "DIAGNOSIS COMPLETE" : "STEP"}</button></nav>
  </header>
  <section class="verdict ${state.verdict.toLowerCase()}"><span>${copy.eyebrow}</span><h2>${copy.title}</h2><p>${copy.detail}</p></section>
  <section class="automatic-panel">${automaticMarkup(state, next)}</section>
  <div class="workbench">
    <section class="schematic-panel">
      <header class="panel-title"><div><span>FLAT CHAMP SCHEMATIC</span><h2>DEPENDENCY MAP</h2></div><p>The engine chooses every check. You only advance the logic.</p></header>
      <div class="schematic">${rowMarkup(state, "power", "POWER SUPPLY", nextDependencies, survivingCandidates)}<div class="feed-link">SUPPLY FEEDS THE GAIN STAGES</div>${rowMarkup(state, "signal", "SIGNAL PATH", nextDependencies, survivingCandidates)}</div>
      <div class="legend"><span class="legend-next">NEXT CHECK DEPENDENCY</span><span class="legend-suspect">SURVIVING CANDIDATE</span><span class="legend-cleared">DIMMED MEANS ELIMINATED</span><span class="legend-implicated">HALO MEANS INSIDE A CONFLICT</span></div>
    </section>
    <aside class="logic-panel">
      <section><span class="section-label">SURVIVING SINGLE-FAULT CANDIDATES</span>${candidateMarkup(state)}</section>
      <section><span class="section-label">AUTOMATIC STEP RECORD</span><div class="observation-list">${observationsMarkup(state)}</div></section>
      ${state.settlingMeasurement ? `<section class="settlement"><span>MEASUREMENT NEEDED</span><strong>${state.settlingMeasurement.label}</strong><p>${state.settlingMeasurement.explanation}</p></section>` : ""}
    </aside>
  </div>`;
  assertNoMeasurementText(app.innerText);
  app.dataset.verdict = state.verdict.toLowerCase();
  app.dataset.conflicts = String(state.conflicts.length);
  app.dataset.suspects = String(state.suspects.length);
  app.dataset.caseActive = String(caseActive);
  app.dataset.nextProbe = next ?? "none";

  app.querySelector<HTMLButtonElement>("#inject-fault")?.addEventListener("click", () => {
    oracle = blindOracleFromSeed(crypto.randomUUID());
    observations = [];
    caseActive = true;
    render();
  });
  app.querySelector<HTMLButtonElement>("#step-case")?.addEventListener("click", () => {
    if (!oracle) return;
    const probeId = nextAutomaticProbe(diagnose(observations));
    if (!probeId) return;
    observations = [...observations, Object.freeze({ probeId, result: oracle.measure(probeId) })];
    render();
  });
};

render();
