# url-scan

[![Badge](https://img.shields.io/badge/link-996.icu-%23FF4D5B.svg?style=flat-square)](https://996.icu/#/en_US)
[![LICENSE](https://img.shields.io/badge/license-Anti%20996-blue.svg?style=flat-square)](https://github.com/996icu/996.ICU/blob/master/LICENSE)
![Node](https://img.shields.io/badge/node-%3E=14-blue.svg?style=flat-square)
[![npm version](https://badge.fury.io/js/url-scan.svg)](https://badge.fury.io/js/url-scan)

A library to scan text for HTTP/HTTPS URLs and return each URL with its position (index and line/column location).

## Installation

```bash
npm install url-scan --save
```

## Usage

```js
// import via esm
import { scanUrl } from "url-scan";

// import via cjs
const { scanUrl } = require("url-scan");
```

```js
import { scanUrl } from "url-scan";

const results = scanUrl("See https://example.com/issue/1234 for details.");

console.log(results);
// [
//   {
//     "url": "https://example.com/issue/1234",
//     "start": 4,
//     "end": 34,
//     "loc": {
//       "start": { "line": 1, "column": 5 },
//       "end": { "line": 1, "column": 35 }
//     }
//   }
// ]
```

### Multi-line text

```js
import { scanUrl } from "url-scan";

const text = `Visit https://example.com for info
or https://example.org for more.`;

const results = scanUrl(text);

console.log(results);
// [
//   {
//     "url": "https://example.com",
//     "start": 6,
//     "end": 25,
//     "loc": {
//       "start": { "line": 1, "column": 7 },
//       "end": { "line": 1, "column": 26 }
//     }
//   },
//   {
//     "url": "https://example.org",
//     "start": 39,
//     "end": 58,
//     "loc": {
//       "start": { "line": 2, "column": 4 },
//       "end": { "line": 2, "column": 23 }
//     }
//   }
// ]
```

## API

### `scanUrl(text: string): URLRecord[]`

Scans the given text for HTTP/HTTPS URLs and returns an array of `URLRecord` objects.

- **`text`** – The input string to scan.

### `URLRecord`

Each result object has the following shape:

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | The matched URL string. |
| `start` | `number` | Zero-based character index of the first character of the URL in `text`. |
| `end` | `number` | Zero-based character index immediately after the last character of the URL in `text`. |
| `loc.start.line` | `number` | One-based line number where the URL starts. |
| `loc.start.column` | `number` | One-based column number where the URL starts. |
| `loc.end.line` | `number` | One-based line number where the URL ends. |
| `loc.end.column` | `number` | One-based column number immediately after the last character of the URL. |

## License

The [Anti 996 License](LICENSE)
