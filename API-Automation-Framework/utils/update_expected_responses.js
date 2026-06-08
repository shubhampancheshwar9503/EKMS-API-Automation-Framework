const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

function updateExpectedResponses() {
    console.log('=== Updating Expected Responses in EKMS_API_Endpoint.xlsx ===');
    const excelPath = path.resolve(__dirname, '../data/EKMS_API_Endpoint.xlsx');

    if (!fs.existsSync(excelPath)) {
        console.error(`❌ Excel file not found at ${excelPath}`);
        return;
    }

    try {
        const wb = xlsx.readFile(excelPath);
        let updatedCount = 0;

        for (const sheetName of wb.SheetNames) {
            if (sheetName === 'Token') continue; // Skip token sheets

            const ws = wb.Sheets[sheetName];
            if (!ws || !ws['!ref']) continue;

            const range = xlsx.utils.decode_range(ws['!ref']);
            let responseColIdx = -1;
            let expectedResponseColIdx = -1;

            // Find column indices
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddr = xlsx.utils.encode_cell({ r: 0, c: col });
                const cell = ws[cellAddr];
                if (!cell || !cell.v) continue;
                const headerText = String(cell.v).trim().toLowerCase();

                if (headerText === 'response') {
                    responseColIdx = col;
                } else if (headerText === 'expectedresponse') {
                    expectedResponseColIdx = col;
                }
            }

            if (responseColIdx === -1) {
                console.log(`ℹ️ "Response" column not found in sheet "${sheetName}". Skipping.`);
                continue;
            }

            if (expectedResponseColIdx === -1) {
                console.log(`ℹ️ "expectedResponse" column not found in sheet "${sheetName}". Skipping.`);
                continue;
            }

            const responseLetter = xlsx.utils.encode_col(responseColIdx);
            const expectedResponseLetter = xlsx.utils.encode_col(expectedResponseColIdx);

            // Copy values
            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                const respCellAddr = responseLetter + (R + 1);
                const expectCellAddr = expectedResponseLetter + (R + 1);

                const respCell = ws[respCellAddr];
                if (respCell && respCell.v !== undefined && String(respCell.v).trim() !== '') {
                    ws[expectCellAddr] = { t: 's', v: String(respCell.v) };
                    updatedCount++;
                }
            }
        }

        xlsx.writeFile(wb, excelPath);
        console.log(`\n✅ Successfully copied ${updatedCount} actual responses into the expectedResponse columns!`);
        console.log('💾 The expected baselines have been updated successfully.');

    } catch (error) {
        if (error.code === 'EBUSY') {
            console.error('\n❌ Error: EKMS_API_Endpoint.xlsx is locked. Please close Microsoft Excel and run again.');
        } else {
            console.error('❌ Error processing EKMS_API_Endpoint.xlsx:', error.message || error);
        }
    }
}

updateExpectedResponses();
