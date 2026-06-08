/**
 * Data Models for IP Whitelist API
 */

export interface IPWhitelistRequest {
  txn: string;
  action: 'add' | 'del' | 'list';
  ip?: string;
}

export interface IPWhitelistResponse {
  txn: string;
  status: '1' | '-1';
  succMsg?: string;
  errCode?: string;
  errMsg?: string;
  total?: number;
  list?: string[];
}

export interface ExcelScenarioModel {
  Test_ID: string;
  Description: string;
  scenarioType: string;
  payloadJSON: string;
  expectedStatus: string | number;
  expectedResponse: string;
  Response?: string;
  validationResult?: string;
}
