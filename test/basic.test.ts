import { outdent } from "outdent";
import { defineTest } from "./tester";

defineTest("scanUrl", {
	valid: ["hello world"],
	invalid: [
		"See https://example.com/issue/1234 for details.",
		"https://example.com/issue/1234",
		outdent`
			see https://example.com
			new line
		`,
		"see https://example.com;new line",
		"see https://example.com{new line",
		"see https://example.com and https://example2.com",
		"see https://example.com?foo=bar and https://example2.com",
	],
});
