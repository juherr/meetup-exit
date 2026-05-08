export type Logger = {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
};

export function createLogger(jsonMode: boolean): Logger {
  if (jsonMode) {
    return {
      info: (msg) =>
        console.log(JSON.stringify({ level: "info", msg, ts: new Date().toISOString() })),
      warn: (msg) =>
        console.warn(JSON.stringify({ level: "warn", msg, ts: new Date().toISOString() })),
      error: (msg) =>
        console.error(JSON.stringify({ level: "error", msg, ts: new Date().toISOString() })),
    };
  }
  return {
    info: (msg) => console.log(`[meetup-exit] ${msg}`),
    warn: (msg) => console.warn(`[meetup-exit] ${msg}`),
    error: (msg) => console.error(`[meetup-exit] ${msg}`),
  };
}
