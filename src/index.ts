export interface URLRecord {
	url: string;
	start: number;
	end: number;
	loc: {
		start: { line: number; column: number };
		end: { line: number; column: number };
	};
}

// 预先计算的 ASCII 字符查找表，用于判断字符是否为 RFC 3986 允许的 URL 字符。
// URL_CHAR_TABLE[charCode] === 1 表示该字符可出现在 URL 中。
// 使用 Uint8Array 实现 O(1) 查找，内存开销极小。
// https://datatracker.ietf.org/doc/html/rfc3986#section-2
const URL_CHAR_TABLE = ((): Uint8Array => {
	const t = new Uint8Array(128);
	for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~:/?#[]@!$&'()*+,;=%") {
		t[c.charCodeAt(0)] = 1;
	}
	return t;
})();

/**
 * URL 协议识别与主体收集的状态机状态枚举。
 *
 * 完整状态转换图：
 *
 *   IDLE ─'h'→ H ─'t'→ HT ─'t'→ HTT ─'p'→ HTTP ─'s'→ HTTP_S ─':'→ COLON
 *                                              └──────────────':'──────────> COLON
 *   COLON ─'/'→ SLASH ─'/'→ URL ─(合法字符)→ URL ─(非法字符)→ 输出并重置
 *
 * 在识别协议头的过程中，遇到意外字符会将自动机重置为 IDLE 状态。
 * 若该意外字符恰好是 'h'，则立即从此处重新开始一次新的匹配尝试。
 */
enum State {
	IDLE = 0,
	H = 1,
	HT = 2,
	HTT = 3,
	HTTP = 4,
	HTTP_S = 5,
	COLON = 6,
	SLASH = 7,
	URL = 8,
}

/**
 * 从文本中扫描所有 HTTP/HTTPS URL，并返回每个 URL 的字符索引范围
 * 及其以 1 为起始值的行列位置信息。
 *
 * 实现采用单遍扫描状态机，在遍历文本的同时同步维护行列计数器，
 * 因此整体时间复杂度为 O(n)，与找到的 URL 数量无关——
 * 避免了朴素方案中每发现一个 URL 就进行一次 slice/split 的 O(n·m) 开销。
 *
 * @param text - 待扫描的输入文本。
 * @returns 每个发现的 URL 对应一个 URLRecord 对象组成的数组。
 */
