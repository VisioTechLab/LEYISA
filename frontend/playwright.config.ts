import { defineConfig } from '@playwright/test';

const baseURL = process.env.LEYISA_E2E_ORIGIN ?? 'http://127.0.0.1:5176';
if (!['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname)) throw new Error('La recette exige une application locale et des identités fictives.');

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  outputDir: './test-results',
  use: {
    baseURL, actionTimeout: 15_000, navigationTimeout: 30_000, viewport: { width: 1440, height: 1080 },
    launchOptions: { ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : process.env.CI ? {} : { executablePath: '/opt/google/chrome/chrome' }), args: ['--no-sandbox'] },
    screenshot: 'only-on-failure',
    // Les traces/vidéos peuvent contenir les champs de connexion : ne pas en produire.
    trace: 'off', video: 'off',
  },
});
