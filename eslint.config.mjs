import tsParser from "@typescript-eslint/parser";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
	{
		ignores: [
			"node_modules/**",
			"main.js",
			"*.mjs",
			"package.json",
			"package-lock.json",
			"versions.json",
			"tsconfig.json",
			"tests/e2e/**",
			"__obsidian_e2e__/**",
			".obsidian-e2e-artifacts/**",
		],
	},
	...tseslint.configs.recommendedTypeChecked.map((config) => ({
		...config,
		files: ["**/*.ts"],
	})),
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: "./tsconfig.json",
				sourceType: "module",
			},
		},
	},
];
