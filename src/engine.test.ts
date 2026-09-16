import { describe, expect, it } from "vitest";
import { assertNoMeasurementText } from "./copyLaw";
import { diagnose, minimalHittingSets, nextAutomaticProbe, stakeMinimalHittingSets, type Observation } from "./engine";
import { runDiagnosisCase, runSeedAudit } from "./auditHarness";
import { COMPONENTS, PROBES, PROBE_BY_ID, SETTLING_MEASUREMENT, type ComponentId } from "./model";
import { blindOracleForFault } from "./oracle";

describe("dx qualitative model", () => {
  it("makes the speaker broad and the first cathode deliberately local", () => {
    expect(PROBE_BY_ID.get("speaker")!.dependencies).toEqual(COMPONENTS.map((component) => component.id));
    expect(PROBE_BY_ID.get("first-cathode")!.dependencies).toEqual(["preamp-capacitor", "input-resistor", "first-triode"]);
  });

  it("ships exactly one unavailable-observation ambiguity class", () => {
    const signature = (component: ComponentId) => PROBES.map((probe) => probe.dependencies.includes(component) ? "yes" : "no").join("|");
    const classes = new Map<string, ComponentId[]>();
    for (const component of COMPONENTS) classes.set(signature(component.id), [...classes.get(signature(component.id)) ?? [], component.id]);
    expect([...classes.values()].filter((members) => members.length > 1)).toEqual([["second-coupling", "power-tube"]]);
    expect(SETTLING_MEASUREMENT.separates).toEqual(["second-coupling", "power-tube"]);
  });
});

describe("dx de Kleer engine", () => {
  it("opens with every citizen suspect", () => {
    const state = diagnose([]);
    expect(state.verdict).toBe("OPEN");
    expect([...state.componentStates.values()].every((status) => status === "SUSPECT")).toBe(true);
    expect(nextAutomaticProbe(state)).toBe("speaker");
  });

  it("drives the entire lesson through automatic steps without reading the hidden fault", () => {
    const oracle = blindOracleForFault("first-triode");
    const observations: Observation[] = [];
    for (;;) {
      const state = diagnose(observations);
      const next = nextAutomaticProbe(state);
      if (!next) {
        expect(state.verdict).toBe("RESOLVED");
        expect(state.suspects).toEqual(["first-triode"]);
        break;
      }
      observations.push(Object.freeze({ probeId: next, result: oracle.measure(next) }));
    }
  });

  it("an agreeing measurement clears exactly its dependency set and attributes every clearance", () => {
    const observation: Observation = Object.freeze({ probeId: "first-cathode", result: "AGREES" });
    const state = diagnose([observation]);
    const cleared = [...state.componentStates].filter(([, status]) => status === "CLEARED").map(([component]) => component).sort();
    expect(cleared).toEqual([...PROBE_BY_ID.get("first-cathode")!.dependencies].sort());
    for (const component of cleared) expect(state.clearedBy.get(component)).toEqual(["first-cathode"]);
  });

  it("a disagreeing measurement clears nothing", () => {
    const state = diagnose([Object.freeze({ probeId: "first-cathode", result: "DISAGREES" })]);
    expect(state.clearedBy.size).toBe(0);
    expect([...state.componentStates.values()].filter((status) => status === "CLEARED")).toEqual([]);
  });

  it("computes inclusion-minimal hitting sets rather than only intersecting conflicts", () => {
    const conflicts = [
      ["input-resistor", "first-triode"],
      ["first-triode", "first-coupling"],
    ] as const;
    expect(minimalHittingSets(conflicts)).toEqual([
      ["first-triode"],
      ["first-coupling", "input-resistor"],
    ]);
  });

  it("must-trips when a corrupted hitting-set result omits a real diagnosis", () => {
    const conflicts = [
      ["input-resistor", "first-triode"],
      ["first-triode", "first-coupling"],
    ] as const;
    const corrupted = [["first-triode"]] as const;
    expect(() => stakeMinimalHittingSets(conflicts, corrupted)).toThrow(/HITTING SET STAKE TRIPPED/);
  });

  it("stops honestly on the one indistinguishable class and names the settling observation", () => {
    for (const fault of ["second-coupling", "power-tube"] as const) {
      const result = runDiagnosisCase(fault);
      expect(result.verdict).toBe("UNDECIDED");
      expect([...result.suspects].sort()).toEqual(["power-tube", "second-coupling"]);
      expect(result.wrong).toBe(false);
    }
  });
});

describe("dx blindness and accuracy", () => {
  it("the oracle returns only one bit for a declared dependency", () => {
    const oracle = blindOracleForFault("first-triode");
    expect(oracle.measure("first-cathode")).toBe("DISAGREES");
    expect(oracle.measure("input-grid")).toBe("AGREES");
    expect(Object.keys(oracle).sort()).toEqual(["measure", "revealForTerminalComparison"]);
  });

  it("never names a healthy component across a large seeded batch", () => {
    const audit = runSeedAudit(512);
    expect(audit.seeds).toBe(512);
    expect(audit.resolved + audit.undecided).toBe(audit.seeds);
    expect(audit.undecided).toBeGreaterThan(0);
    expect(audit.wrong).toBe(0);
  });

  it("resolves every declared citizen or halts undecided with the fault still present", () => {
    for (const component of COMPONENTS) {
      const result = runDiagnosisCase(component.id);
      expect(["RESOLVED", "UNDECIDED"]).toContain(result.verdict);
      expect(result.wrong, component.id).toBe(false);
    }
  });
});

describe("dx copy law", () => {
  it("rejects numeric readings and measurement units", () => {
    expect(() => assertNoMeasurementText("AGREES OR DISAGREES")).not.toThrow();
    expect(() => assertNoMeasurementText("reading 12")).toThrow(/COPY LAW/);
    expect(() => assertNoMeasurementText("several volts")).toThrow(/COPY LAW/);
  });

  it("keeps every rendered model label free of digits and measurement units", () => {
    for (const text of [
      ...COMPONENTS.flatMap((component) => [component.label]),
      ...PROBES.flatMap((probe) => [probe.label, probe.short]),
      SETTLING_MEASUREMENT.label,
      SETTLING_MEASUREMENT.explanation,
    ]) expect(() => assertNoMeasurementText(text), text).not.toThrow();
  });
});
