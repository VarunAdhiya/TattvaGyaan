import { z } from 'zod';

// Optional for the account overview; readers request one unique scripture.
export const annotationQuerySchema = z.object({ scriptureId: z.string().uuid().optional() });
