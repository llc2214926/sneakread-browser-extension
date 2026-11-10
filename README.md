# SneakRead · 摸鱼

**A self-contained single-HTML reader: embedded app resources, direct website requests, and local text extraction in office disguises.**

[中文](README.zh.md) · [MIT license](LICENSE) · No backend, account, or analytics

## Use

1. Double-click the generated `sneakread.html`. The interface starts without a server or network connection.
2. Enter a URL to read CORS-enabled pages directly. To read non-CORS pages, install the Chromium extension from [browser-extension/README.zh.md](browser-extension/README.zh.md) and open the reader from its toolbar icon. The extension opens the target in a background tab, waits for scripts to render, then extracts the DOM. You can also paste text or import a UTF-8 `.txt`, `.md`, `.markdown`, `.html`, or `.htm` file.
3. Read in your chosen disguise; use the File menu and command palette for appearance, language, and other settings.
4. Press `Esc` to show the budget spreadsheet and press it again to resume. Optional boss auto-hide switches away when the window loses focus.
5. In the Excel disguise, drag the divider between the spreadsheet and article horizontally. Tab to the divider and use Left/Right arrows, or Home/End for its limits. At widths of 820px or less, only the article is shown. Pane sizes are not persisted and reset on reload or disguise changes.

**Offline assets do not mean offline-only reading.** All application resources are embedded. The standalone reader connects directly to the target website without third-party scraping services. The extension renders the target in the current browser profile and extracts the DOM locally, using existing login state. CAPTCHA, paywalls, anti-bot checks and sustained interaction may still block reading. Article links open in the current reader with the selected disguise. Images show a load button by default and are requested only when clicked; failed images offer a retry button. VS Code starts in preview; source view remains literal Markdown. Re-read the original URL to restore links and image addresses missing from older cached documents.

## Fifteen disguises

| Skin | Content shape |
| --- | --- |
| Word | Article with ribbon, ruler, and status bar |
| VS Code | Markdown in a lightweight code view; no Monaco runtime |
| Claude Code | Assistant reply in a terminal |
| Google Docs | Document page |
| Notion | Page inside a database |
| Lark Docs / 飞书文档 | Document with outline and display-name watermark |
| Slack | Channel messages |
| Lark / 飞书 | Group messages |
| DingTalk / 钉钉 | Group messages |
| WeCom / 企业微信 | Group messages |
| WPS 文字 | Chinese office document |
| Excel | Data table or audit sheet |
| Outlook | Email reading pane |
| Teams | Channel post |
| Gmail | Email conversation |

The boss key, display-name settings, local reading records, and language settings remain available. Skins support en, zh, es, hi, ar, pt, ru, ja, fr, and de; the offline import interface has English and Chinese copy. Changing language does not translate your articles, brands, code, or file paths.

## Privacy and local records

- Application scripts, styles, required icons, and license notices are embedded in the standalone gzip-packed HTML. The extension packages app resources as local extension files and does not load them from a CDN.
- No third-party reader services or analytics. Opening a URL or clicking an article link reads the target page; clicking an image button requests its original address. The background target tab may still load its own scripts, images and other resources. Image controls apply to requests and display inside the reader, not to the website's own rendering.
- The standalone HTML CSP permits HTTP(S) content and image requests but blocks external scripts, remote fonts, frames and form submissions. The extension uses its declared host permissions. Downloaded or imported HTML is never executed as scripts inside the reader; only HTTP(S) links and image addresses are kept.
- Articles and settings stay in the current browser's local storage. They are not written back to `sneakread.html` or to imported files.
- **The cache is not a backup.** Clearing browser data, private browsing, switching browsers, or moving the HTML file can make records unavailable. Keep your original files. Copying the reader HTML does not copy its stored records.
- The boss key hides the reading screen; it does not encrypt local data or prevent inspection of browser storage.

## Build and develop

Use a Node.js version supported by Vite 8 (20.19+ or 22.12+) and pnpm. Installing dependencies and reading new URLs require network access; the interface, cached articles and local files do not.

```bash
pnpm install
pnpm build      # Type-check and generate ../sneakread.html plus browser-extension/
```

To bundle only, run `node build-single.mjs`. The standalone artifact is `sneakread.html` in the parent directory; the extension directory also receives `sneakread.html`, `app.js`, and `app.css`. The source `index.html` enforces strict CSP; rebuild and open the relevant artifact when developing; Vite HMR and preview servers are not used.

Use modern Chrome, Edge, Firefox, or Safari with `DecompressionStream` support and JavaScript enabled. The gzip bootstrap uses native decompression and inline scripts, not `eval`. Decompressed third-party notices are stored in the page's `#third-party-licenses` element.

- Verified in Chromium from `file://`: direct reading of `https://www.w3.org/TR/DOM-Parsing/`, rejection of the non-CORS `https://example.com/`, cancellation, unsafe URL rejection, cached reading offline, and the boss key. Startup made no HTTP(S) requests; reading contacted only the entered target domains, without scraping services.
- Loaded the extension in an isolated Chrome profile and exercised its actual `chrome-extension://` page against a local dynamic website: rendered relative links, in-reader chapter navigation, preserving the current document on failure, no image elements before clicking, successful image decoding after clicking, and failed-image retry controls. Clicking a load-image button nested in a link stays in the reader. The existing browser regression checks cover safe parsing and all 15 skins. Safari and Firefox have not been exercised.
- Verified the Excel divider in the actual extension page: dragging in both directions, 20–80% limits, keyboard resizing, and the reading-only layout at 508px. The browser regression checks include keyboard resizing and boundary behavior.


## Contributing and license

Built with Vite, React, TypeScript, and React Markdown + GFM. See [CONTRIBUTING.md](CONTRIBUTING.md). Keep app resources embedded and network reading in `src/core/web-read.ts`; do not add third-party scraping services or execute article scripts.

Original project: [SneakRead/sneakread](https://github.com/SneakRead/sneakread), by **刘小排 (Liu Xiaopai)**.

[MIT](LICENSE) © 2026 SneakRead · 刘小排 (Liu Xiaopai)
