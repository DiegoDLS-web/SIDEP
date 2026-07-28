"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    }
    catch (err) {
        if (err instanceof zod_1.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Error de validación.',
                errors: err.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
            });
        }
        next(err);
    }
};
exports.validate = validate;
const validateQuery = (schema) => (req, res, next) => {
    try {
        // Express 5 expone req.query como getter de solo lectura; validar sin reasignar.
        schema.parse(req.query);
        next();
    }
    catch (err) {
        if (err instanceof zod_1.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Error de validación en parámetros.',
                errors: err.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
            });
        }
        next(err);
    }
};
exports.validateQuery = validateQuery;
