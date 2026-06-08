import * as path from 'path';
import * as xlsx from 'xlsx';
import * as fs from 'fs';

/**
 * Clears the Response and validationResult columns in all sheets of the EKMS_API_Endpoint.xlsx Excel file.
 * This ensures a fresh state before running the test suite.
 */
export function clearResponseAndValidationResult(): void {
  const excelPath = path.resolve(__dirname, '../data/EKMS_API_Endpoint.xlsx');
  
  if (!fs.existsSync(excelPath)) {
    console.warn(`Excel file not found at ${excelPath} – nothing to clear.`);
    return;
  }

  const wb = xlsx.readFile(excelPath);

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws['!ref']) continue;

    // Decode range
    const range = xlsx.utils.decode_range(ws['!ref']);
    let responseColLetter: string | null = null;
    let validationColLetter: string | null = null;

    // Check headers (row 0)
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddr = xlsx.utils.encode_cell({ c: C, r: range.s.r });
      const cell = ws[cellAddr];
      if (!cell) continue;

      const header = String(cell.v || '').trim().toLowerCase();
      if (header === 'response') {
        responseColLetter = xlsx.utils.encode_col(C);
      }
      if (header === 'validationresult') {
        validationColLetter = xlsx.utils.encode_col(C);
      }
    }

    // Clear cells if the columns exist
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      if (responseColLetter) {
        const respCell = responseColLetter + (R + 1);
        ws[respCell] = { t: 's', v: '' };
      }
      if (validationColLetter) {
        const valCell = validationColLetter + (R + 1);
        ws[valCell] = { t: 's', v: '' };
      }
    }
  }

  xlsx.writeFile(wb, excelPath);
  console.log('✅ Cleared Response and validationResult columns in all sheets of EKMS_API_Endpoint.xlsx');
}

// If run directly via node/ts-node
if (require.main === module) {
  clearResponseAndValidationResult();
}
