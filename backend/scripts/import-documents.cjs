// Source PDF manifests are provenance, never runtime editions.
async function syncDocuments() {
  throw new Error('PDF editions are retired. Run node scripts/sync-library.cjs to restore the configured text editions.');
}
module.exports = { syncDocuments };
if (require.main === module) syncDocuments().catch(error => { console.error(error.message); process.exitCode = 1; });
