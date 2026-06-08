import { defineConfig, devices } from '@playwright/test';

import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests/dynamic',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  reporter: [
    // HTML report for quick local debugging (optional)
    ['html', { open: 'never' }],
    // Monocart reporter - writes HTML and JSON results to ./monocart-report
    ['monocart-reporter', {
      name: 'EKMS API Test Execution Report',
      outputFile: './monocart-report/index.html',
      clean: false
    }],
    // Allure reporter – writes JSON results to ./allure-results
    ['allure-playwright', {
      outputFolder: 'allure-results',
      environmentInfo: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        API_BASE_URL: process.env.BASE_URL,
      },
    }],

  ],
  use: {
    baseURL: process.env.BASE_URL,
    extraHTTPHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    trace: 'on-first-retry',
  },
  // Parallelism – Rate-limiting and Excel write-lock friendly (sequential execution)
  workers: 1,
  // Optional: define projects for different browsers if needed
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});

