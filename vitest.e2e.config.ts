import { defineConfig } from "vite-plus";

export default defineConfig({
	test: {
		include: ["tests/e2e/**/*.test.ts"],
		fileParallelism: false,
		maxWorkers: 1,
		testTimeout: 30_000,
		globalSetup: ["./tests/e2e/global-setup.ts"],
		reporters: ["default", "./tests/e2e/e2e-notice-reporter.ts"],
	},
});
