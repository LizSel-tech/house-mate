import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

type Level = 'info' | 'warn' | 'error';
type Meta = Record<string, unknown>;

const SECRET_KEY = /pass|secret|token|otp|code|authorization|cookie|key/i;

function logDir(): string {
  return path.resolve(process.cwd(), process.env.LOG_DIR?.trim() || 'logs');
}

let ready: Promise<void> | null = null;
function ensureDir() {
  ready ??= mkdir(logDir(), { recursive: true }).then(() => undefined);
  return ready;
}

function redact(meta: Meta): Meta {
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => [key, SECRET_KEY.test(key) ? '[redacted]' : value]),
  );
}

function describeError(err: unknown) {
  if (err instanceof Error) {
    const code = (err as { code?: unknown }).code;
    return {
      error: err.message,
      ...(code ? { errorCode: String(code) } : {}),
      stack: err.stack?.split('\n').slice(1, 6).map((l) => l.trim()).join(' | '),
    };
  }
  return { error: String(err) };
}

async function write(level: Level, scope: string, message: string, meta?: Meta, errorDetails?: Meta) {
  const entry = {
    time: new Date().toISOString(),
    level,
    scope,
    message,
    ...(meta ? redact(meta) : {}),
    ...errorDetails,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);

  try {
    await ensureDir();
    await appendFile(path.join(logDir(), 'app.log'), `${line}\n`);
  } catch {
    // Read-only filesystems: the console line above is still captured by the host.
  }
}

/** Structured JSON-line logs written to `logs/app.log` (or `LOG_DIR`) and the console. */
export const logger = {
  info: (scope: string, message: string, meta?: Meta) => write('info', scope, message, meta),
  warn: (scope: string, message: string, meta?: Meta) => write('warn', scope, message, meta),
  error: (scope: string, message: string, err?: unknown, meta?: Meta) =>
    write('error', scope, message, meta, err === undefined ? undefined : describeError(err)),
};
