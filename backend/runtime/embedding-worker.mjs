import { parentPort, workerData } from 'node:worker_threads';
import { pipeline, env } from '@huggingface/transformers';

env.cacheDir = workerData.cacheDir;
env.allowLocalModels = false;
// CPU inference is isolated from Express's event loop and bounded to two threads.
env.backends.onnx.wasm.numThreads = 2;
let extractor;
let queue = Promise.resolve();
parentPort.on('message', ({ id, texts, kind }) => {
  queue = queue.then(async () => {
    try {
      extractor ||= await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
        dtype: 'q8', device: 'cpu', revision: workerData.revision,
        session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
      });
      const output = await extractor(texts.map(text => `${kind === 'query' ? 'query' : 'passage'}: ${text}`), {
        pooling: 'mean', normalize: true, truncation: true, max_length: 512,
      });
      parentPort.postMessage({ id, vectors: output.tolist() });
    } catch {
      extractor = undefined;
      parentPort.postMessage({ id, error: 'Local embedding model could not load or run. Check network access for the initial model download and available memory.' });
    }
  });
});
