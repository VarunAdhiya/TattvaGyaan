import { Request } from 'express';

export const saveSession = (req: Request) => new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
export async function createUserSession(req: Request, userId: string) {
  await new Promise<void>((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
  req.session.userId = userId;
  await saveSession(req);
}
