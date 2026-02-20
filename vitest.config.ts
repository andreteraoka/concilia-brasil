import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    clearMocks: true,
    passWithNoTests: true,
    include: ["src/**/*.test.ts", "app/**/*.test.ts", "middleware.test.ts"],
  },
});
