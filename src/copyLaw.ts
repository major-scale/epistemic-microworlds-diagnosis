export const FORBIDDEN_SURFACE_TEXT = Object.freeze([
  /[0-9]/,
  /\b(?:volt|volts|amp|amps|ampere|amperes|ohm|ohms|watt|watts|hertz)\b/i,
]);

export function assertNoMeasurementText(text: string): void {
  for (const forbidden of FORBIDDEN_SURFACE_TEXT)
    if (forbidden.test(text)) throw new Error(`DX COPY LAW TRIPPED: surface contains forbidden text '${text.match(forbidden)?.[0] ?? "unknown"}'`);
}
