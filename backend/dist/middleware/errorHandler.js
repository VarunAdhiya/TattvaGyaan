"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
function errorHandler(err, req, res, _next) {
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: err.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) });
    }
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
        });
    }
    const code = err.code;
    if (['P2024', 'P2037', '53300'].includes(code || '') ||
        /EMAXCONNSESSION|MaxClientsInSessionMode|max clients reached|too many clients already/i.test(err.message)) {
        console.error('Database connection capacity exhausted');
        res.setHeader('Retry-After', '2');
        return res.status(503).json({ error: 'The database is busy. Please try again shortly.' });
    }
    console.error('Unexpected error:', err);
    return res.status(500).json({
        error: 'An unexpected error occurred',
    });
}
//# sourceMappingURL=errorHandler.js.map