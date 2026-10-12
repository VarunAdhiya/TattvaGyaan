// Compatibility entry point. Uses the same validated, idempotent catalog import.
require('../scripts/sync-library.cjs').syncLibrary(true).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
