/** DX-2's complete qualitative authority. No electrical magnitudes live here. */

export const COMPONENTS = Object.freeze([
  Object.freeze({ id: "power-transformer", label: "POWER TRANSFORMER", row: "power" as const }),
  Object.freeze({ id: "rectifier", label: "RECTIFIER", row: "power" as const }),
  Object.freeze({ id: "reservoir-capacitor", label: "RESERVOIR CAPACITOR", row: "power" as const }),
  Object.freeze({ id: "screen-dropper", label: "SCREEN DROPPER", row: "power" as const }),
  Object.freeze({ id: "screen-capacitor", label: "SCREEN CAPACITOR", row: "power" as const }),
  Object.freeze({ id: "preamp-dropper", label: "PREAMP DROPPER", row: "power" as const }),
  Object.freeze({ id: "preamp-capacitor", label: "PREAMP CAPACITOR", row: "power" as const }),
  Object.freeze({ id: "input-resistor", label: "INPUT RESISTOR", row: "signal" as const }),
  Object.freeze({ id: "first-triode", label: "FIRST TRIODE", row: "signal" as const }),
  Object.freeze({ id: "first-coupling", label: "FIRST COUPLING CAPACITOR", row: "signal" as const }),
  Object.freeze({ id: "volume-control", label: "VOLUME CONTROL", row: "signal" as const }),
  Object.freeze({ id: "second-triode", label: "SECOND TRIODE", row: "signal" as const }),
  Object.freeze({ id: "second-coupling", label: "SECOND COUPLING CAPACITOR", row: "signal" as const }),
  Object.freeze({ id: "power-tube", label: "POWER TUBE", row: "signal" as const }),
  Object.freeze({ id: "output-transformer", label: "OUTPUT TRANSFORMER", row: "signal" as const }),
  Object.freeze({ id: "speaker", label: "SPEAKER", row: "signal" as const }),
]);

export type ComponentId = typeof COMPONENTS[number]["id"];
export type ProbeId = typeof PROBES[number]["id"];

const ids = (...items: ComponentId[]): readonly ComponentId[] => Object.freeze(items);

export interface ProbeDefinition {
  readonly id: string;
  readonly label: string;
  readonly short: string;
  readonly dependencies: readonly ComponentId[];
}

const supplyToReservoir = ids("power-transformer", "rectifier", "reservoir-capacitor");
const supplyToScreenDropper = ids(...supplyToReservoir, "screen-dropper");
const supplyToScreen = ids(...supplyToScreenDropper, "screen-capacitor");
const supplyToPreampDropper = ids(...supplyToScreen, "preamp-dropper");
const supplyToPreamp = ids(...supplyToPreampDropper, "preamp-capacitor");
const firstStage = ids("preamp-capacitor", "input-resistor", "first-triode");
const volumeEntry = ids(...firstStage, "first-coupling");
const volumeWiper = ids(...volumeEntry, "volume-control");
const secondStage = ids(...volumeWiper, "second-triode");
/* The available qualitative observations deliberately never place a probe
 * between these two citizens. They therefore carry the same signature. */
const powerStage = ids(...secondStage, "second-coupling", "power-tube");
const transformerExit = ids(...powerStage, "output-transformer");

export const PROBES: readonly ProbeDefinition[] = Object.freeze([
  Object.freeze({ id: "transformer-exit", label: "TRANSFORMER EXIT", short: "POWER ENTERS", dependencies: ids("power-transformer") }),
  Object.freeze({ id: "rectifier-exit", label: "RECTIFIER EXIT", short: "ONE WAY HANDOFF", dependencies: ids("power-transformer", "rectifier") }),
  Object.freeze({ id: "reservoir-node", label: "RESERVOIR NODE", short: "FIRST STORE", dependencies: supplyToReservoir }),
  Object.freeze({ id: "screen-dropper-exit", label: "SCREEN DROPPER EXIT", short: "AFTER THE DROPPER", dependencies: supplyToScreenDropper }),
  Object.freeze({ id: "screen-filter", label: "SCREEN FILTER", short: "SCREEN SUPPLY", dependencies: supplyToScreen }),
  Object.freeze({ id: "preamp-dropper-exit", label: "PREAMP DROPPER EXIT", short: "BEFORE THE LAST STORE", dependencies: supplyToPreampDropper }),
  Object.freeze({ id: "preamp-filter", label: "PREAMP FILTER", short: "PREAMP SUPPLY", dependencies: supplyToPreamp }),
  Object.freeze({ id: "input-grid", label: "INPUT GRID", short: "SIGNAL ARRIVES", dependencies: ids("input-resistor") }),
  Object.freeze({ id: "first-cathode", label: "FIRST CATHODE", short: "FIRST STAGE", dependencies: firstStage }),
  Object.freeze({ id: "volume-entry", label: "VOLUME ENTRY", short: "AFTER COUPLING", dependencies: volumeEntry }),
  Object.freeze({ id: "volume-wiper", label: "VOLUME WIPER", short: "AFTER THE CONTROL", dependencies: volumeWiper }),
  Object.freeze({ id: "second-cathode", label: "SECOND CATHODE", short: "SECOND STAGE", dependencies: secondStage }),
  Object.freeze({ id: "power-stage", label: "POWER STAGE", short: "POWER HANDOFF", dependencies: powerStage }),
  Object.freeze({ id: "transformer-output", label: "OUTPUT TRANSFORMER EXIT", short: "OUTPUT HANDOFF", dependencies: transformerExit }),
  Object.freeze({ id: "speaker", label: "SPEAKER", short: "WHOLE AMPLIFIER", dependencies: ids(...COMPONENTS.map((component) => component.id)) }),
]);

export const COMPONENT_BY_ID = new Map(COMPONENTS.map((component) => [component.id, component]));
export const PROBE_BY_ID = new Map(PROBES.map((probe) => [probe.id, probe]));

export const SETTLING_MEASUREMENT = Object.freeze({
  label: "ISOLATE THE POWER GRID",
  separates: ids("second-coupling", "power-tube"),
  explanation: "A probe between the coupling capacitor and the power tube would separate this honest ambiguity.",
});

export function assertQualitativeModel(): void {
  const componentIds = new Set(COMPONENTS.map((component) => component.id));
  if (componentIds.size !== COMPONENTS.length) throw new Error("DX MODEL REJECTED: duplicate component");
  for (const probe of PROBES) {
    if (probe.dependencies.length === 0) throw new Error(`DX MODEL REJECTED: ${probe.id} has no dependency set`);
    if (new Set(probe.dependencies).size !== probe.dependencies.length)
      throw new Error(`DX MODEL REJECTED: ${probe.id} repeats a dependency`);
    for (const dependency of probe.dependencies)
      if (!componentIds.has(dependency)) throw new Error(`DX MODEL REJECTED: ${probe.id} names an unknown component`);
  }
}

assertQualitativeModel();
