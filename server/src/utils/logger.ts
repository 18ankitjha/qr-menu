// ============================================================
// Logger — Simple structured logger
// ============================================================

const getTimestamp = (): string => {
  return new Date().toISOString();
};

const formatMessage = (level: string, message: string, ...args: unknown[]): string => {
  const extra = args.length > 0 ? ' ' + args.map((a) => JSON.stringify(a)).join(' ') : '';
  return `[${getTimestamp()}] [${level}] ${message}${extra}`;
};

export const logger = {
  info: (message: string, ...args: unknown[]): void => {
    console.log(formatMessage('INFO', message, ...args));
  },
  warn: (message: string, ...args: unknown[]): void => {
    console.warn(formatMessage('WARN', message, ...args));
  },
  error: (message: string, ...args: unknown[]): void => {
    console.error(formatMessage('ERROR', message, ...args));
  },
  debug: (message: string, ...args: unknown[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('DEBUG', message, ...args));
    }
  },
};
