import { useState } from 'react'
import type { ReactNode } from 'react'
import type { DocumentRecord } from '../../core/types'
import type { SkinDefinition } from '../types'
import { getSiteLabel, emailBody, formatBytes, clockLabel, parseTimestamp } from '../../core/content'
import { aliasInitial } from '../../core/alias'
import { MarkdownContent, WindowButtons, SkinSwitcher } from '../shared'
import { OutlookLogo } from '../../logos'
import { Bell, Paperclip } from 'lucide-react'
import { lang } from '../../i18n'
import {
  Grid24Regular,
  Settings24Regular,
  QuestionCircle24Regular,
  Mail24Regular,
  CalendarLtr24Regular,
  People24Regular,
  TaskListSquareLtr20Regular,
  Search20Regular,
  Compose20Regular,
  Delete20Regular,
  Archive20Regular,
  FolderArrowRight20Regular,
  Broom20Regular,
  ArrowReply20Regular,
  ArrowReplyAll20Regular,
  ArrowForward20Regular,
  Flag20Regular,
  MoreHorizontal20Regular,
  MailInbox20Regular,
  Drafts20Regular,
  Send20Regular,
  Folder20Regular,
  Star20Regular,
} from '@fluentui/react-icons'

// ===== BLOCK APPENDED BELOW =====
const olRibbonGroups: { label: string; icon: ReactNode; accent?: boolean }[][] = [
  [{ label: lang === 'zh' ? '新建邮件' : 'New mail', icon: <Compose20Regular />, accent: true }],
  [
    { label: lang === 'zh' ? '删除' : 'Delete', icon: <Delete20Regular /> },
    { label: lang === 'zh' ? '存档' : 'Archive', icon: <Archive20Regular /> },
    { label: lang === 'zh' ? '移动到' : 'Move to', icon: <FolderArrowRight20Regular /> },
    { label: lang === 'zh' ? '清理' : 'Sweep', icon: <Broom20Regular /> },
  ],
  [
    { label: lang === 'zh' ? '回复' : 'Reply', icon: <ArrowReply20Regular /> },
    { label: lang === 'zh' ? '全部回复' : 'Reply all', icon: <ArrowReplyAll20Regular /> },
    { label: lang === 'zh' ? '转发' : 'Forward', icon: <ArrowForward20Regular /> },
  ],
  [
    { label: lang === 'zh' ? '标记' : 'Flag', icon: <Flag20Regular /> },
    { label: lang === 'zh' ? '更多' : 'More', icon: <MoreHorizontal20Regular /> },
  ],
]

const olFolders: { label: string; icon: ReactNode; count?: number; active?: boolean }[] = [
  { label: lang === 'zh' ? '收件箱' : 'Inbox', icon: <MailInbox20Regular />, count: 12, active: true },
  { label: lang === 'zh' ? '草稿' : 'Drafts', icon: <Drafts20Regular />, count: 2 },
  { label: lang === 'zh' ? '已发送邮件' : 'Sent Items', icon: <Send20Regular /> },
  { label: lang === 'zh' ? '已删除邮件' : 'Deleted Items', icon: <Delete20Regular /> },
  { label: lang === 'zh' ? '存档' : 'Archive', icon: <Folder20Regular /> },
]

// `days` = days back; the visible weekday label comes from the real calendar.
const olOthers = lang === 'zh' ? [
  { from: '财务运营', subject: '第三季度预算跟进', preview: '在会议前分享最新数据……', days: 1, hue: 168 },
  { from: '设计团队', subject: '设计评审纪要', preview: '今天的讨论很有收获，待办事项……', days: 2, hue: 268 },
  { from: '供应商管理', subject: '供应商续约', preview: '合同即将到期续签……', days: 2, hue: 24 },
  { from: '数据分析', subject: '每周指标摘要', preview: '您的仪表板已于昨夜更新……', days: 3, hue: 210 },
] : [
  { from: 'Finance Ops', subject: 'Q3 budget follow-up', preview: 'Sharing the latest numbers before…', days: 1, hue: 168 },
  { from: 'Design Team', subject: 'Design review notes', preview: 'Great session today — action items…', days: 2, hue: 268 },
  { from: 'Vendor Ops', subject: 'Vendor renewal', preview: 'The contract is up for renewal on…', days: 2, hue: 24 },
  { from: 'Analytics', subject: 'Weekly metrics digest', preview: 'Your dashboards refreshed overnight…', days: 3, hue: 210 },
]

