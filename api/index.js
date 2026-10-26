// Export Express directly; Vercel owns the HTTP listener and request lifecycle.
module.exports = require('../backend/dist/app').default;
