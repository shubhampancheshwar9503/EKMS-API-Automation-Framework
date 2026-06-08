import { request } from '@playwright/test';
import * as dotenv from 'dotenv';
import { AUTH_HEADER, BEARER_PREFIX } from '../constants/api_endpoints';
import { AuthTokenManager } from './auth_token_manager';
import { getToken, setToken } from './token_holder';


dotenv.config({ override: true });

export class APIClient {

  /** POST with JWT Bearer Token — Dynamic retrieval if not in .env */
  static async post(endpoint: string, body: unknown) {
    const baseURL = process.env.BASE_URL;
    if (!baseURL) {
      throw new Error('BASE_URL environment variable is not set');
    }

    // Auto-fetch token if not manually provided in .env
    const token = process.env.TOKEN || await AuthTokenManager.getAccessToken();



    const context = await request.newContext({
      baseURL,
      extraHTTPHeaders: {
        [AUTH_HEADER]: `${BEARER_PREFIX}${token}`,
        'Content-Type': 'application/json',
      },
    });

    let res;
    let newContext;

    // Retry loop for 429 Rate Limit — exponential backoff (1s, 2s, 4s)
    const MAX_RETRIES = 3;
    let attempt = 0;
    let lastRes: any = null;

    while (attempt <= MAX_RETRIES) {
      try {
        res = await context.post(endpoint, { data: body, timeout: 30000 });

        // Self-healing: only retry when the server explicitly signals token expiry/invalidity.
        // NOTE: txn === 'NA' and errCode === 'EKMS-400' are normal API error codes (e.g. bad
        // request, not-found) and must NOT be used as token-expiry signals — doing so causes a
        // spurious token refresh on every single test call.
        try {
          const responseData = await res.json();
          const isTokenError =
            responseData &&
            responseData.errMsg &&
            (responseData.errMsg.includes('invalid_token') ||
              responseData.errMsg.includes('Token has expired') ||
              responseData.errMsg.includes('Invalid Token') ||
              responseData.errMsg.includes('Unauthorized') ||
              responseData.errMsg.includes('JWT expired'));

          const isHttp401 = res.status() === 401;

          if (isTokenError || isHttp401) {
            console.warn('🔄 Token expired/invalid. Refreshing token and retrying request.');

            // 1. Force retrieval of a fresh token
            const freshToken = await AuthTokenManager.getAccessToken(true);

            // 2. Re-create context with the new token
            newContext = await request.newContext({
              baseURL,
              extraHTTPHeaders: {
                [AUTH_HEADER]: `${BEARER_PREFIX}${freshToken}`,
                'Content-Type': 'application/json',
              },
            });

            // 3. Re-execute the POST request
            res = await newContext.post(endpoint, { data: body, timeout: 30000 });
            console.log('✅ Success: Retried endpoint successfully with the new refreshed Bearer Token.\n');
          }

          // Check for 429 Rate Limit — retry with backoff
          const isRateLimited = res.status() === 429 ||
            (responseData && responseData.errCode === 'EKMS-429');
          if (isRateLimited && attempt < MAX_RETRIES) {
            const backoffMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
            console.warn(`⏳ Rate limited (429). Retrying in ${backoffMs}ms... (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            attempt++;
            continue;
          }
        } catch (e) {
          // Ignore if response is not JSON or parsing fails
        }

        // Buffer status and body before disposing the context
        const responseStatus = res.status();
        let responseBody: any = null;
        let responseText = '';
        try {
          responseBody = await res.json();
        } catch (e) {
          try {
            responseText = await res.text();
          } catch (err) { }
        }

        // Return a lightweight mock of Playwright's APIResponse that remains usable after context disposal
        return {
          status: () => responseStatus,
          json: async () => responseBody,
          text: async () => responseText || JSON.stringify(responseBody),
          ok: () => responseStatus >= 200 && responseStatus < 300,
        } as any;
      } finally {
        if (attempt > MAX_RETRIES || attempt === 0) {
          await context.dispose();
          if (newContext) {
            await newContext.dispose();
          }
        }
      }
    }

    // Fallback: should not reach here, but return last response
    await context.dispose();
    if (newContext) await newContext.dispose();
    return lastRes;
  }

  /** POST without any Authorization header — used to verify auth enforcement */
  static async postNoAuth(endpoint: string, body: unknown) {
    const baseURL = process.env.BASE_URL;
    if (!baseURL) {
      throw new Error('BASE_URL environment variable is not set');
    }
    const context = await request.newContext({
      baseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
    });

    try {
      const res = await context.post(endpoint, { data: body, timeout: 30000 });
      const responseStatus = res.status();
      let responseBody: any = null;
      let responseText = '';
      try {
        responseBody = await res.json();
      } catch (e) {
        try {
          responseText = await res.text();
        } catch (err) { }
      }

      return {
        status: () => responseStatus,
        json: async () => responseBody,
        text: async () => responseText || JSON.stringify(responseBody),
        ok: () => responseStatus >= 200 && responseStatus < 300,
      } as any;
    } finally {
      await context.dispose();
    }
  }
}
