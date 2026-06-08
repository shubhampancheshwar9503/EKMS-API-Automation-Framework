const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const sendReportEmail = require('./email_distribution_service');
const validateEnv = require('./env_validator');

function logHeader(title) {
    console.log('\n======================================================================');
    console.log(title);
    console.log('======================================================================');
}

function openFile(filePath) {
    try {
        if (process.platform === 'win32') {
            execSync(`cmd /c start "" "${filePath}"`, { stdio: 'ignore' });
        } else if (process.platform === 'darwin') {
            execSync(`open "${filePath}"`, { stdio: 'ignore' });
        } else {
            execSync(`xdg-open "${filePath}"`, { stdio: 'ignore' });
        }
    } catch (e) {
        console.warn("⚠️ Unable to auto-open report due to system restriction");
    }
}

async function main() {
    logHeader('🚀 Phase 1: Initialization');
    console.log('[INFO] Validating environment configurations...');
    validateEnv();
    console.log('[INFO] Environment configurations validated successfully.');
    console.log('=== Starting EKMS API Test Automation Suite ===');

    // 2. Run Tests
    logHeader('🏃 Phase 2: Test Execution');
    let testFailed = false;
    try {
        execSync('npm run test', { stdio: 'inherit', shell: true });
    } catch (e) {
        testFailed = true;
    }

    if (testFailed) {
        console.log('\n[FAIL] Test execution completed with failures. Review reports for details.');
    } else {
        console.log('\n[PASS] All test cases passed successfully.');
    }

    // 3. Report Generation
    logHeader('📊 Phase 3: Report Generation');

    // Clean out empty 0-byte result files in the allure-results directory to prevent 500 NetworkError
    const allureResultsDir = path.resolve(__dirname, '../allure-results');
    if (fs.existsSync(allureResultsDir)) {
        try {
            const files = fs.readdirSync(allureResultsDir);
            const emptyFiles = [];
            for (const file of files) {
                const filePath = path.join(allureResultsDir, file);
                const stat = fs.statSync(filePath);
                if (stat.isFile() && stat.size === 0) {
                    emptyFiles.push(filePath);
                }
            }
            if (emptyFiles.length > 0) {
                console.log(`🧹 Cleaning empty (0-byte) files in allure-results (${emptyFiles.length} files found)...`);
                for (const filePath of emptyFiles) {
                    fs.unlinkSync(filePath);
                }
                console.log(`🧹 Done! Removed ${emptyFiles.length} empty result file(s).\n`);
            }
        } catch (err) {
            console.error('Failed to clean empty result files:', err.message);
        }
    }

    console.log('Generating Allure Report...');
    try {
        if (process.platform === 'win32') {
            execSync('java -cp "node_modules/allure-commandline/dist/lib/*" io.qameta.allure.CommandLine generate allure-results --clean -o allure-report', { stdio: 'inherit', shell: true });
        } else {
            execSync('npm run generate-report', { stdio: 'inherit', shell: true });
        }
        console.log('✅ Allure Report successfully generated in the "allure-report" directory!');
        console.log('👉 To launch the interactive Allure report web server, please run: npm run report');
    } catch (e) {
        console.error('Allure report generation failed.');
    }

    console.log('\nGenerating PDF Report...');
    try {
        execSync('npm run generate-pdf', { stdio: 'inherit', shell: true });
    } catch (e) {
        console.error('Failed to generate PDF report.');
    }

    // 4. Send Email Report
    logHeader('✉️ Phase 4: Email Distribution');
    await sendReportEmail();

    // 5. Open Reports
    logHeader('🖥️ Phase 5: Open Reports');
    console.log('[INFO] Awaiting file release before opening reports...');
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s delay to ensure streams are fully flushed and files released

    const pdfPath = path.resolve(__dirname, '../test-report.pdf');
    if (fs.existsSync(pdfPath)) {
        console.log(`Opening PDF: ${pdfPath}`);
        openFile(pdfPath);
    } else {
        console.warn('⚠️ PDF report file does not exist.');
    }

    const monocartPath = path.resolve(__dirname, '../monocart-report/index.html');
    if (fs.existsSync(monocartPath)) {
        console.log(`Opening Monocart Report: ${monocartPath}`);
        openFile(monocartPath);
    } else {
        console.warn('⚠️ Monocart report file does not exist.');
    }

    // 6. Final Status
    logHeader('🏁 Phase 6: Final Status');

    // Read the actual report summary for stats
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let executionDuration = 'N/A';

    const reportJsonPath = path.resolve(__dirname, '../monocart-report/index.json');
    if (fs.existsSync(reportJsonPath)) {
        try {
            const reportData = JSON.parse(fs.readFileSync(reportJsonPath, 'utf8'));
            const { summary } = reportData;
            totalTests = summary.tests?.value ?? 0;
            passedTests = summary.passed?.value ?? 0;
            failedTests = summary.failed?.value ?? 0;
            executionDuration = reportData.durationH || summary.durationH || 'N/A';
        } catch (err) {
            console.error('⚠️ Failed to read stats from report JSON:', err.message);
        }
    }

    console.log('======================================================================');
    console.log('                     📊 FINAL EXECUTION SUMMARY                      ');
    console.log('======================================================================');
    console.log(`  🔹 Total Test Cases  : ${totalTests}`);
    console.log(`  🔹 Passed            : ${passedTests}`);
    console.log(`  🔹 Failed            : ${failedTests}`);
    console.log(`  🔹 Duration          : ${executionDuration}`);
    console.log('======================================================================\n');

    const hasFailures = failedTests > 0 || testFailed;
    if (hasFailures) {
        console.log('⚠️ Test pipeline completed with failures\n');
        process.exit(1);
    } else {
        console.log('🎉 Test pipeline completed successfully\n');
        process.exit(0);
    }
}

main();
