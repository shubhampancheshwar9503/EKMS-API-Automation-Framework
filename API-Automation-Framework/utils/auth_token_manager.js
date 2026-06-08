// utils/auth_token_manager.js
// Thin wrapper that registers ts-node to allow requiring the TypeScript implementation.
// NOTE: Must require the explicit .ts file path to avoid circular dependency —
// require('./auth_token_manager') would resolve back to this .js file itself.
require('ts-node').register({ transpileOnly: true });
const { AuthTokenManager } = require('./auth_token_manager.ts');
module.exports = { AuthTokenManager };
