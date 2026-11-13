# SneakRead · 摸鱼

**A self-contained single-HTML reader: embedded app resources, direct website requests, and local text extraction in office disguises.**

[中文](README.zh.md) · [MIT license](LICENSE) · No backend, account, or analytics

## Use

1. Double-click the generated `sneakread.html`. The interface starts without a server or network connection.
2. Enter a URL to read CORS-enabled pages directly. To read non-CORS pages, install the Chromium extension from [browser-extension/README.zh.md](browser-extension/README.zh.md) and open the reader from its toolbar icon. The extension opens the target in a background tab, waits for scripts to render, then extracts the DOM.
3. Read in your chosen disguise; use the File menu and command palette for appearance, language, and other settings.
4. Press `Esc` to show the budget spreadsheet and press it again to resume. Optional boss auto-hide switches away when the window loses focus.
5. In the Excel disguise, drag the divider between the spreadsheet and article horizontally. Tab to the divider and use Left/Right arrows, or Home/End for its limits. At widths of 820px or less, only the article is shown. Pane sizes are not persisted and reset on reload or disguise changes.

**Offline assets do not mean offline-only reading.** All application resources are embedded. The standalone reader connects directly to the target website without third-party scraping services. The extension renders the target in the current browser profile and extracts the DOM locally, using existing login state. CAPTCHA, paywalls, anti-bot checks and sustained interaction may still block reading. Article links open in the current reader with the selected disguise. Images show a load button by default and are requested only when clicked; failed images offer a retry button. VS Code starts in preview; source view remains literal Markdown. Links to sections of the current article scroll within the reader.

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

The boss key, display-name settings, and language settings remain available. Skins support en, zh, es, hi, ar, pt, ru, ja, fr, and de; the reader input interface has English and Chinese copy. Changing language does not translate your articles, brands, code, or file paths.

## Privacy and session data

- Application scripts, styles, required icons, and license notices are embedded in the standalone gzip-packed HTML. The extension packages app resources as local extension files and does not load them from a CDN.
- No third-party reader services or analytics. Opening a URL or clicking an article link reads the target page; clicking an image button requests its original address. The background target tab may still load its own scripts, images and other resources. Image controls apply to requests and display inside the reader, not to the website's own rendering.
- The standalone HTML CSP permits HTTP(S) content and image requests but blocks external scripts, remote fonts, frames and form submissions. The extension uses its declared host permissions. Downloaded HTML is never executed as scripts inside the reader; only HTTP(S) links and image addresses are kept.
- Articles stay in memory in the current reader tab. Browser Back can revisit pages opened in that session; reloading or closing the tab clears those articles. Pasted text and local article imports have been removed.
- Only language, display-name, and appearance settings use browser local storage. Legacy saved articles are cleared when this version opens.
- Cancelling a read or closing the reader disconnects its background task and closes the target tab. Loading, rendering, and extraction share one deadline.
- The boss key hides the reading screen; it does not encrypt the article or prevent inspection of the current page.

## Build and develop

Use a Node.js version supported by Vite 8 (20.19+ or 22.12+) and pnpm. Installing dependencies and reading new URLs require network access; the interface and articles already opened in the current session do not.

```bash
pnpm install
pnpm build      # Type-check and generate ../sneakread.html plus browser-extension/
```

To bundle only, run `node build-single.mjs`. The standalone artifact is `sneakread.html` in the parent directory; the extension directory also receives `sneakread.html`, `app.js`, and `app.css`. The source `index.html` enforces strict CSP; rebuild and open the relevant artifact when developing; Vite HMR and preview servers are not used.

Use modern Chrome, Edge, Firefox, or Safari with `DecompressionStream` support and JavaScript enabled. The gzip bootstrap uses native decompression and inline scripts, not `eval`. Decompressed third-party notices are stored in the page's `#third-party-licenses` element.

- Chromium checks cover URL reading, unsafe URL rejection, the boss key, session-only navigation, heading and code preservation, and same-page section links. Startup makes no HTTP(S) requests.
- Local checks exercise extension cancellation during loading and rendering, an already-complete target tab, slow pages within the shared deadline, and two independent reader tasks. Chrome APIs and clocks are simulated for these lifecycle checks.
- Earlier checks loaded the extension in an isolated Chrome profile against a local dynamic website: rendered relative links, in-reader chapter navigation, preserving the current document on failure, image loading and retry controls, and the Excel divider. The existing browser checks also cover safe parsing, all 15 skins, and keyboard resizing. Safari and Firefox have not been exercised.


## Contributing and license

Built with Vite, React, TypeScript, and React Markdown + GFM. See [CONTRIBUTING.md](CONTRIBUTING.md). Keep app resources embedded and network reading in `src/core/web-read.ts`; do not add third-party scraping services or execute article scripts.

Original project: [SneakRead/sneakread](https://github.com/SneakRead/sneakread), by **刘小排 (Liu Xiaopai)**.

[MIT](LICENSE) © 2026 SneakRead · 刘小排 (Liu Xiaopai)
