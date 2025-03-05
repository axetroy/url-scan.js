# url-scan

[![Badge](https://img.shields.io/badge/link-996.icu-%23FF4D5B.svg?style=flat-square)](https://996.icu/#/en_US)
[![LICENSE](https://img.shields.io/badge/license-Anti%20996-blue.svg?style=flat-square)](https://github.com/996icu/996.ICU/blob/master/LICENSE)
![Node](https://img.shields.io/badge/node-%3E=14-blue.svg?style=flat-square)
[![npm version](https://badge.fury.io/js/url-scan.svg)](https://badge.fury.io/js/url-scan)

A library to scan the URL for the given string.

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

## License

The [Anti 996 License](LICENSE)
