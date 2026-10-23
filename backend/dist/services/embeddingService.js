"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.embeddingService = exports.EMBEDDING_DIMENSIONS = exports.EMBEDDING_MODEL = exports.EMBEDDING_REVISION = void 0;
exports.vectorLiteral = vectorLiteral;
const node_worker_threads_1 = require("node:worker_threads");
const node_path_1 = require("node:path");
const errorHandler_1 = require("../middleware/errorHandler");
// Pin both index and query identity. Updating this requires rag:index again.
exports.EMBEDDING_REVISION = '761b726dd34fb83930e26aab4e9ac3899aa1fa78';
exports.EMBEDDING_MODEL = `multilingual-e5-small:q8:384:v1:${exports.EMBEDDING_REVISION}`;
exports.EMBEDDING_DIMENSIONS = 384;
function vectorLiteral(vector) {
    if (vector.length !== exports.EMBEDDING_DIMENSIONS || vector.some(value => !Number.isFinite(value)) || !vector.some(value => value !== 0)) {
        throw new errorHandler_1.AppError('Invalid search embedding. Rebuild the library index.', 503);
    }
    return `[${vector.join(',')}]`;
}
class EmbeddingService {
    constructor() {
        this.nextId = 0;
        this.pending = new Map();
    }
    async embed(texts, kind) {
        if (!texts.length)
            return [];
        if (texts.length > 8 || this.pending.size >= 16)
            throw new errorHandler_1.AppError('Library search is busy. Please try again shortly.', 429);
        if (!this.worker) {
            const worker = new node_worker_threads_1.Worker((0, node_path_1.resolve)(__dirname, '../../runtime/embedding-worker.mjs'), {
                workerData: { cacheDir: (0, node_path_1.resolve)(__dirname, '../../data/embedding-models'), revision: exports.EMBEDDING_REVISION },
            });
            this.worker = worker;
            worker.on('message', ({ id, vectors, error }) => {
                const request = this.pending.get(id);
                if (!request)
                    return;
                clearTimeout(request.timer);
                this.pending.delete(id);
                if (error)
                    request.reject(new errorHandler_1.AppError(error, 503));
                else {
                    try {
                        vectors.forEach(vectorLiteral);
                        request.resolve(vectors);
                    }
                    catch {
                        request.reject(new errorHandler_1.AppError('Search model returned an invalid embedding.', 503));
                    }
                }
                if (!this.pending.size)
                    worker.unref();
            });
            worker.on('error', () => this.close());
            worker.on('exit', () => { if (this.worker === worker)
                this.close(); });
        }
        this.worker.ref();
        return new Promise((resolvePromise, reject) => {
            const id = ++this.nextId;
            const timer = setTimeout(() => this.close(), 300000);
            this.pending.set(id, { resolve: resolvePromise, reject, timer });
            this.worker.postMessage({ id, texts, kind });
        });
    }
    close() {
        const worker = this.worker;
        this.worker = undefined;
        for (const request of this.pending.values()) {
            clearTimeout(request.timer);
            request.reject(new errorHandler_1.AppError('Library search model stopped or timed out. Please try again.', 503));
        }
        this.pending.clear();
        if (worker)
            void worker.terminate();
    }
}
exports.embeddingService = new EmbeddingService();
//# sourceMappingURL=embeddingService.js.map