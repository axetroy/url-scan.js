import { outdent } from "outdent";
import { defineTest } from "./tester";

defineTest("scanUrl", {
	valid: [
		// No URL patterns at all
		"hello world",
		// Empty string
		"",
		// Scheme only — no host, fails URL validation
		"http://",
		"https://",
		// Space inside scheme breaks detection before host is reached
		"http:// example.com",
		// Unsupported schemes are not detected
		"ftp://example.com",
		"ssh://user@example.com",
		// Uppercase scheme — state machine only matches lowercase 'h'
		"HTTP://example.com",
		"HTTPS://example.com",
		// Missing scheme
		"see link at www.example.com for more",
		// Broken scheme sequences
		"htt p://example.com",
		"h ttp://example.com",
		// user@host email — no http/https scheme
		"contact user@example.com for info",
	],
	invalid: [
		// ── Basic extractions ────────────────────────────────────────────────
		"See https://example.com/issue/1234 for details.",
		"https://example.com/issue/1234",
		// ── HTTP (non-HTTPS) ─────────────────────────────────────────────────
		"API docs at http://example.com/docs",
		// ── URL terminators ───────────────────────────────────────────────────
		outdent`
			see https://example.com
			new line
		`,
		"see https://example.com;new line",
		"see https://example.com{new line",
		// ── Multiple URLs ─────────────────────────────────────────────────────
		"see https://example.com and https://example2.com",
		"see https://example.com?foo=bar and https://example2.com",
		// ── URL with port ─────────────────────────────────────────────────────
		"API endpoint: https://api.example.com:8080/v1/users",
		"Dev server at http://localhost:3000/dashboard",
		// ── URL with path segments ────────────────────────────────────────────
		"https://example.com/a/b/c/d.html",
		// ── URL with query string ─────────────────────────────────────────────
		"https://example.com/search?q=hello+world&lang=en&page=2",
		// ── URL with fragment ─────────────────────────────────────────────────
		"Read https://example.com/docs#installation for setup.",
		// ── URL with both query and fragment ──────────────────────────────────
		"https://example.com/path?key=value#section-1",
		// ── Percent-encoded characters ────────────────────────────────────────
		outdent`
			Hello
			Go to http://example.com/%E4%BD%A0%E5%A5%BD for more info
		`,
		"https://example.com/search?q=%E4%B8%AD%E6%96%87",
		// ── Non-ASCII characters terminate scanning ───────────────────────────
		outdent`
			Hello
			Go to http://example.com/你好 for more info
		`,
		// ── Double question marks in query ────────────────────────────────────
		outdent`
			Hello
			Go to http://example.com/?a=b?? for more info
		`,
		// ── URL with user-info (auth) ─────────────────────────────────────────
		"Dashboard: http://admin:secret@example.com/panel",
		// ── IP address URLs ───────────────────────────────────────────────────
		"Internal API: http://192.168.1.100:8080/api/v2",
		// ── Subdomain ─────────────────────────────────────────────────────────
		"https://api.v2.example.com/endpoint",
		// ── Trailing slash ────────────────────────────────────────────────────
		"Homepage is https://example.com/ — bookmark it.",
		// ── URL at start of text ──────────────────────────────────────────────
		"https://example.com is the site.",
		// ── URL at end of text ────────────────────────────────────────────────
		"Visit https://example.com",
		// ── URL surrounded by angle brackets ──────────────────────────────────
		"Contact at <https://example.com/contact>",
		// ── URL in markdown link syntax ───────────────────────────────────────
		"Check [the docs](https://docs.example.com/api) for usage.",
		// ── URL after an equals sign ──────────────────────────────────────────
		"redirect_url=https://example.com/callback?code=abc",
		// ── URL in a code string literal ──────────────────────────────────────
		'const endpoint = "https://api.example.com/v1/data";',
		// ── Consecutive URLs separated only by whitespace ─────────────────────
		"https://a.example.com https://b.example.com https://c.example.com",
		// ── Multiple URLs on different lines ──────────────────────────────────
		outdent`
			First: https://example.com/page1
			Second: https://example.com/page2
			Third: https://example.com/page3
		`,
		// ── Nested URL inside a query parameter ───────────────────────────────
		"https://redirect.example.com/?next=https://target.example.com/page",
		// ── GitHub-style URL with hash fragment and trailing = ────────────────
		'// Copied from https://github.com/facebook/regenerator/blob/main/packages/runtime/runtime.js#L736=',
		// ── Long URL with many path segments and query params ─────────────────
		"https://example.com/very/long/path/to/some/resource.json?format=pretty&indent=2&timestamp=1234567890#results",
	],
});
