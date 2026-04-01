export interface URLRecord {
	url: string;
	start: number;
	end: number;
	loc: {
		start: { line: number; column: number };
		end: { line: number; column: number };
	};
}

// Precomputed ASCII lookup table for RFC 3986 allowed URL characters.
// URL_CHAR_TABLE[charCode] === 1 means the character is allowed inside a URL.
// Using a Uint8Array gives O(1) lookup with minimal memory overhead.
// https://datatracker.ietf.org/doc/html/rfc3986#section-2
const URL_CHAR_TABLE = ((): Uint8Array => {
	const t = new Uint8Array(128);
	for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~:/?#[]@!$&'()*+,;=%") {
		t[c.charCodeAt(0)] = 1;
	}
	return t;
})();

/**
 * State machine states for URL scheme recognition and body collection.
 *
 * Full state transition diagram:
 *
 *   IDLE ─'h'→ H ─'t'→ HT ─'t'→ HTT ─'p'→ HTTP ─'s'→ HTTP_S ─':'→ COLON
 *                                              └──────────────':'──────────> COLON
 *   COLON ─'/'→ SLASH ─'/'→ URL ─(allowed chars)→ URL ─(disallowed)→ emit & reset
 *
 * Any unexpected character while matching the scheme resets the automaton to IDLE.
 * If the unexpected character is 'h', a new attempt is started immediately.
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
 * Scan text for HTTP/HTTPS URLs and return each one with its character-index
 * range and 1-based line/column location.
 *
 * Implementation uses a single-pass state machine that maintains line/column
 * counters as it advances through the text, so the overall time complexity is
 * O(n) regardless of the number of URLs found — avoiding the O(n·m) cost of
 * the naive approach of slicing and splitting the text once per discovered URL.
 *
 * @param text - The input text to scan.
 * @returns Array of URLRecord objects, one per discovered URL.
 */
export function scanUrl(text: string): URLRecord[] {
	const urls: URLRecord[] = [];
	const n = text.length;

	let state: State = State.IDLE;

	// Current character position tracking (1-based line and column).
	// At the start of each loop iteration these values reflect the position
	// of text[pos]; they are updated at the end of each iteration.
	let line = 1;
	let col = 1;

	// Start metadata for the current URL candidate (recorded when 'h' is seen).
	let urlStart = 0;
	let urlStartLine = 1;
	let urlStartCol = 1;

	/**
	 * Try to emit the URL candidate covering text[urlStart, end).
	 * Called when the character at index `end` (= `pos` at the call site) is the
	 * first character that does not belong to the URL.  At that point `line` and
	 * `col` reflect the position of that terminating character, which is exactly
	 * the exclusive-end position used for `loc.end`.
	 */
	function emitIfValid(end: number): void {
		const url = text.slice(urlStart, end);
		if (isValidUrl(url)) {
			urls.push({
				url,
				start: urlStart,
				end,
				loc: {
					start: { line: urlStartLine, column: urlStartCol },
					end: { line, column: col },
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
					// New 'h' — restart scheme detection from here.
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
				if (code >= 128 || URL_CHAR_TABLE[code] === 0) {
					// Non-URL character — finalize the current URL candidate.
					emitIfValid(pos);
					if (code === 0x68 /* 'h' */) {
						// Immediately start a new scheme attempt.
						state = State.H;
						urlStart = pos;
						urlStartLine = line;
						urlStartCol = col;
					} else {
						state = State.IDLE;
					}
				}
				// else: valid URL character — stay in URL state.
				break;
		}

		// Advance line/column tracking after processing the character.
		if (code === 0x0a /* '\n' */) {
			line++;
			col = 1;
		} else {
			col++;
		}
	}

	// Handle a URL that extends to the very end of the input.
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
