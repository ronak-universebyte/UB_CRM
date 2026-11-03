type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private format(level: LogLevel, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaStr}`;
  }

  info(message: string, meta?: unknown): void {
    console.log(this.format('info', message, meta));
  }

  warn(message: string, meta?: unknown): void {
    console.warn(this.format('warn', message, meta));
  }

  error(message: string, meta?: unknown): void {
    console.error(this.format('error', message, meta));
  }

  debug(message: string, meta?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.format('debug', message, meta));
    }
  }
}

export const logger = new Logger();

