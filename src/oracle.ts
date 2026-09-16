import { COMPONENTS, PROBE_BY_ID, type ComponentId, type ProbeId } from "./model";
import type { MeasurementBit } from "./engine";

export interface BlindOracle {
  measure(probeId: ProbeId): MeasurementBit;
  /** Deliberately absent from the diagnoser's input type. UI may reveal only
   * after the engine has reached a terminal verdict. */
  revealForTerminalComparison(): ComponentId;
}

const hash = (value: string): number => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
};

export function blindOracleForFault(fault: ComponentId): BlindOracle {
  if (!COMPONENTS.some((component) => component.id === fault)) throw new Error("DX ORACLE REJECTED: unknown injected citizen");
  return Object.freeze({
    measure(probeId: ProbeId): MeasurementBit {
      const probe = PROBE_BY_ID.get(probeId);
      if (!probe) throw new Error("DX ORACLE REJECTED: unknown observation");
      return probe.dependencies.includes(fault) ? "DISAGREES" : "AGREES";
    },
    revealForTerminalComparison: () => fault,
  });
}

export function blindOracleFromSeed(seed: string): BlindOracle {
  const forced = new URLSearchParams(location.search).get("fault") as ComponentId | null;
  const candidate = forced && COMPONENTS.some((component) => component.id === forced)
    ? forced
    : COMPONENTS[hash(seed) % COMPONENTS.length]!.id;
  return blindOracleForFault(candidate);
}
