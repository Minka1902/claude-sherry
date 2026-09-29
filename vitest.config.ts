import { defineConfig } from "vitest/config";
import { randomBytes } from "node:crypto";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "server-only": path.resolve(import.meta.dirname, "test/empty.ts") } },
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/global-setup.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/sherry_test",
      TOKEN_KEY: randomBytes(32).toString("base64"),
      STRIPE_SECRET_KEY: "sk_test_dummy",
    },
  },
});
