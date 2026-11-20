import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173/',
    channel: 'chrome',
    permissions: ['microphone'],
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
  projects: [
    { name: 'desktop', testIgnore: /mobile\.spec\.ts/, use: { viewport: { width: 1440, height: 900 } } },
    // iPhone 15 Pro: 393×852pt @3x. Chrome channel with mobile emulation (WebKit isn't needed for layout checks).
    { name: 'mobile', testMatch: /mobile\.spec\.ts/, use: { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://localhost:5173/', reuseExistingServer: true, timeout: 60_000 },
});
