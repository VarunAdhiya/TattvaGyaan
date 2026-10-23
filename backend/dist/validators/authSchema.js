"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.updateProfileSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    username: zod_1.z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    displayName: zod_1.z.string().min(1).max(100).optional(),
    preferredLang: zod_1.z.string().default('en'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
    connectGoogle: zod_1.z.boolean().optional(),
});
exports.updateProfileSchema = zod_1.z.object({
    displayName: zod_1.z.string().trim().min(1, 'Enter your display name').max(100, 'Use 100 characters or fewer').optional(),
    preferredLang: zod_1.z.enum(['en', 'hi', 'mr', 'sa', 'ar', 'ur', 'pa']).optional(),
}).strict().refine(data => Object.keys(data).length > 0, 'Choose a profile field to update');
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
});
//# sourceMappingURL=authSchema.js.map