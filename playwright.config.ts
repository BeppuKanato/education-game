import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', fullyParallel: false, timeout: 180000,
  expect: { timeout: 15000 }, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5173', viewport: { width: 1600, height: 900 },
    launchOptions: { args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5173', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
});
