// src/utils/errors.ts

// Clase principal de errores de la aplicación
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly timestamp: string;

    constructor(
        message: string,
        statusCode: number = 500,
        isOperational: boolean = true
    ) {
        super(message);

        this.name = 'AppError';
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();

        // Mantener stack trace correcto en TypeScript
        Error.captureStackTrace(this, this.constructor);
    }
}

// Errores específicos heredados de AppError
export class NotFoundError extends AppError {
    constructor(resource: string, id?: string) {
        const message = id
            ? `${resource} con ID '${id}' no encontrado`
            : `${resource} no encontrado`;
        super(message, 404);
        this.name = 'NotFoundError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 422);
        this.name = 'ValidationError';
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'No autorizado') {
        super(message, 401);
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Acceso denegado') {
        super(message, 403);
        this.name = 'ForbiddenError';
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409);
        this.name = 'ConflictError';
    }
}

// Manejador global de errores (para Express)
export const errorHandler = (
    err: Error,
    req: any,
    res: any,
    next: any
): void => {

    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            status: 'error',
            statusCode: err.statusCode,
            message: err.message,
            timestamp: err.timestamp,
        });
        return;
    }

    // Error no controlado
    console.error('Error no controlado:', err);
    res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Error interno del servidor',
        timestamp: new Date().toISOString(),
    });
};
