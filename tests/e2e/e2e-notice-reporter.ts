import type { SerializedError } from "@vitest/utils";
import type { Reporter } from "vitest/reporters";
import { formatE2ENoticeMessage, showE2ENotice } from "./show-e2e-notice";
import { restoreCommunityPluginsFromE2E } from "./plugin-isolation";

interface TestCaseLike {
	result(): { state: string };
}

interface TestModuleLike {
	children: { allTests(): Iterable<TestCaseLike> };
}

function countTestResults(testModules: ReadonlyArray<TestModuleLike>): {
	passed: number;
	failed: number;
} {
	let passed = 0;
	let failed = 0;

	for (const testModule of testModules) {
		for (const test of testModule.children.allTests()) {
			const state = test.result().state;
			if (state === "passed") {
				passed++;
			} else if (state === "failed") {
				failed++;
			}
		}
	}

	return { passed, failed };
}

export default class E2ENoticeReporter implements Reporter {
	async onTestRunEnd(
		testModules: ReadonlyArray<TestModuleLike>,
		unhandledErrors: ReadonlyArray<SerializedError>,
		reason: "passed" | "interrupted" | "failed"
	): Promise<void> {
		const { passed, failed } = countTestResults(testModules);
		const failedWithUnhandled =
			failed + (unhandledErrors.length > 0 && failed === 0 ? unhandledErrors.length : 0);
		const effectiveReason =
			reason === "interrupted"
				? "interrupted"
				: failedWithUnhandled > 0 || unhandledErrors.length > 0
					? "failed"
					: "passed";

		const message = formatE2ENoticeMessage(passed, failedWithUnhandled, effectiveReason);
		await restoreCommunityPluginsFromE2E();
		await showE2ENotice(message);
	}
}
