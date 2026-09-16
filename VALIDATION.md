# Publication validation - 2026-09-16

Fresh checks in the standalone publication copy (Node 23.10.0 on macOS):

- `npm run build`: PASS, TypeScript plus Vite production output.
- `npm test`: **20/20 pass**, three test files.
- The audit test reran 4,096 seeded single-fault trials: **3,600 resolved; 496 undecided; zero wrong**.

The fresh install exposed missing Node type declarations. This copy adds `@types/node` and the `node` tsconfig type, and includes a generated package lock. No diagnostic algorithm was changed. Recommend supported Node 24 LTS for users; the installed test host used Node 23. The screenshots are original development captures, not a fresh browser acceptance run.

The trial verifies the declared qualitative model, not real hardware or arbitrary multiple simultaneous faults. See README and the historical defensive report.
