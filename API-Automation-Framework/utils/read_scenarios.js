const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelPath = path.resolve(__dirname, '../data/EKMS_API_Endpoint.xlsx');
if (!fs.existsSync(excelPath)) {
  console.log('Excel file not found at:', excelPath);
  process.exit(0);
}

const wb = xlsx.readFile(excelPath);
console.log('Sheet Names:', wb.SheetNames);

wb.SheetNames.forEach(sheetName => {
  if (sheetName === 'Token') return;
  const ws = wb.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(ws);
  console.log(`Sheet "${sheetName}": Total Rows = ${data.length}`);
  if (data.length > 0) {
    console.log(`  Sample Row 1:`, JSON.stringify(data[0], null, 2));
  }
});
