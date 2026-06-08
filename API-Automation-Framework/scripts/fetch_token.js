const path = require('path');
const fs = require('fs');

// Register ts-node to support TypeScript imports
require('ts-node').register({ transpileOnly: true });
const { AuthTokenManager } = require('../utils/auth_token_manager');

async function fetchAndSaveToken() {
  try {
    console.log('[INFO] Fetching fresh OAuth2 token...');
    const token = await AuthTokenManager.getAccessToken(true);

    // Save token to a temporary file so the batch script can read and use it
    const tokenFilePath = path.resolve(__dirname, '../token.tmp');
    fs.writeFileSync(tokenFilePath, token, 'utf8');

    console.log('[INFO] Token successfully saved to token.tmp');
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Failed to fetch token:', error.message);
    process.exit(1);
  }
}

fetchAndSaveToken();
