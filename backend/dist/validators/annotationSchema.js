"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.annotationQuerySchema = void 0;
const zod_1 = require("zod");
// Optional for the account overview; readers request one unique scripture.
exports.annotationQuerySchema = zod_1.z.object({ scriptureId: zod_1.z.string().uuid().optional() });
//# sourceMappingURL=annotationSchema.js.map