// The engine write routes the dashboard may call (paths below /api on the engine).
// Used only by the engine-write route handler; anything else answers 403.

export const ENGINE_WRITES: RegExp[] = [
  /^execution\/emergency-stop$/,
  /^execution\/create$/,
  /^execution\/close\/[A-Za-z0-9_.:-]{1,128}$/,
  /^execution\/cancel\/[A-Za-z0-9_.:-]{1,128}$/,
  /^paper\/(start|stop|resolve)$/,
  /^sleeves\/global-halt\/clear$/,
]

export function allowedEnginePath(path: string): boolean {
  return ENGINE_WRITES.some((re) => re.test(path))
}
