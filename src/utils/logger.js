const path = require('path');
const winston = require('winston');
const config = require('../config/env');

const LOGS_DIR = path.resolve(__dirname, '../../logs');

const { combine, timestamp, printf, json, colorize } = winston.format;

const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${ts}] ${level}: ${message}${metaStr}`;
  })
);

const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(timestamp(), json()),
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'app.log'),
    }),
  ],
});

// Log separado apenas para falhas de envio (número inválido, token
// expirado, erro da API, etc), exigido pela camada de tratamento de erros.
const failureLogger = winston.createLogger({
  level: 'warn',
  format: combine(timestamp(), json()),
  transports: [
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'failures.log'),
    }),
  ],
});

module.exports = { logger, failureLogger };
