import { test, expect } from '@playwright/test';
import { APIClient } from '../../utils/api_service_client';
import * as xlsx from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

import { API_ENDPOINTS, SHEET_TO_ENDPOINT } from '../../constants/api_endpoints';
import { ExcelScenarioModel } from '../../models/ip_whitelist_models';
import { AuthTokenManager } from '../../utils/auth_token_manager';

interface Scenario {
  testId: string;
  description: string;
  scenarioType: string;
  payloadJSON: string;
  expectedStatus: number;
  expectedResponse: string;
}

// Load test data from Excel
function loadScenariosFromExcel(): Map<string, Scenario[]> {
  const excelPaths = [
    path.resolve(__dirname, '../../data/EKMS_API_Endpoint.xlsx'),
    path.resolve(process.cwd(), 'data/EKMS_API_Endpoint.xlsx'),
    path.resolve(process.cwd(), 'API-Automation-Framework/data/EKMS_API_Endpoint.xlsx')
  ];

  let excelPath = '';
  for (const p of excelPaths) {
    if (fs.existsSync(p)) {
      excelPath = p;
      break;
    }
  }

  if (!excelPath) {
    console.warn('⚠️ Excel file not found. Tests will be skipped.');
    return new Map();
  }

  const workbook = xlsx.readFile(excelPath);
  const scenarioMap = new Map<string, Scenario[]>();

  for (const sheetName of workbook.SheetNames) {
    if (sheetName === 'Token') continue;

    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json<any>(worksheet);

    const scenarios: Scenario[] = data
      .filter(row => row.Test_ID)
      .map(row => ({
        testId: row.Test_ID,
        description: row.Description || 'No description',
        scenarioType: row.scenarioType || 'Unknown',
        payloadJSON: row.payloadJSON || '{}',
        expectedStatus: parseInt(row.expectedStatus) || 200,
        expectedResponse: row.expectedResponse || '{}'
      }));

    if (scenarios.length > 0) {
      scenarioMap.set(sheetName, scenarios);
    }
  }

  return scenarioMap;
}

// Main test generation
const scenarioMap = loadScenariosFromExcel();

if (scenarioMap.size === 0) {
  test.skip('No test scenarios found in Excel file', async () => {
    // Placeholder test
  });
} else {
  // Generate tests for each sheet and scenario
  for (const [sheetName, scenarios] of scenarioMap.entries()) {
    test.describe(`📋 ${sheetName}`, () => {
      for (const scenario of scenarios) {
        // Get endpoint from sheet name mapping
        const endpoint = SHEET_TO_ENDPOINT[sheetName] || '';

        if (!endpoint) {
          test.skip(`No endpoint mapping for sheet: ${sheetName}`, async () => {
            // Skipped test
          });
        } else {
          test(`[${scenario.scenarioType}] ${scenario.testId}: ${scenario.description}`, async ({ request }) => {

            // Parse payload and expected response
            let payload: any = {};
            try {
              payload = JSON.parse(scenario.payloadJSON);
            } catch (e) {
              console.warn(`Failed to parse payload for ${scenario.testId}:`, e);
              payload = {};
            }

            let expectedResponse: any = {};
            try {
              expectedResponse = JSON.parse(scenario.expectedResponse);
            } catch (e) {
              console.warn(`Failed to parse expected response for ${scenario.testId}:`, e);
              expectedResponse = {};
            }

            // Get fresh token for authenticated requests
            const token = await AuthTokenManager.getAccessToken();

            // Make API request
            const response = await request.post(endpoint, {
              data: payload,
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            // Validate response status
            expect(response.status()).toBe(scenario.expectedStatus);

            // Validate response body if provided
            const responseBody = await response.json().catch(() => ({}));

            if (Object.keys(expectedResponse).length > 0) {
              for (const [key, value] of Object.entries(expectedResponse)) {
                expect(responseBody).toHaveProperty(key);
                if (typeof value === 'string' && value !== '*') {
                  expect(responseBody[key]).toBe(value);
                }
              }
            }

            // Write response to Excel
            const sheetIndex = Array.from(scenarioMap.keys()).indexOf(sheetName);
            const scenarioIndex = scenarios.indexOf(scenario);

            AuthTokenManager.writeResponseToExcel(
              sheetName,
              scenarioIndex,
              JSON.stringify(responseBody),
              response.ok() ? 'PASS' : 'FAIL'
            );
          });
        }
      }
    });
  }
}
