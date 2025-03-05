export interface URLRecord {
	url: string;
	start: number;
	end: number;
	loc: {
		start: { line: number; column: number };
		end: { line: number; column: number };
	};
}

/**
 * 从文本中提取 HTTP/HTTPS 链接，并记录其位置（行号、列号、起始索引、结束索引）。
 * @param text - 输入的文本内容。
 * @returns - 提取的 URL 列表，包含其起始/结束索引及行列信息。
 */
export function scanUrl(text: string): URLRecord[] {
	const urls: URLRecord[] = [];
	const urlStartRegex = /https?:\/\//g; // 匹配 URL 的起始部分
	const allowedChars = new Set(
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~:/?#[]@!$&'()*+,;=%"
	);

	let match: RegExpExecArray | null;
	let line = 1;
	let column = 1;

	while ((match = urlStartRegex.exec(text)) !== null) {
		const start = match.index;
		let end = start + match[0].length;

		// 使用状态机解析 URL 的剩余部分
		while (end < text.length && allowedChars.has(text[end])) {
			end++;
		}

		// 计算 URL 所在的行号和列号
		const textBeforeUrl = text.slice(0, start);
		const linesBeforeUrl = textBeforeUrl.split("\n");
		const startLine = linesBeforeUrl.length;
		const startColumn = linesBeforeUrl[linesBeforeUrl.length - 1].length + 1;

		const textUpToEnd = text.slice(0, end);
		const linesUpToEnd = textUpToEnd.split("\n");
		const endLine = linesUpToEnd.length;
		const endColumn = linesUpToEnd[linesUpToEnd.length - 1].length + 1;

		// 记录 URL
		const url = text.slice(start, end);
		if (isValidUrl(url)) {
			urls.push({
				url,
				start,
				end,
				loc: {
					start: { line: startLine, column: startColumn },
					end: { line: endLine, column: endColumn },
				},
			});
		}

		// 更新正则表达式的 lastIndex，避免重复匹配
		urlStartRegex.lastIndex = end;
	}

	return urls;
}

/**
 * 检查 URL 是否有效。
 * @param url - 要检查的 URL。
 * @returns URL 是否有效（必须以 http:// 或 https:// 开头）。
 */
function isValidUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch (e) {
		return false;
	}
}
