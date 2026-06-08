const path = require('path');
const xlsx = require('c:/Users/ShubhamPancheshwar/Downloads/EKMS-API-Automation-Framework/API-Automation-Framework/node_modules/xlsx');

const excelPath = path.resolve('c:/Users/ShubhamPancheshwar/Downloads/EKMS-API-Automation-Framework/API-Automation-Framework/data/EKMS_API_Endpoint.xlsx');
const workbook = xlsx.readFile(excelPath);

const targetSheets = ['Modify_Group', 'Modify_Owner', 'Modify_Privileges'];

for (const sheetName of targetSheets) {
  const worksheet = workbook.Sheets[sheetName];
  const scenarios = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
  const failed = scenarios.filter(s => s.validationResult === 'FAIL');
  
  console.log(`\n==================================================`);
  console.log(`Sheet "${sheetName}": ${failed.length} failures`);
  console.log(`==================================================`);
  failed.forEach((s, idx) => {
    console.log(`[Failure ${idx + 1}] ID: ${s.Test_ID} - ${s.Description}`);
    console.log(`Payload: ${s.payloadJSON}`);
    console.log(`Expected: ${s.expectedResponse}`);
    console.log(`Actual  : ${s.Response}`);
    console.log('--------------------------------------------------');
  });
}
