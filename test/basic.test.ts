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
		outdent`
			Hello
			Go to http://example.com/%E4%BD%A0%E5%A5%BD for more info
		`,
		outdent`
			Hello
			Go to http://example.com/你好 for more info
		`,
		outdent`
			Hello
			Go to http://example.com/?a=b?? for more info
		`,
		'// Copied from https://github.com/facebook/regenerator/blob/main/packages/runtime/runtime.js#L736='
	],
});
