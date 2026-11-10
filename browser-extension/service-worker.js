chrome.action.onClicked.addListener(() => {
  const workerPath = chrome.runtime.getManifest().background?.service_worker || ''
  const pagePath = workerPath.startsWith('browser-extension/') ? 'browser-extension/sneakread.html' : 'sneakread.html'
  void chrome.tabs.create({ url: chrome.runtime.getURL(pagePath) })
})

function waitForLoad(tabId) {
  return new Promise((resolve, reject) => {
    let timer
    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(onUpdated)
      clearTimeout(timer)
    }
    const onUpdated = (updatedId, changeInfo) => {
      if (updatedId !== tabId || changeInfo.status !== 'complete') return
      cleanup()
      resolve()
    }
    chrome.tabs.onUpdated.addListener(onUpdated)
    timer = setTimeout(() => {
      cleanup()
      reject(new Error('目标网页加载超时。'))
    }, 15_000)
  })
}

async function readRenderedPage(url) {
  let tabId
  try {
    const tab = await chrome.tabs.create({ url, active: false })
    tabId = tab.id
    if (tabId === undefined) throw new Error('无法打开目标网页。')
    await waitForLoad(tabId)
    await new Promise((resolve) => setTimeout(resolve, 4_000))
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({ html: document.documentElement.outerHTML, sourceUrl: location.href }),
    })
    if (!result?.html) throw new Error('网页未返回可读取内容。')
    return { ok: true, html: result.html, sourceUrl: result.sourceUrl }
  } finally {
    if (tabId !== undefined) await chrome.tabs.remove(tabId).catch(() => {})
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || message?.type !== 'read-rendered-page' || typeof message.url !== 'string') return
  let url
  try {
    url = new URL(message.url)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('仅支持不含凭据的 HTTP / HTTPS 网址。')
  } catch (error) {
    sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
    return
  }
  readRenderedPage(url.href)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }))
  return true
})
