import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  timeout: 120_000,
  workers: 1,
  reporter: [["line"]],
  use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:4318" },
  webServer: { command: "npm run start -- -p 4318", url: "http://localhost:4318/igaming", reuseExistingServer: true, timeout: 120_000, cwd: "/tmp/botinc-run-6d9fb631-d62d-4628-847e-92e2a4011597/didit-protocol__didit-demo-center" },
});
