import { expect, it } from "vitest";
import { runSeedAudit } from "./auditHarness";

it("audits a large deterministic random injection batch", () => {
  const summary = runSeedAudit(4096);
  console.log(`DX SEED AUDIT ${JSON.stringify(summary)}`);
  expect(summary.resolved + summary.undecided).toBe(summary.seeds);
  expect(summary.undecided).toBeGreaterThan(0);
  expect(summary.wrong).toBe(0);
});
