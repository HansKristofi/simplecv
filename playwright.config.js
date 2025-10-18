const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  reporter: 'html',
  use: {
    headless: true,
    browserName: 'chromium',
  },
});