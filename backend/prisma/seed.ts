// All catalog metadata and verified scripture text live in library/, not code.
const { syncLibrary } = require('../scripts/sync-library.cjs');
syncLibrary(true).catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
