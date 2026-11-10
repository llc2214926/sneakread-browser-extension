import type { DocumentRecord } from '../../core/types'
import type { SkinDefinition } from '../types'
import { articleBody } from '../../core/content'
import { MSym, MarkdownContent, SkinSwitcher } from '../shared'
import { DocsLogo } from '../../logos'
import { aliasInitial } from '../../core/alias'
import { lang } from '../../i18n'

// ===== BLOCK APPENDED BELOW =====
const gdMenus = ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Extensions', 'Help']
const gdMenusZh = ['文件', '编辑', '查看', '插入', '格式', '工具', '扩展程序', '帮助']

export function DocsSkin({ doc }: { doc: DocumentRecord }) {
  const body = articleBody(doc)
  return (
    <div className="gdocs">
      <div className="gdocs-topbar">
        <span className="gdocs-icon">
          <DocsLogo size={40} />
        </span>
        <div className="gdocs-title-block">
          <div className="gdocs-title-row">
            <div className="gdocs-title">{doc.fileName.replace(/\.[^.]+$/, '')}</div>
            <MSym name="star" className="gd-title-ic" />
            <MSym name="drive_file_move" className="gd-title-ic" />
            <MSym name="cloud_done" className="gd-title-ic" />
          </div>
          <div className="gdocs-menu">
            {gdMenus.map((item, i) => (
              <span
                key={item}
                className={item === 'File' ? 'is-clickable' : undefined}
                data-appmenu={item === 'File' ? 'file' : undefined}
              >
                {lang === 'zh' ? gdMenusZh[i] : item}
              </span>
            ))}
          </div>
        </div>
        <div className="gdocs-actions">
          <button type="button" className="gd-topic" aria-label={lang === 'zh' ? '版本历史记录' : 'History'}>
            <MSym name="history" />
          </button>
          <button type="button" className="gd-topic" aria-label={lang === 'zh' ? '评论历史记录' : 'Comment history'}>
            <MSym name="chat_bubble_outline" />
          </button>
          <button type="button" className="gd-topic gd-video" aria-label={lang === 'zh' ? '通话' : 'Call'}>
            <MSym name="videocam" />
          </button>
          <button type="button" className="gdocs-share">
            <MSym name="lock" /> {lang === 'zh' ? '共享' : 'Share'}
          </button>
          <span className="gdocs-avatar">{aliasInitial()}</span>
        </div>
      </div>
      <div className="gdocs-toolbar">
        <span className="gd-pill">
          <MSym name="search" />
        </span>
        <span className="gd-tool" aria-label={lang === 'zh' ? '撤销' : 'Undo'}>
          <MSym name="undo" />
        </span>
        <span className="gd-tool" aria-label={lang === 'zh' ? '重做' : 'Redo'}>
          <MSym name="redo" />
        </span>
        <span className="gd-tool" aria-label={lang === 'zh' ? '打印' : 'Print'}>
          <MSym name="print" />
        </span>
        <span className="gd-tool" aria-label={lang === 'zh' ? '拼写检查' : 'Spellcheck'}>
          <MSym name="spellcheck" />
        </span>
        <span className="gd-tool" aria-label={lang === 'zh' ? '格式刷' : 'Paint format'}>
          <MSym name="format_paint" />
        </span>
        <span className="gd-tool gd-zoom">100%</span>
        <span className="gd-sep" />
        <span className="gd-tool gd-wide">{lang === 'zh' ? '正文' : 'Normal text'} <MSym name="arrow_drop_down" /></span>
        <span className="gd-sep" />
        <span className="gd-tool gd-wide">Arial <MSym name="arrow_drop_down" /></span>
        <span className="gd-sep" />
        <span className="gd-tool gd-mini" aria-label={lang === 'zh' ? '减小字号' : 'Decrease font'}>
          <MSym name="remove" />
        </span>
        <span className="gd-tool gd-size">11</span>
        <span className="gd-tool gd-mini" aria-label={lang === 'zh' ? '增大字号' : 'Increase font'}>
          <MSym name="add" />
        </span>
        <span className="gd-sep" />
        <span className="gd-tool" aria-label={lang === 'zh' ? '加粗' : 'Bold'}>
          <MSym name="format_bold" />
        </span>
        <span className="gd-tool" aria-label={lang === 'zh' ? '斜体' : 'Italic'}>
          <MSym name="format_italic" />
        </span>
        <span className="gd-tool" aria-label={lang === 'zh' ? '下划线' : 'Underline'}>
          <MSym name="format_underlined" />
        </span>
        <span className="gd-tool" aria-label={lang === 'zh' ? '文字颜色' : 'Text color'}>
          <MSym name="format_color_text" />
        </span>
        <span className="gd-tool" aria-label={lang === 'zh' ? '突出显示' : 'Highlight'}>
          <MSym name="border_color" />
        </span>
        <span className="gd-sep" />
        <span className="gd-tool" aria-label={lang === 'zh' ? '插入链接' : 'Insert link'}>
          <MSym name="add_link" />
        </span>
        <span className="gd-tool" aria-label={lang === 'zh' ? '添加评论' : 'Add comment'}>
          <MSym name="add_comment" />
        </span>
        <span className="gd-tool" aria-label={lang === 'zh' ? '插入图片' : 'Insert image'}>
          <MSym name="image" />
        </span>
        <span className="gd-sep" />
        <span className="gd-tool" aria-label={lang === 'zh' ? '对齐' : 'Align'}>
          <MSym name="format_align_left" />
        </span>
        <span className="gd-tool" aria-label={lang === 'zh' ? '行距' : 'Line spacing'}>
          <MSym name="format_line_spacing" />
        </span>
        <span className="gd-tool" aria-label={lang === 'zh' ? '核对清单' : 'Checklist'}>
          <MSym name="checklist" />
        </span>
        <span className="gd-tool" aria-label={lang === 'zh' ? '项目符号列表' : 'Bulleted list'}>
          <MSym name="format_list_bulleted" />
        </span>
        <span className="gd-tool" aria-label={lang === 'zh' ? '编号列表' : 'Numbered list'}>
          <MSym name="format_list_numbered" />
        </span>
        <span className="gd-toolbar-right">
          <span className="gdocs-mode">
            <MSym name="edit" /> {lang === 'zh' ? '编辑' : 'Editing'} <MSym name="arrow_drop_down" />
          </span>
          <span className="gd-tool" aria-label={lang === 'zh' ? '隐藏工具栏' : 'Hide toolbar'}>
            <MSym name="expand_less" />
          </span>
        </span>
      </div>
      <div className="paper-canvas gdocs-canvas">
        <article className="paper gdocs-page markdown-body">
          <SkinSwitcher className="paper-switch" />
          <h1>{doc.title}</h1>
          <MarkdownContent markdown={body} baseUrl={doc.sourceUrl} />
        </article>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Excel
 * ------------------------------------------------------------------ */


const docs: SkinDefinition = {
  id: 'docs',
  label: 'Google Docs',
  appName: 'Google Docs',
  fileExtension: 'gdoc',
  accent: '#4285f4',
  faviconGlyph: 'D',
  Surface: DocsSkin,
}
export default docs
