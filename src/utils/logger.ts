// src/utils/logger.ts

import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Formato personalizado de logs
const logFormat = printf(({ level, message, timestamp, stack }) => {
    return stack
        ? `[${timestamp}] ${level}: ${message}\n${stack}`
        : `[${timestamp}] ${level}: ${message}`;
});

// Configuración del logger
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
    ),
    transports: [
        // Consola
        new winston.transports.Console(),

        // Archivo de errores
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
        }),

        // Archivo general
        new winston.transports.File({
            filename: 'logs/combined.log',
        }),
    ],
});
