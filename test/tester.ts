import { describe, test } from "node:test";
import assert from "node:assert";
import { scanUrl } from "../src";
import { outdent } from "outdent";
import { codeFrameColumns } from "@babel/code-frame";

interface TestOptions {
	readonly valid: string[];
	readonly invalid: string[];
}

export function defineTest(name: string, options: TestOptions) {
	describe(name, () => {
		// valid
		for (const input of options.valid) {
			const title = maxLength(removeNewlines(input), 50);

			test(`#valid ${title}`, (t) => {
				const results = scanUrl(input);

				assert.deepStrictEqual(results, [], "should not match any URLs");
			});
		}

		// invalid
		for (const input of options.invalid) {
			const title = maxLength(removeNewlines(input), 50);

			test(`#invalid ${title}`, (t) => {
				const results = scanUrl(input);

				for (const result of results) {
					assert.deepEqual(result.url, input.slice(result.start, result.end));
				}

				const indent = 2;

				const inputString = indentString(wrapCodeFrame(input), indent);

				const output = results
					.map((result, i) => {
						let code = `> (${i + 1})\n\n`;

						code += indentString(
							underlineCodeFrame(input, result.loc.start, result.loc.end),
							indent
						);

						return indentString(code, indent);
					})
					.join("\n\n");

				const snapshot = outdent`
					## Input
					${inputString}

					## Output
					${output}
				`;

				t.assert.snapshot(snapshot, {
					serializers: [(value) => value],
				});
			});
		}
	});
}

function wrapCodeFrame(code: string): string {
	const location = { start: { line: 0, column: 0 } };

	return codeFrameColumns(code, location, { linesAbove: 3, linesBelow: 3 });
}

function underlineCodeFrame(
	code: string,
	start: { line: number; column: number },
	end: { line: number; column: number }
): string {
	const location = { start, end };

	return codeFrameColumns(code, location, { linesAbove: 3, linesBelow: 3 });
}

function removeNewlines(str: string): string {
	return str.replace(/[\n\r]+/g, String.raw`\n`); // 将所有换行符删除
}

function maxLength(str: string, length: number): string {
	if (str.length <= length) {
		return str;
	}

	return str.slice(0, length) + "...";
}

function indentString(str: string, indent: number): string {
	return str
		.split("\n")
		.map((v) => (v ? " ".repeat(indent) + v : ""))
		.join("\n");
}
