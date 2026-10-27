import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests for the crypto exchange (`npm run test:e2e:crypto-exchange`)
 * and Aurora Play (`npm run test:e2e:aurora-play`). The fintech and
 * marketplace browser tests are a separate harness: `npm run test:e2e`.
 *
 * They run against the production build, so build first:
 *   npm run build && npm run test:e2e:crypto-exchange
 *
 * Every Didit call is answered from recorded staging responses
 * (tests/fixtures/crypto-exchange and tests/fixtures/igaming), so the suite is
 * deterministic, needs no API key and never bills the application.
 */
const PORT = Number(process.env.E2E_PORT ?? 4317);

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "phone",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/crypto-exchange`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
