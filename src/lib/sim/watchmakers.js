// Herbert Simon's watchmakers (chapter 11), from "The Architecture of Complexity" (1962).
// Both build watches of 1,000 parts and are interrupted with some chance each time
// they add a part. Tempus builds the whole watch in one go, so an interruption
// loses everything assembled so far. Hora builds stable modules of ten parts
// (100 modules, then 10 assemblies of ten modules, then the watch: 111 assemblies),
// so an interruption loses at most the module in her hands.

export const PARTS = 1000;
export const MODULE = 10;
export const HORA_ASSEMBLIES = 111;
export const STEPS_PER_MONTH = 160 * 60; // one part a minute, 160 working hours

/** Expected part-placing steps to complete `n` placements in a row, when each is interrupted with chance p. */
export function stepsForRun(n, p) {
  if (p <= 0) return n;
  const q = 1 - p;
  return (Math.pow(q, -n) - 1) / p;
}

export function watchmakers(p) {
  const tempus = stepsForRun(PARTS, p);
  const hora = HORA_ASSEMBLIES * stepsForRun(MODULE, p);
  return {
    tempus: { steps: tempus, perMonth: STEPS_PER_MONTH / tempus },
    hora: { steps: hora, perMonth: STEPS_PER_MONTH / hora },
    ratio: tempus / hora,
  };
}
