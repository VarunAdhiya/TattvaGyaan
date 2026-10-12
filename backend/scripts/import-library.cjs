require('./sync-library.cjs').syncLibrary(process.argv.includes('--apply')).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
