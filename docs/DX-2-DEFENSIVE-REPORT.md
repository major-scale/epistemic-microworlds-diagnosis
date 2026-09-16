# DX-2 defensive report - the logic made visible

Date: 2026-08-24

Project root: `[local-development-workspace]`

Branch: `dx2-logic`

Local identity: `http://127.0.0.1:5310/` with `strictPort: true`

The existing Champ application at port 5300 was neither modified nor stopped.

## WHAT LANDED

DX-2 is a separate, flat Champ-shaped model-based diagnosis instrument. Its
surface contains sixteen functional citizens in two readable rows, fifteen
qualitative probe points, a visible observation ledger, conflict-set halos,
attributed clearances, surviving single-fault candidates, automatic probe
ranking, and an honest `UNDECIDED` outcome.

The viewer has only two teaching actions. `INJECT RANDOM FAULT` creates a new
hidden case. Each press of `STEP` lets the engine select and execute exactly one
probe. Before that press, gold outlines show the complete dependency set of the
next automatic check. Afterward, the one-bit result, any new conflict, every
new clearance, and the reduced candidate set appear together. There is no
manual probe-selection mode.

The screen is intentionally not an electrical simulation. It has no voltage,
current, unit, waveform, time axis, moving component, or animated electricity.
The lesson is the diagnostic logic itself. A measurement crossing the engine
boundary is exactly one of two strings: `AGREES` or `DISAGREES`.

Code map for inspection:

- `src/model.ts` - the complete declared component/probe dependency authority
- `src/oracle.ts` - hidden single-fault injection and the one-bit observation
- `src/engine.ts` - clearance, conflicts, minimal hitting sets, candidates,
  ranking, and verdicts; it does not import the oracle
- `src/main.ts` - the flat renderer and interaction wiring
- `src/copyLaw.ts` - the no-number/no-unit surface guard
- `src/auditHarness.ts` - deterministic end-to-end diagnosis cases
- `src/engine.test.ts` - model, logic, blindness, ambiguity, and copy tests
- `src/sourceLaws.test.ts` - flatness, ASCII, port, and import-boundary laws
- `src/audit.test.ts` - the large deterministic injection batch
- `shots/` - the three required browser captures

## LOGIC AUTHORITY

The authority chain is deliberately short:

1. `model.ts` declares which components each probe prediction depends on.
2. `oracle.ts` returns `DISAGREES` exactly when the injected fault belongs to
   that dependency set; otherwise it returns `AGREES`.
3. `engine.ts` sees only `{ probeId, result }`. It cannot import, receive, or
   inspect the hidden fault.
4. An agreeing observation clears exactly the components in its dependency
   set and records the probe responsible for every clearance.
5. A disagreeing observation clears nothing. Its uncleared dependency set
   becomes a live conflict.
6. The recursive transversal engine computes inclusion-minimal hitting sets.
   Singleton sets are the surviving diagnoses under the declared single-fault
   scope. The renderer displays this computed state; it has no authored reveal
   sequence.
7. The automatic controller begins at the speaker symptom and then takes the
   current engine-ranked `BEST NEXT` probe. It reads neither the hidden fault
   nor a pre-authored case script.

The broad speaker observation depends on all sixteen citizens. The deliberately
local first-cathode observation depends on exactly the preamp capacitor, input
resistor, and first triode. The automatic sequence uses the same declared sets
that feed both the oracle and the gold preview.

Exactly one observational equivalence class is shipped: the second coupling
capacitor and power tube have identical signatures because no available probe
lies between them. The engine therefore halts `UNDECIDED` and asks for
`ISOLATE THE POWER GRID`; it does not guess.

## MUST-TRIPS

The important tests are adversarial rather than only happy-path assertions:

- A deliberately incomplete hitting-set claim is passed to an independent
  exhaustive checker and must throw `DX HITTING SET STAKE TRIPPED`.
- An agreeing observation is checked to clear exactly its dependency set and
  attribute each clearance to that observation.
- A disagreeing observation is checked to clear no component.
- Every declared citizen is injected once; each run must either resolve to
  that citizen or halt undecided while retaining it.
- A complete first-triode case is driven only by repeated calls to
  `nextAutomaticProbe`; it must terminate resolved at the injected citizen.
- The model is checked to contain exactly one duplicate observation signature,
  the declared two-citizen ambiguity.
- Source inspection rejects an oracle import or hidden-fault vocabulary in the
  diagnosis engine.
- Source inspection rejects animation declarations, animation timers, and a
  non-strict or colliding localhost identity.
- Render-time copy validation rejects any digit and named electrical unit after
  every render. Separate tests intentionally feed it a number and a unit and
  confirm the guard trips.
- Live browser inspection found no console errors, verified that STEP is
  disabled before injection and after a terminal verdict, and reproduced a
  complete random case one observation per click. The first automatic preview
  contained all sixteen speaker dependencies; subsequent candidate sets
  narrowed while eliminated citizens dimmed.

The automatic narrowing screenshot is not a staged drawing. It is a live
intermediate frame after consecutive calls to the same STEP handler used by the
viewer. Gold marks the next engine-selected dependency set, conflict colours
come from disagreeing observations, and dimming is derived from the current
singleton candidates.

## HONEST LIMITS

This is a qualitative diagnosis model, not an ngspice solve and not a claim
about numerical Champ behavior. Its correctness rests on the declared
dependency matrix. That matrix is model-authored from the functional signal and
power paths; it is not automatically extracted from the full Champ netlist.
Independent review should challenge those dependency declarations first.

The shipped fault model is exactly one broken citizen. The transversal engine
itself computes general minimal hitting sets, including multi-citizen sets, but
the primary candidate panel deliberately teaches the declared single-fault
exercise by listing singleton diagnoses.

The visual shorthand "where halos intersect" is exact for the built teaching
moment only after agreeing observations have cleared other members. In the
general case, a minimal hitting set can contain several components and is not
merely the literal intersection of all conflicts. The test suite includes such
a case to prevent the implementation from degrading into simple intersection.

Because every injected citizen affects the all-citizen speaker dependency, the
initial symptom always disagrees. That is intended for this bounded exercise,
not a universal statement about amplifier symptoms.

The optional `?fault=` query is an audit injection seam. It selects a hidden
case reproducibly but is never displayed and is not read by the diagnoser.

The local `node_modules` is an uncommitted symlink to the already installed
Champ TypeScript/Vite/Vitest toolchain, avoiding a second dependency download.
No Champ application source is imported or linked. `package.json` declares the
three development dependencies needed for an independent install.

## SCREENSHOTS

- `shots/opening.png` - every citizen initially suspect
- `shots/automatic-narrowing.png` - a live intermediate automatic step with
  reduced candidates and the next dependency preview
- `shots/final-undecided.png` - the declared two-citizen equivalence class and
  the missing measurement that would separate it

The captures were taken from the live port 5310 application. The opening and
terminal surfaces contain neither digits nor electrical-unit words.

## SEEDS

The deterministic audit exercised 4096 random single-fault injections:

| outcome | count |
|---|---:|
| resolved to the injected citizen | 3600 |
| correctly halted undecided with the injected citizen retained | 496 |
| named a healthy citizen | 0 |

This is exhaustive over repeated draws from the declared qualitative model,
not independent validation of the dependency matrix against a physical Champ.
The zero-wrong result therefore establishes internal diagnostic correctness for
the model, not empirical fault-diagnosis accuracy in real amplifiers.
