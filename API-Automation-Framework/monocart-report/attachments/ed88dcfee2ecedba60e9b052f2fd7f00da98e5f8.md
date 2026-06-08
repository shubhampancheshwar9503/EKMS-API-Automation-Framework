# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ekms_api_orchestrator.spec.ts >> 📋 Modify_Owner >> [Positive] EKMS_Owner_01: Add a new partition owner successfully
- Location: tests\dynamic\ekms_api_orchestrator.spec.ts:81:13

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED 192.168.1.147:15083
Call log:
  - → POST http://192.168.1.147:15083/cb-ekms-srv/modify-owner
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.96 Safari/537.36
    - accept: application/json
    - accept-encoding: gzip,deflate,br
    - Content-Type: application/json
    - Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsicmVzb3VyY2Utc2VydmVyLXJlc3QtYXBpIl0sInNjb3BlIjpbInJlYWQiLCJ3cml0ZSJdLCJleHAiOjE3ODA5MDE2MjIsImF1dGhvcml0aWVzIjpbIlVTRVIiXSwianRpIjoibnhYcG8xZjM0RUU5ejNtMkNJXzJ6S05rSWlrIiwiY2xpZW50X2lkIjoiY2xpZW50In0.6LPu3BEzr78WMeXoOtA55es_ESII8KoJb0I03wmHsm8
    - content-length: 199

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { APIClient } from '../../utils/api_service_client';
  3   | import * as xlsx from 'xlsx';
  4   | import * as path from 'path';
  5   | import * as fs from 'fs';
  6   | 
  7   | import { API_ENDPOINTS, SHEET_TO_ENDPOINT } from '../../constants/api_endpoints';
  8   | import { ExcelScenarioModel } from '../../models/ip_whitelist_models';
  9   | import { AuthTokenManager } from '../../utils/auth_token_manager';
  10  | 
  11  | interface Scenario {
  12  |   testId: string;
  13  |   description: string;
  14  |   scenarioType: string;
  15  |   payloadJSON: string;
  16  |   expectedStatus: number;
  17  |   expectedResponse: string;
  18  | }
  19  | 
  20  | // Load test data from Excel
  21  | function loadScenariosFromExcel(): Map<string, Scenario[]> {
  22  |   const excelPaths = [
  23  |     path.resolve(__dirname, '../../data/EKMS_API_Endpoint.xlsx'),
  24  |     path.resolve(process.cwd(), 'data/EKMS_API_Endpoint.xlsx'),
  25  |     path.resolve(process.cwd(), 'API-Automation-Framework/data/EKMS_API_Endpoint.xlsx')
  26  |   ];
  27  | 
  28  |   let excelPath = '';
  29  |   for (const p of excelPaths) {
  30  |     if (fs.existsSync(p)) {
  31  |       excelPath = p;
  32  |       break;
  33  |     }
  34  |   }
  35  | 
  36  |   if (!excelPath) {
  37  |     console.warn('⚠️ Excel file not found. Tests will be skipped.');
  38  |     return new Map();
  39  |   }
  40  | 
  41  |   const workbook = xlsx.readFile(excelPath);
  42  |   const scenarioMap = new Map<string, Scenario[]>();
  43  | 
  44  |   for (const sheetName of workbook.SheetNames) {
  45  |     if (sheetName === 'Token') continue;
  46  | 
  47  |     const worksheet = workbook.Sheets[sheetName];
  48  |     const data = xlsx.utils.sheet_to_json<any>(worksheet);
  49  | 
  50  |     const scenarios: Scenario[] = data
  51  |       .filter(row => row.Test_ID)
  52  |       .map(row => ({
  53  |         testId: row.Test_ID,
  54  |         description: row.Description || 'No description',
  55  |         scenarioType: row.scenarioType || 'Unknown',
  56  |         payloadJSON: row.payloadJSON || '{}',
  57  |         expectedStatus: parseInt(row.expectedStatus) || 200,
  58  |         expectedResponse: row.expectedResponse || '{}'
  59  |       }));
  60  | 
  61  |     if (scenarios.length > 0) {
  62  |       scenarioMap.set(sheetName, scenarios);
  63  |     }
  64  |   }
  65  | 
  66  |   return scenarioMap;
  67  | }
  68  | 
  69  | // Main test generation
  70  | const scenarioMap = loadScenariosFromExcel();
  71  | 
  72  | if (scenarioMap.size === 0) {
  73  |   test.skip('No test scenarios found in Excel file', async () => {
  74  |     // Placeholder test
  75  |   });
  76  | } else {
  77  |   // Generate tests for each sheet and scenario
  78  |   for (const [sheetName, scenarios] of scenarioMap.entries()) {
  79  |     test.describe(`📋 ${sheetName}`, () => {
  80  |       for (const scenario of scenarios) {
  81  |         test(`[${scenario.scenarioType}] ${scenario.testId}: ${scenario.description}`, async ({ request }) => {
  82  |           // Get endpoint from sheet name mapping
  83  |           const endpoint = SHEET_TO_ENDPOINT[sheetName] || '';
  84  | 
  85  |           if (!endpoint) {
> 86  |             test.skip();
      |                                          ^ Error: apiRequestContext.post: connect ECONNREFUSED 192.168.1.147:15083
  87  |             return;
  88  |           }
  89  | 
  90  |           // Parse payload and expected response
  91  |           let payload: any = {};
  92  |           try {
  93  |             payload = JSON.parse(scenario.payloadJSON);
  94  |           } catch (e) {
  95  |             console.warn(`Failed to parse payload for ${scenario.testId}:`, e);
  96  |             payload = {};
  97  |           }
  98  | 
  99  |           let expectedResponse: any = {};
  100 |           try {
  101 |             expectedResponse = JSON.parse(scenario.expectedResponse);
  102 |           } catch (e) {
  103 |             console.warn(`Failed to parse expected response for ${scenario.testId}:`, e);
  104 |             expectedResponse = {};
  105 |           }
  106 | 
  107 |           // Get fresh token for authenticated requests
  108 |           const token = await AuthTokenManager.getAccessToken();
  109 | 
  110 |           // Make API request
  111 |           const response = await request.post(endpoint, {
  112 |             data: payload,
  113 |             headers: {
  114 |               Authorization: `Bearer ${token}`,
  115 |               'Content-Type': 'application/json'
  116 |             }
  117 |           });
  118 | 
  119 |           // Validate response status
  120 |           expect(response.status()).toBe(scenario.expectedStatus);
  121 | 
  122 |           // Validate response body if provided
  123 |           const responseBody = await response.json().catch(() => ({}));
  124 | 
  125 |           if (Object.keys(expectedResponse).length > 0) {
  126 |             for (const [key, value] of Object.entries(expectedResponse)) {
  127 |               expect(responseBody).toHaveProperty(key);
  128 |               if (typeof value === 'string' && value !== '*') {
  129 |                 expect(responseBody[key]).toBe(value);
  130 |               }
  131 |             }
  132 |           }
  133 | 
  134 |           // Write response to Excel
  135 |           const sheetIndex = Array.from(scenarioMap.keys()).indexOf(sheetName);
  136 |           const scenarioIndex = scenarios.indexOf(scenario);
  137 | 
  138 |           AuthTokenManager.writeResponseToExcel(
  139 |             sheetName,
  140 |             scenarioIndex,
  141 |             JSON.stringify(responseBody),
  142 |             response.ok() ? 'PASS' : 'FAIL'
  143 |           );
  144 |         });
  145 |       }
  146 |     });
  147 |   }
  148 | }
  149 | 
```