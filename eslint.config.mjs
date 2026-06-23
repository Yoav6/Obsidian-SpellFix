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
	{
		files: ["main.ts"],
		rules: {
			"obsidianmd/prefer-active-doc": "off",
		},
	},
	{
		files: ["src/commands/fix-previous-spelling.ts"],
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-return": "off",
		},
	},
	{
		files: ["src/settings-tab.ts"],
		rules: {
			"obsidianmd/ui/sentence-case": "off",
			"no-useless-escape": "off",
		},
	},
];