export function scanUrl(text: string): URLRecord[] {
	const urls: URLRecord[] = [];
	const n = text.length;

	let state: State = State.IDLE;

	// 当前字符的位置追踪（行号和列号均以 1 为起始值）。
	// 每次循环迭代开始时，这两个变量反映 text[pos] 的位置；
	// 在每次迭代结束时更新。
	let line = 1;
	let col = 1;

	// 当前 URL 候选的起始元数据（在首次识别到 'h' 时记录）。
	let urlStart = 0;
	let urlStartLine = 1;
	let urlStartCol = 1;

	/**
	 * 尝试将 text[urlStart, end) 范围内的 URL 候选输出到结果列表。
	 * 在调用处，索引 `end`（即调用时的 `pos`）指向第一个不属于 URL 的字符，
	 * 此时 `line` 和 `col` 反映的正是该终止字符的位置，
	 * 恰好用作 `loc.end` 的开区间结束位置。
	 */
	function emitIfValid(end: number): void {
		const raw = text.slice(urlStart, end);
		const trimmedLen = trimUrlEnd(raw);
		const url = raw.slice(0, trimmedLen);
		const trimmedEnd = urlStart + trimmedLen;
		// 已裁剪的字符数（均为 ASCII，不含换行），列号相应回退。
		const trimmedCols = raw.length - trimmedLen;
		if (isValidUrl(url)) {
			urls.push({
				url,
				start: urlStart,
				end: trimmedEnd,
				loc: {
					start: { line: urlStartLine, column: urlStartCol },
					end: { line, column: col - trimmedCols },
				},
			});
		}
	}

	for (let pos = 0; pos < n; pos++) {
		const code = text.charCodeAt(pos);

		switch (state) {
			case State.IDLE:
				if (code === 0x68 /* 'h' */) {
					state = State.H;
					urlStart = pos;
					urlStartLine = line;
					urlStartCol = col;
				}
				break;

			case State.H:
				if (code === 0x74 /* 't' */) {
					state = State.HT;
				} else if (code === 0x68 /* 'h' */) {
					// 遇到新的 'h'，从当前位置重新开始协议识别。
					urlStart = pos;
					urlStartLine = line;
					urlStartCol = col;
				} else {
					state = State.IDLE;
				}
				break;

			case State.HT:
				if (code === 0x74 /* 't' */) {
					state = State.HTT;
				} else if (code === 0x68 /* 'h' */) {
					state = State.H;
					urlStart = pos;
					urlStartLine = line;
					urlStartCol = col;
				} else {
					state = State.IDLE;
				}
				break;

			case State.HTT:
				if (code === 0x70 /* 'p' */) {
					state = State.HTTP;
				} else if (code === 0x68 /* 'h' */) {
					state = State.H;
					urlStart = pos;
					urlStartLine = line;
					urlStartCol = col;
				} else {
					state = State.IDLE;
				}
				break;

			case State.HTTP:
				if (code === 0x73 /* 's' */) {
					state = State.HTTP_S;
				} else if (code === 0x3a /* ':' */) {
					state = State.COLON;
				} else if (code === 0x68 /* 'h' */) {
					state = State.H;
					urlStart = pos;
					urlStartLine = line;
					urlStartCol = col;
				} else {
					state = State.IDLE;
				}
				break;

			case State.HTTP_S:
				if (code === 0x3a /* ':' */) {
					state = State.COLON;
				} else if (code === 0x68 /* 'h' */) {
					state = State.H;
					urlStart = pos;
					urlStartLine = line;
					urlStartCol = col;
				} else {
					state = State.IDLE;
				}
				break;

			case State.COLON:
				if (code === 0x2f /* '/' */) {
					state = State.SLASH;
				} else if (code === 0x68 /* 'h' */) {
					state = State.H;
					urlStart = pos;
					urlStartLine = line;
					urlStartCol = col;
				} else {
					state = State.IDLE;
				}
				break;

			case State.SLASH:
				if (code === 0x2f /* '/' */) {
					state = State.URL;
				} else if (code === 0x68 /* 'h' */) {
					state = State.H;
					urlStart = pos;
					urlStartLine = line;
					urlStartCol = col;
				} else {
					state = State.IDLE;
				}
				break;

			case State.URL:
				if (code < 128 && URL_CHAR_TABLE[code] === 0) {
					// 遇到非 URL 字符——结束当前 URL 候选。
					emitIfValid(pos);
					if (code === 0x68 /* 'h' */) {
						// 立即从此处开始新一轮协议匹配。
						state = State.H;
						urlStart = pos;
						urlStartLine = line;
						urlStartCol = col;
					} else {
						state = State.IDLE;
					}
				}
				// 否则：合法 URL 字符，保持 URL 状态继续扫描。
				break;
		}

		// 处理完当前字符后，更新行列追踪计数器。
		if (code === 0x0a /* '\n' */) {
			line++;
			col = 1;
		} else {
			col++;
		}
	}

	// 处理延伸至输入末尾的 URL。
	if (state === State.URL) {
		emitIfValid(n);
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
	} catch {
		return false;
	}
}

/**
 * 去除 URL 尾部常见的噪音标点符号，返回裁剪后的字符串长度。
 * 例如：句号、逗号、感叹号、问号、右括号、右方括号。
 *
 * @param url - 待裁剪的 URL 候选字符串。
 * @returns 裁剪后的有效字符数（从字符串开头计算）。
 */
function trimUrlEnd(url: string): number {
	let end = url.length;

	while (end > 0) {
		const c = url.charCodeAt(end - 1);

		if (
			c === 0x2e || // .
			c === 0x2c || // ,
			c === 0x21 || // !
			c === 0x3f || // ?
			c === 0x29 || // )
			c === 0x5d    // ]
		) {
			end--;
		} else {
			break;
		}
	}

	return end;
}
