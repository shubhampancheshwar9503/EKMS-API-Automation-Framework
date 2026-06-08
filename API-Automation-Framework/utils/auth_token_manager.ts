import * as dotenv from 'dotenv';
import * as xlsx from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { API_ENDPOINTS } from '../constants/api_endpoints';
import { setToken } from './token_holder';

dotenv.config({ override: true });

function formatIST(): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  const second = parts.find(p => p.type === 'second')?.value;
  return `${year}-${month}-${day} ${hour}:${minute}:${second} (IST)`;
}

export class AuthTokenManager {
  private static accessToken: string | null = null;
  private static readonly TOKEN_SHEET_NAME = 'Token';
  private static writtenResponseKeys: Set<string> = new Set();
  
  // In-memory caching of the Workbook to optimize execution and avoid concurrent file locks
  private static cachedWorkbook: xlsx.WorkBook | null = null;

  /**
   * Helper to resolve the correct Excel path, checking common locations
   */
  private static getExcelPath(): string {
    const pathsToTry = [
      path.resolve(__dirname, '../data/EKMS_API_Endpoint.xlsx'),
      path.resolve(__dirname, '../../data/EKMS_API_Endpoint.xlsx'),
      path.resolve(process.cwd(), 'data/EKMS_API_Endpoint.xlsx'),
      path.resolve(process.cwd(), 'API-Automation-Framework/data/EKMS_API_Endpoint.xlsx')
    ];

    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    // Default fallback
    return path.resolve(__dirname, '../data/EKMS_API_Endpoint.xlsx');
  }

  /**
   * Safe Workbook retriever using in-memory caching
   */
  private static getWorkbook(): xlsx.WorkBook {
    if (!this.cachedWorkbook) {
      const excelPath = this.getExcelPath();
      if (!fs.existsSync(excelPath)) {
        throw new Error(`Excel file not found at ${excelPath}. Cannot load workbook.`);
      }
      this.cachedWorkbook = xlsx.readFile(excelPath);
    }
    return this.cachedWorkbook;
  }

  /**
   * Writes the token to EKMS_API_Endpoint.xlsx under the Token sheet
   */
  static writeTokenToExcel(token: string): void {
    try {
      const excelPath = this.getExcelPath();
      const workbook = this.getWorkbook();
      const cleanToken = token.replace(/^["']|["']$/g, '');

      // Write the Token to the dedicated Token sheet for robust maintenance
      const tokenData = [{ Token: cleanToken, UpdatedAt: new Date().toISOString() }];
      const tokenWorksheet = xlsx.utils.json_to_sheet(tokenData);

      if (workbook.SheetNames.includes(this.TOKEN_SHEET_NAME)) {
        workbook.Sheets[this.TOKEN_SHEET_NAME] = tokenWorksheet;
      } else {
        xlsx.utils.book_append_sheet(workbook, tokenWorksheet, this.TOKEN_SHEET_NAME);
      }

      xlsx.writeFile(workbook, excelPath);
      console.log(`[${formatIST()}] 💾 Access Token successfully stored and maintained in Excel Token sheet.`);
    } catch (error: any) {
      if (error && error.code === 'EBUSY') {
        const lockWarningMessage = `\n[${formatIST()}] ⚠️  [Excel Persistence Warning]: The Excel file is currently open and locked.\n` +
          `👉 The framework will continue running smoothly using the fresh in-memory token.\n`;
        console.warn(lockWarningMessage);
      } else {
        console.error(`[${formatIST()}] ❌ Error: Failed to write token to Excel sheet:`, error);
        throw error;
      }
    }
  }

  /**
   * Writes the response of an endpoint scenario back to the specific sheet under the 'Response' and 'validationResult' columns.
   */
  static writeResponseToExcel(sheetName: string, scenarioIndex: number, responseStr: string, validationResult: string): void {
    const key = `${sheetName}_${scenarioIndex}`;
    if (this.writtenResponseKeys.has(key)) return;

    try {
      const excelPath = this.getExcelPath();
      const workbook = this.getWorkbook();
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        console.warn(`[${formatIST()}] ⚠️ Sheet "${sheetName}" not found in Excel. Cannot write response.`);
        return;
      }

      const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1:Z100');
      let responseColIndex = -1;
      let validationColIndex = -1;

      // 1. Scan headers row to find the column indices
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = xlsx.utils.encode_cell({ r: 0, c: col });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const headerText = String(cell.v).trim().toLowerCase();
          if (headerText === 'response') {
            responseColIndex = col;
          } else if (headerText === 'validationresult') {
            validationColIndex = col;
          }
        }
      }

      // 2. If 'Response' column is not found, dynamically append it
      if (responseColIndex === -1) {
        responseColIndex = range.e.c + 1;
        const headerAddress = xlsx.utils.encode_cell({ r: 0, c: responseColIndex });
        worksheet[headerAddress] = { t: 's', v: 'Response' };
        range.e.c = Math.max(range.e.c, responseColIndex);
      }

      // 3. If 'validationResult' column is not found, dynamically append it
      if (validationColIndex === -1) {
        validationColIndex = range.e.c + 1;
        const headerAddress = xlsx.utils.encode_cell({ r: 0, c: validationColIndex });
        worksheet[headerAddress] = { t: 's', v: 'validationResult' };
        range.e.c = Math.max(range.e.c, validationColIndex);
      }

      // Expand the bounds of the worksheet range
      worksheet['!ref'] = xlsx.utils.encode_range(range);

      // 4. Write values to the cells at row (scenarioIndex + 1)
      const targetResponseCell = xlsx.utils.encode_cell({ r: scenarioIndex + 1, c: responseColIndex });
      const targetValidationCell = xlsx.utils.encode_cell({ r: scenarioIndex + 1, c: validationColIndex });

      worksheet[targetResponseCell] = { t: 's', v: responseStr };
      worksheet[targetValidationCell] = { t: 's', v: validationResult };

      xlsx.writeFile(workbook, excelPath);
      this.writtenResponseKeys.add(key);
      console.log(`[${formatIST()}] 💾 Response & validationResult successfully saved to Sheet "${sheetName}" row ${scenarioIndex + 2}`);
    } catch (error: any) {
      if (error && error.code === 'EBUSY') {
        const lockWarningMessage = `\n[${formatIST()}] ⚠️  [Excel Response Warning]: The Excel file is currently open and locked.\n` +
          `👉 The framework skipped writing the response to disk for this run.\n`;
        console.warn(lockWarningMessage);
      } else {
        console.error(`[${formatIST()}] ❌ Error: Failed to write response to Excel sheet:`, error);
      }
    }
  }

  private static authLogPrinted = false;

  /**
   * Retrieves the cached memory token, or generates a fresh one if missing/expired.
   */
  static async getAccessToken(forceRefresh = false): Promise<string> {
    if (!this.authLogPrinted) {
      console.log('\n==================================================');
      console.log('--- Validating Authentication before running tests ---');
      this.authLogPrinted = true;
    }

    if (this.accessToken && !forceRefresh) {
      return this.accessToken;
    }

    console.log('--- Initiating Automated OAuth2 Token Retrieval ---');

    const tokenEndpoint = API_ENDPOINTS.AUTH_TOKEN;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    const clientId = 'client';
    const clientSecret = '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b';
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: params,
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Authentication Failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) {
      throw new Error('Authentication Failed: access_token missing in response.');
    }

    this.accessToken = data.access_token;
    this.writeTokenToExcel(this.accessToken);
    setToken(this.accessToken);
    console.log('✅ Automated Token Retrieval Successful.');

    return this.accessToken;
  }

  static clearToken() {
    this.accessToken = null;
  }
}
