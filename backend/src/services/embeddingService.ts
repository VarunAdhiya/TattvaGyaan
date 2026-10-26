import { Worker } from 'node:worker_threads';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { AppError } from '../middleware/errorHandler';

// Pin both index and query identity. Updating this requires rag:index again.
export const EMBEDDING_REVISION = '761b726dd34fb83930e26aab4e9ac3899aa1fa78';
export const EMBEDDING_MODEL = `multilingual-e5-small:q8:384:v1:${EMBEDDING_REVISION}`;
export const EMBEDDING_DIMENSIONS = 384;

export function vectorLiteral(vector: number[]) {
  if (vector.length !== EMBEDDING_DIMENSIONS || vector.some(value => !Number.isFinite(value)) || !vector.some(value => value !== 0)) {
    throw new AppError('Invalid search embedding. Rebuild the library index.', 503);
  }
  return `[${vector.join(',')}]`;
}

class EmbeddingService {
  private worker?: Worker;
  private nextId = 0;
  private pending = new Map<number, { resolve: (v: number[][]) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();

  async embed(texts: string[], kind: 'query' | 'passage'): Promise<number[][]> {
    if (!texts.length) return [];
    if (texts.length > 8 || this.pending.size >= 16) throw new AppError('Library search is busy. Please try again shortly.', 429);
    if (!this.worker) {
      const worker = new Worker(resolve(__dirname, '../../runtime/embedding-worker.mjs'), {
        workerData: { cacheDir: process.env.VERCEL ? resolve(tmpdir(), 'tattvagyaan-embedding-models') : resolve(__dirname, '../../data/embedding-models'), revision: EMBEDDING_REVISION },
      });
      this.worker = worker;
      worker.on('message', ({ id, vectors, error }) => {
        const request = this.pending.get(id);
        if (!request) return;
        clearTimeout(request.timer); this.pending.delete(id);
        if (error) request.reject(new AppError(error, 503));
        else {
          try { vectors.forEach(vectorLiteral); request.resolve(vectors); }
          catch { request.reject(new AppError('Search model returned an invalid embedding.', 503)); }
        }
        if (!this.pending.size) worker.unref();
      });
      worker.on('error', () => this.close());
      worker.on('exit', () => { if (this.worker === worker) this.close(); });
    }
    this.worker.ref();
    return new Promise((resolvePromise, reject) => {
      const id = ++this.nextId;
      const timer = setTimeout(() => this.close(), 300000);
      this.pending.set(id, { resolve: resolvePromise, reject, timer });
      this.worker!.postMessage({ id, texts, kind });
    });
  }

  close() {
    const worker = this.worker; this.worker = undefined;
    for (const request of this.pending.values()) {
      clearTimeout(request.timer); request.reject(new AppError('Library search model stopped or timed out. Please try again.', 503));
    }
    this.pending.clear();
    if (worker) void worker.terminate();
  }
}
export const embeddingService = new EmbeddingService();
