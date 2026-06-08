const fs = require('fs');
const path = require('path');
const xlsx = require('c:/Users/ShubhamPancheshwar/Downloads/EKMS-API-Automation-Framework/API-Automation-Framework/node_modules/xlsx');

const excelPath = path.resolve('c:/Users/ShubhamPancheshwar/Downloads/EKMS-API-Automation-Framework/API-Automation-Framework/data/EKMS_API_Endpoint.xlsx');

try {
  const stats = fs.statSync(excelPath);
  console.log(`Excel File Size: ${stats.size} bytes`);
  console.log(`Last Modified: ${stats.mtime.toISOString()}`);
  
  const workbook = xlsx.readFile(excelPath);
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const scenarios = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
    const completed = scenarios.filter(s => s.validationResult === 'PASS' || s.validationResult === 'FAIL');
    const passed = scenarios.filter(s => s.validationResult === 'PASS');
    const failed = scenarios.filter(s => s.validationResult === 'FAIL');
    console.log(`Sheet "${sheetName}": ${completed.length} / ${scenarios.length} scenarios completed (Passed: ${passed.length}, Failed: ${failed.length}).`);
  }
} catch (e) {
  console.error('Error:', e.message);
}
