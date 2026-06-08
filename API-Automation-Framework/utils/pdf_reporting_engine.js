const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

/**
 * Strips ANSI escape codes (color codes) from a string.
 */
function stripAnsi(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

/**
 * Escapes characters for safe inclusion in HTML.
 */
function escapeHtml(text) {
  if (text === undefined || text === null) return '';
  return text.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Recursively extracts all test cases from a report suite tree node.
 */
function findCases(node, list = []) {
  if (!node) return list;
  if (Array.isArray(node)) {
    for (const item of node) {
      findCases(item, list);
    }
  } else if (typeof node === 'object') {
    if (node.type === 'case') {
      list.push(node);
    }
    for (const key of Object.keys(node)) {
      if (typeof node[key] === 'object') {
        findCases(node[key], list);
      }
    }
  }
  return list;
}

/**
 * Formats duration in milliseconds into a readable string (e.g. "1.2s" or "450ms").
 */
function formatDuration(ms) {
  if (ms === undefined || ms === null) return '0ms';
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms}ms`;
}

async function generatePdf() {
  console.log('Generating Dynamic Multi-Page Test Execution PDF Report...');

  const monocartJsonPath = path.resolve(__dirname, '../monocart-report/index.json');
  if (!fs.existsSync(monocartJsonPath)) {
    console.error(`❌ Report data not found at: ${monocartJsonPath}. Run tests first.`);
    process.exit(1);
  }

  // 1. Read and parse the Monocart report JSON
  let reportData;
  try {
    reportData = JSON.parse(fs.readFileSync(monocartJsonPath, 'utf8'));
  } catch (err) {
    console.error('❌ Failed to parse Monocart index.json report data:', err);
    process.exit(1);
  }

  const { summary } = reportData;
  const totalTests = summary.tests?.value ?? 0;
  const passedTests = summary.passed?.value ?? 0;
  const failedTests = summary.failed?.value ?? 0;
  const skippedTests = summary.skipped?.value ?? 0;
  const executionDuration = reportData.durationH || summary.durationH || 'N/A';
  const executionDate = reportData.dateH || new Date().toLocaleString();
  const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0';

  // 2. Extract and parse all test cases
  const allCasesRaw = findCases(reportData);
  const testCases = allCasesRaw.map(c => {
    let payload = 'N/A';
    let endpoint = 'N/A';
    let method = 'POST';

    // Parse attachments to get detailed API logs
    if (c.attachments) {
      const summaryAttach = c.attachments.find(a => a.name === 'Test Execution Summary');
      if (summaryAttach && summaryAttach.content) {
        // HTTP Method
        const methodMatch = summaryAttach.content.match(/HTTP Method:\s*([^\n\r]+)/i);
        if (methodMatch) method = methodMatch[1].trim();

        // Endpoint
        const endpointMatch = summaryAttach.content.match(/Endpoint URL:\s*([^\n\r]+)/i) ||
          summaryAttach.content.match(/Endpoint:\s*([^\n\r]+)/i);
        if (endpointMatch) endpoint = endpointMatch[1].trim();

        // Payload
        const payloadMatch = summaryAttach.content.match(/Request Payload:\s*([\s\S]*?)\s*(?:Expected Status:|--------------------------------------------------)/i);
        if (payloadMatch) payload = payloadMatch[1].trim();
      }
    }

    // Try to extract sheet/suite name from title
    let sheetName = 'General';
    const sheetMatch = c.title.match(/^\[(.*?)\]/);
    if (sheetMatch) {
      sheetName = sheetMatch[1].trim();
    }

    // Extract clean test ID and description
    let cleanTitle = c.title;
    let testId = '';
    let description = '';

    const idDescMatch = c.title.match(/^\[.*?\]\s*([A-Za-z0-9_-]+)\s*-\s*(.*)$/);
    if (idDescMatch) {
      testId = idDescMatch[1].trim();
      description = idDescMatch[2].trim();
      cleanTitle = `${testId} - ${description}`;
    }

    // Process errors
    let errorMsg = '';
    if (c.errors && c.errors.length > 0) {
      errorMsg = stripAnsi(c.errors[0]);
    }

    return {
      title: cleanTitle,
      testId,
      description,
      sheetName,
      endpoint,
      method,
      payload,
      status: c.status || 'skipped',
      duration: formatDuration(c.duration),
      errorMsg
    };
  });

  // 3. Generate beautiful, print-ready HTML template
  let tableRowsHtml = '';
  testCases.forEach((tc) => {
    const statusClass = tc.status === 'passed' ? 'badge-pass' : (tc.status === 'failed' ? 'badge-fail' : 'badge-skip');
    const displayStatus = tc.status.toUpperCase();
    const formattedPayload = tc.payload !== 'N/A' ? escapeHtml(tc.payload) : 'N/A';

    let errorHtml = '';
    if (tc.errorMsg) {
      errorHtml = `<div class="error-box"><strong>Error:</strong><br/>${escapeHtml(tc.errorMsg)}</div>`;
    }

    tableRowsHtml += `
      <tr>
        <td>
          <div class="test-suite-name">${escapeHtml(tc.sheetName)}</div>
          <div class="test-title">${escapeHtml(tc.testId || tc.title)}</div>
          <div class="test-desc">${escapeHtml(tc.description)}</div>
          <div class="test-desc" style="font-size: 9px; color: #94a3b8; margin-top:4px;">Duration: ${tc.duration}</div>
        </td>
        <td class="endpoint-cell">
          <span class="method-badge">${escapeHtml(tc.method)}</span>${escapeHtml(tc.endpoint)}
        </td>
        <td>
          <pre>${formattedPayload}</pre>
        </td>
        <td>
          <span class="badge ${statusClass}">${displayStatus}</span>
        </td>
        <td>
          ${errorHtml || '<span style="color:#64748b; font-size:10px;">Passed successfully</span>'}
        </td>
      </tr>
    `;
  });

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EKMS API Automation Test Execution Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      color: #1e293b;
      background-color: #f8fafc;
      margin: 0;
      padding: 30px;
      font-size: 11px;
      line-height: 1.5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .header p {
      margin: 4px 0 0 0;
      color: #94a3b8;
      font-size: 12px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 16px;
    }
    .meta-item {
      background: rgba(255, 255, 255, 0.04);
      padding: 10px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .meta-label {
      font-size: 9px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .meta-val {
      font-size: 12px;
      font-weight: 600;
      margin-top: 2px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: white;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
    }
    .stat-title {
      font-size: 10px;
      font-weight: 500;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      margin-top: 4px;
      color: #0f172a;
    }
    .stat-card.passed .stat-value { color: #10b981; }
    .stat-card.failed .stat-value { color: #ef4444; }
    .stat-card.skipped .stat-value { color: #f59e0b; }
    
    .progress-container {
      grid-column: span 4;
      background: white;
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .progress-bar-bg {
      flex: 1;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-bar-fg {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
      border-radius: 4px;
    }
    .progress-label {
      font-weight: 700;
      font-size: 12px;
      color: #10b981;
    }
    
    .results-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      margin-bottom: 20px;
    }
    .results-table th {
      background-color: #f1f5f9;
      color: #475569;
      font-weight: 600;
      text-align: left;
      padding: 10px 12px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 2px solid #cbd5e1;
    }
    .results-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .results-table tr:last-child td {
      border-bottom: none;
    }
    .results-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    
    .badge {
      display: inline-block;
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-align: center;
    }
    .badge-pass { background-color: #d1fae5; color: #065f46; }
    .badge-fail { background-color: #fee2e2; color: #991b1b; }
    .badge-skip { background-color: #fef3c7; color: #92400e; }
    
    .method-badge {
      display: inline-block;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 8px;
      font-weight: 700;
      background-color: #e2e8f0;
      color: #475569;
      margin-right: 4px;
    }
    
    .test-suite-name {
      font-size: 9px;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    .test-title {
      font-weight: 600;
      font-size: 11px;
      color: #0f172a;
    }
    .test-desc {
      color: #475569;
      font-size: 10px;
      margin-top: 2px;
    }
    
    .endpoint-cell {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      color: #0f172a;
      word-break: break-all;
      width: 18%;
    }
    
    pre {
      margin: 0;
      padding: 6px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 9px;
      white-space: pre-wrap;
      word-break: break-all;
      max-width: 250px;
    }
    
    .error-box {
      margin-top: 4px;
      padding: 6px;
      background-color: #fff5f5;
      border: 1px solid #fed7d7;
      border-radius: 4px;
      color: #c53030;
      font-family: 'Courier New', Courier, monospace;
      font-size: 9px;
      white-space: pre-wrap;
      word-break: break-all;
    }
    
    @media print {
      body {
        background-color: white;
        padding: 0;
      }
      .container {
        max-width: 100%;
      }
      .results-table {
        box-shadow: none;
      }
      tr {
        page-break-inside: avoid !important;
      }
      thead {
        display: table-header-group !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header Banner -->
    <div class="header">
      <h1>EKMS API Automation Test Execution Report</h1>
      <p>Automated regression suite run metadata and validation outcomes</p>
      
      <div class="meta-grid">
        <div class="meta-item">
          <div class="meta-label">Execution Date</div>
          <div class="meta-val">${escapeHtml(executionDate)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Duration</div>
          <div class="meta-val">${escapeHtml(executionDuration)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Environment URL</div>
          <div class="meta-val">${escapeHtml(process.env.BASE_URL || 'http://192.168.1.147:15083')}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Pass Rate</div>
          <div class="meta-val">${passRate}%</div>
        </div>
      </div>
    </div>
    
    <!-- Metrics Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-title">Total Scenarios</div>
        <div class="stat-value">${totalTests}</div>
      </div>
      <div class="stat-card passed">
        <div class="stat-title">Passed</div>
        <div class="stat-value">${passedTests}</div>
      </div>
      <div class="stat-card failed">
        <div class="stat-title">Failed</div>
        <div class="stat-value">${failedTests}</div>
      </div>
      <div class="stat-card skipped">
        <div class="stat-title">Skipped</div>
        <div class="stat-value">${skippedTests}</div>
      </div>
      
      <div class="progress-container">
        <div class="progress-bar-bg">
          <div class="progress-bar-fg" style="width: ${passRate}%"></div>
        </div>
        <div class="progress-label">${passRate}% PASS</div>
      </div>
    </div>
    
    <!-- Detailed Results Table -->
    <table class="results-table">
      <thead>
        <tr>
          <th style="width: 25%;">Test Case Description</th>
          <th style="width: 20%;">Endpoint URL</th>
          <th style="width: 25%;">Request Payload</th>
          <th style="width: 10%;">Status</th>
          <th style="width: 20%;">Outcome Details / Error</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
  </div>
</body>
</html>
  `;

  // 4. Save HTML to a temporary template file
  const tempHtmlPath = path.resolve(__dirname, '../monocart-report/temp-report.html');
  try {
    fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');
  } catch (err) {
    console.error('❌ Failed to write temporary HTML template:', err);
    process.exit(1);
  }

  // 5. Launch Playwright Chromium to print to PDF
  const finalPdfPath = path.resolve(__dirname, '../test-report.pdf');
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();

    // Load local HTML directly
    const absoluteHtmlUri = 'file:///' + tempHtmlPath.replace(/\\/g, '/');
    console.log(`Loading template: ${absoluteHtmlUri}`);
    await page.goto(absoluteHtmlUri, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait 2 seconds for CSS to resolve completely
    await page.waitForTimeout(2000);

    // Print A4 multi-page PDF with headers/footers
    await page.pdf({
      path: finalPdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-family: 'Inter', sans-serif; font-size:8px; color: #94a3b8; width: 100%; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin: 0 12mm; display: flex; justify-content: space-between;">
          <span>EKMS API Test Execution Report</span>
          <span>Date: ${escapeHtml(executionDate.split(',')[0])}</span>
        </div>`,
      footerTemplate: `
        <div style="font-family: 'Inter', sans-serif; font-size:8px; color: #94a3b8; width: 100%; border-top: 1px solid #e2e8f0; padding-top: 5px; margin: 0 12mm; display: flex; justify-content: space-between;">
          <span>Confidential — Internal Use Only</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>`
    });

    console.log(`✅ Success: Dynamic multi-page PDF report generated at: ${finalPdfPath}`);
  } catch (error) {
    const isLockedError = error.code === 'EACCES' ||
      error.code === 'EBUSY' ||
      error.message.includes('EACCES') ||
      error.message.includes('EBUSY') ||
      error.message.includes('permission denied') ||
      error.message.includes('busy or locked');

    if (isLockedError) {
      console.warn('\n⚠️  [PDF Reporting Warning]: Could not overwrite test-report.pdf because the file is open and locked.');
      console.warn('👉 Please close test-report.pdf in Acrobat Reader or other viewers, then re-run to update the report file.\n');
    } else {
      console.error('❌ Error during PDF report printing:', error.message || error);
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    // Clean up temporary HTML file
    if (fs.existsSync(tempHtmlPath)) {
      try {
        fs.unlinkSync(tempHtmlPath);
      } catch (err) {
        // ignore cleanup error
      }
    }
  }
}

// Automatically invoke if run directly
if (require.main === module) {
  generatePdf();
}

module.exports = generatePdf;
