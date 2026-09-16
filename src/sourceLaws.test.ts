import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));

describe("dx source laws", () => {
  it("ships an entirely flat surface with no animation declaration", () => {
    const css = readFileSync(`${root}/src/style.css`, "utf8");
    expect(css).not.toMatch(/\banimation\s*:/);
    expect(css).not.toMatch(/\btransition\s*:/);
    const main = readFileSync(`${root}/src/main.ts`, "utf8");
    expect(main).not.toMatch(/requestAnimationFrame|setInterval|setTimeout/);
  });

  it("keeps authored source ASCII", () => {
    const files = ["index.html", ...readdirSync(`${root}/src`).filter((name) => /\.(?:ts|css)$/.test(name)).map((name) => `src/${name}`)];
    for (const file of files) expect(readFileSync(`${root}/${file}`, "utf8"), file).toMatch(/^[\x00-\x7F]*$/);
  });

  it("pins a distinct strict localhost identity", () => {
    const config = readFileSync(`${root}/vite.config.mjs`, "utf8");
    expect(config).toContain("port: 5310");
    expect(config).toContain("strictPort: true");
  });

  it("keeps the hidden oracle outside the diagnosis engine", () => {
    const engine = readFileSync(`${root}/src/engine.ts`, "utf8");
    expect(engine).not.toMatch(/from "\.\/oracle"|revealForTerminalComparison|blindOracle/);
    expect(engine).toContain("export function diagnose(observations:");
  });

  it("exposes only random injection and automatic stepping as teaching actions", () => {
    const main = readFileSync(`${root}/src/main.ts`, "utf8");
    expect(main).toContain('id="inject-fault"');
    expect(main).toContain('id="step-case"');
    expect(main).toContain("nextAutomaticProbe(diagnose(observations))");
    expect(main).not.toContain("data-probe");
    expect(main).not.toContain("TAKE ENGINE CHOICE");
    expect(main).not.toContain("RESET OBSERVATIONS");
  });
});