function weekdayLabel(daysBack: number) {
  return new Date(Date.now() - daysBack * 86_400_000).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    weekday: 'short',
  })
}

// Outlook writes reading-pane dates as "Mon 7/7/2026 10:14 AM".
function outlookDate(value: string | undefined) {
  const d = parseTimestamp(value)
  if (lang === 'zh') return d.toLocaleString('zh-CN', {
    weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const day = d.toLocaleDateString('en-US', { weekday: 'short' })
  const date = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
  return `${day} ${date} ${clockLabel(d, { ampm: true })}`
}

export function OutlookSkin({ doc }: { doc: DocumentRecord }) {
  const site = getSiteLabel(doc.sourceUrl)
  const body = emailBody(doc, lang)
  const [tab, setTab] = useState<'focused' | 'other'>('focused')
  const initial = site.charAt(0).toUpperCase()
  return (
    <div className="outlook">
      <div className="ol-appbar">
        <button type="button" className="ol-waffle" aria-label={lang === 'zh' ? '应用启动器' : 'App launcher'}>
          <Grid24Regular />
        </button>
        <span className="ol-wordmark">
          <OutlookLogo size={20} />
          <b>Outlook</b>
        </span>
        <div className="ol-search">
          <Search20Regular />
          <span>{lang === 'zh' ? '搜索' : 'Search'}</span>
        </div>
        <div className="ol-appbar-right">
          <button type="button" className="ol-appbar-ic is-clickable" data-appmenu="file" aria-label={lang === 'zh' ? '设置' : 'Settings'}>
            <Settings24Regular />
          </button>
          <button type="button" className="ol-appbar-ic" aria-label={lang === 'zh' ? '帮助' : 'Help'}>
            <QuestionCircle24Regular />
          </button>
          <span className="ol-me">{aliasInitial()}</span>
          <WindowButtons />
        </div>
      </div>

      <div className="ol-tabs">
        {(lang === 'zh' ? ['开始', '视图', '帮助'] : ['Home', 'View', 'Help']).map((t, i) => (
          <span key={t} className={i === 0 ? 'is-active' : undefined}>
            {t}
          </span>
        ))}
      </div>

      <div className="ol-ribbon">
        {olRibbonGroups.map((group, gi) => (
          <div className="ol-rib-group" key={gi}>
            {group.map((cmd) => (
              <span
                key={cmd.label}
                className={cmd.accent ? 'ol-cmd ol-cmd-accent' : 'ol-cmd'}
              >
                {cmd.icon}
                {cmd.label}
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="ol-body">
        <nav className="ol-rail">
          <button type="button" className="ol-rail-btn is-active" aria-label={lang === 'zh' ? '邮件' : 'Mail'}>
            <Mail24Regular />
          </button>
          <button type="button" className="ol-rail-btn" aria-label={lang === 'zh' ? '日历' : 'Calendar'}>
            <CalendarLtr24Regular />
          </button>
          <button type="button" className="ol-rail-btn" aria-label={lang === 'zh' ? '联系人' : 'People'}>
            <People24Regular />
          </button>
          <button type="button" className="ol-rail-btn" aria-label={lang === 'zh' ? '待办事项' : 'To Do'}>
            <TaskListSquareLtr20Regular />
          </button>
        </nav>

        <aside className="ol-folders">
          <div className="ol-fav">
            <Star20Regular /> {lang === 'zh' ? '收藏夹' : 'Favorites'}
          </div>
          {olFolders.map((folder) => (
            <span
              key={folder.label}
              className={folder.active ? 'ol-folder is-active' : 'ol-folder'}
            >
              {folder.icon}
              {folder.label}
              {folder.count ? <em>{folder.count}</em> : null}
            </span>
          ))}
        </aside>

        <aside className="ol-list">
          <div className="ol-pivot">
            <button
              type="button"
              className={tab === 'focused' ? 'is-active' : undefined}
              onClick={() => setTab('focused')}
            >
              {lang === 'zh' ? '重点' : 'Focused'}
            </button>
            <button
              type="button"
              className={tab === 'other' ? 'is-active' : undefined}
              onClick={() => setTab('other')}
            >
              {lang === 'zh' ? '其他' : 'Other'}
            </button>
          </div>
          <button type="button" className="ol-msg is-active is-unread">
            <span className="ol-avatar" style={{ background: '#0f6cbd' }}>
              {initial}
            </span>
            <div className="ol-msg-main">
              <div className="ol-msg-top">
                <strong>{site}</strong>
                <small>{clockLabel(parseTimestamp(doc.fetchedAt), { ampm: lang !== 'zh' })}</small>
              </div>
              <div className="ol-msg-subject">{doc.title}</div>
              <div className="ol-msg-preview">
                <Paperclip size={11} aria-hidden="true" /> source.md · {doc.summary.words} {lang === 'zh' ? '字' : 'words'}
              </div>
            </div>
            <em className="ol-unread-dot" />
          </button>
          {olOthers.map((msg) => (
            <button key={msg.subject} type="button" className="ol-msg">
              <span className="ol-avatar" style={{ background: `hsl(${msg.hue} 52% 45%)` }}>
                {msg.from.charAt(0)}
              </span>
              <div className="ol-msg-main">
                <div className="ol-msg-top">
                  <strong>{msg.from}</strong>
                  <small>{weekdayLabel(msg.days)}</small>
                </div>
                <div className="ol-msg-subject">{msg.subject}</div>
                <div className="ol-msg-preview">{msg.preview}</div>
              </div>
            </button>
          ))}
        </aside>

        <article className="ol-reading markdown-body">
          <SkinSwitcher className="ol-switch" />
          <div className="ol-reading-head">
            <div className="ol-reading-bar">
              <h1>{doc.title}</h1>
              <div className="ol-reading-actions">
                <button type="button">
                  <ArrowReply20Regular /> {lang === 'zh' ? '回复' : 'Reply'}
                </button>
                <button type="button">
                  <ArrowReplyAll20Regular /> {lang === 'zh' ? '全部回复' : 'Reply all'}
                </button>
                <button type="button">
                  <ArrowForward20Regular /> {lang === 'zh' ? '转发' : 'Forward'}
                </button>
              </div>
            </div>
            <div className="ol-from">
              <span className="ol-from-avatar">{initial}</span>
              <div>
                <strong>{site}</strong>
                <span>{lang === 'zh' ? '收件人：战略团队' : 'To: Strategy Team'}</span>
              </div>
              <small>{outlookDate(doc.fetchedAt)}</small>
            </div>
            <div className="ol-attach">
              <Bell size={13} aria-hidden="true" /> {lang === 'zh' ? '已由 Safe Links 扫描 ·' : 'Scanned by Safe Links ·'}{' '}
              <Paperclip size={13} aria-hidden="true" /> source.md ({formatBytes(doc.sizeBytes)})
            </div>
          </div>
          <MarkdownContent markdown={body} baseUrl={doc.sourceUrl} />
        </article>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Home / landing (default Word chrome; VS Code one click away)
 * ------------------------------------------------------------------ */


const outlook: SkinDefinition = {
  id: 'outlook',
  label: 'Outlook',
  appName: 'Outlook',
  fileExtension: 'msg',
  accent: '#0f6cbd',
  Surface: OutlookSkin,
}
export default outlook
