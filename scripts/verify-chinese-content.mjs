import assert from 'node:assert/strict'
import { emailBody, extractHeadings } from '../src/core/content.ts'

// UI localization must not translate article text or alter link destinations.
const paragraph = 'Home / File / Search — these are article words, not UI labels.'
const doc = {
  markdown: `# Original English heading\n\n${paragraph}\n\n[Original source](/reference)`,
  sourceUrl: 'https://example.com/article',
}
for (const language of ['zh', 'en', 'ja']) {
  const body = emailBody(doc, language)
  assert.ok(body.includes(paragraph))
  assert.ok(body.includes('[Original source](https://example.com/reference)'))
  assert.deepEqual(extractHeadings(doc.markdown, language), ['Original English heading'])
}
assert.equal(emailBody(doc, 'en'), emailBody(doc, 'ja'))
assert.notEqual(emailBody(doc, 'zh'), emailBody(doc, 'en'))
assert.notDeepEqual(extractHeadings('No headings here.', 'zh'), extractHeadings('No headings here.', 'en'))
assert.deepEqual(extractHeadings('No headings here.', 'ja'), extractHeadings('No headings here.', 'en'))
console.log('PASS: Chinese UI localization preserves article text, headings, URLs, and other languages.')
