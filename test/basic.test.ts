import { outdent } from "outdent";
import { defineTest } from "./tester";

defineTest("scanUrl", {
	valid: [
		// 不含任何 URL 模式
		"hello world",
		// 空字符串
		"",
		// 仅有协议头，缺少主机名，URL 验证失败
		"http://",
		"https://",
		// 协议头中含有空格，在到达主机名前就中断了检测
		"http:// example.com",
		// 不支持的协议头，不会被检测
		"ftp://example.com",
		"ssh://user@example.com",
		// 大写协议头——状态机仅匹配小写 'h'
		"HTTP://example.com",
		"HTTPS://example.com",
		// 缺少协议头
		"see link at www.example.com for more",
		// 协议头序列不完整
		"htt p://example.com",
		"h ttp://example.com",
		// user@host 格式的邮件地址——没有 http/https 协议头
		"contact user@example.com for info",
	],
	invalid: [
		// ── 基本提取 ─────────────────────────────────────────────────────────
		"See https://example.com/issue/1234 for details.",
		"https://example.com/issue/1234",
		// ── HTTP（非 HTTPS）──────────────────────────────────────────────────
		"API docs at http://example.com/docs",
		// ── URL 终止符 ────────────────────────────────────────────────────────
		outdent`
			see https://example.com
			new line
		`,
		"see https://example.com;new line",
		"see https://example.com{new line",
		// ── 多个 URL ──────────────────────────────────────────────────────────
		"see https://example.com and https://example2.com",
		"see https://example.com?foo=bar and https://example2.com",
		// ── 含端口号的 URL ────────────────────────────────────────────────────
		"API endpoint: https://api.example.com:8080/v1/users",
		"Dev server at http://localhost:3000/dashboard",
		// ── 含路径段的 URL ────────────────────────────────────────────────────
		"https://example.com/a/b/c/d.html",
		// ── 含查询字符串的 URL ────────────────────────────────────────────────
		"https://example.com/search?q=hello+world&lang=en&page=2",
		// ── 含片段标识符的 URL ────────────────────────────────────────────────
		"Read https://example.com/docs#installation for setup.",
		// ── 同时含查询字符串和片段标识符的 URL ───────────────────────────────
		"https://example.com/path?key=value#section-1",
		// ── 百分号编码字符 ────────────────────────────────────────────────────
		outdent`
			Hello
			Go to http://example.com/%E4%BD%A0%E5%A5%BD for more info
		`,
		"https://example.com/search?q=%E4%B8%AD%E6%96%87",
		// ── 非 ASCII 字符终止扫描 ─────────────────────────────────────────────
		outdent`
			Hello
			Go to http://example.com/你好 for more info
		`,
		// ── 查询字符串中的双问号 ──────────────────────────────────────────────
		outdent`
			Hello
			Go to http://example.com/?a=b?? for more info
		`,
		// ── 含用户信息（认证）的 URL ──────────────────────────────────────────
		"Dashboard: http://admin:secret@example.com/panel",
		// ── IP 地址形式的 URL ─────────────────────────────────────────────────
		"Internal API: http://192.168.1.100:8080/api/v2",
		// ── 子域名 ────────────────────────────────────────────────────────────
		"https://api.v2.example.com/endpoint",
		// ── 末尾斜杠 ──────────────────────────────────────────────────────────
		"Homepage is https://example.com/ — bookmark it.",
		// ── URL 位于文本开头 ──────────────────────────────────────────────────
		"https://example.com is the site.",
		// ── URL 位于文本末尾 ──────────────────────────────────────────────────
		"Visit https://example.com",
		// ── 被尖括号包围的 URL ────────────────────────────────────────────────
		"Contact at <https://example.com/contact>",
		// ── Markdown 链接语法中的 URL ─────────────────────────────────────────
		"Check [the docs](https://docs.example.com/api) for usage.",
		// ── 等号之后的 URL ────────────────────────────────────────────────────
		"redirect_url=https://example.com/callback?code=abc",
		// ── 代码字符串字面量中的 URL ──────────────────────────────────────────
		'const endpoint = "https://api.example.com/v1/data";',
		// ── 仅由空格分隔的连续 URL ────────────────────────────────────────────
		"https://a.example.com https://b.example.com https://c.example.com",
		// ── 分布在不同行的多个 URL ────────────────────────────────────────────
		outdent`
			First: https://example.com/page1
			Second: https://example.com/page2
			Third: https://example.com/page3
		`,
		// ── 查询参数中嵌套的 URL ──────────────────────────────────────────────
		"https://redirect.example.com/?next=https://target.example.com/page",
		// ── 含片段标识符和末尾等号的 GitHub 风格 URL ─────────────────────────
		'// Copied from https://github.com/facebook/regenerator/blob/main/packages/runtime/runtime.js#L736=',
		// ── 含大量路径段和查询参数的长 URL ───────────────────────────────────
		"https://example.com/very/long/path/to/some/resource.json?format=pretty&indent=2&timestamp=1234567890#results",
	],
});
