import { defineConfig } from "vite-plus";

export default defineConfig({
	test: {
		include: ["tests/e2e/**/*.test.ts"],
		fileParallelism: false,
		maxWorkers: 1,
		testTimeout: 30_000,
	},
});
