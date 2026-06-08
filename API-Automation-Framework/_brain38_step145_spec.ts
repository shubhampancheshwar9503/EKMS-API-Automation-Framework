import { test, expect } from '@playwright/test';
import { APIClient } from '../../utils/api_service_client';
import * as xlsx from 'xlsx';
import * as path from 'path';

import { API_ENDPOINTS, SHEET_TO_ENDPOINT } from '../../constants/api_endpoints';
import { ExcelScenarioModel } from '../../models/ip_whitelist_models';
import { AuthTokenManager } from '../../utils/auth_token_manager';

// Helper to format timestamps in Asia/Kolkata (IST) timezone
function formatISTDate(): string {
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

const excelPath = path.resolve('data', 'EKMS_API_Endpoint.xlsx');
const workbook = xlsx.readFile(excelPath);

// Helper to recursively replace string templates like ".env:VAR" with process.env[VAR]
function resolveEnvFields(obj: any): any {
  if (typeof obj === 'string') {
    if (obj.startsWith('.env:')) {
      const envVar = obj.replace('.env:', '');
      return process.env[envVar] || '';
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => resolveEnvFields(item));
  }
  if (typeof obj === 'object' && obj !== null) {
    const resolved: any = {};
    for (const key of Object.keys(obj)) {
      resolved[key] = resolveEnvFields(obj[key]);
    }
    return resolved;
  }
  return obj;
}
\
<truncated 11182 bytes
