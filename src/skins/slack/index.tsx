import type { DocumentRecord } from '../../core/types'
import type { SkinDefinition } from '../types'
import { articleBody, clockLabel, getSiteLabel, minutesAgo } from '../../core/content'
import { aliasInitial } from '../../core/alias'
import { MarkdownContent, SkinSwitcher, splitMarkdownForChat } from '../shared'
import { lang } from '../../i18n'
import {
  Search,
  CircleHelp,
  House,
  MessageSquareText,
  Bell,
  Clock,
  MoreHorizontal,
  Plus,
  Hash,
  ChevronDown,
  Headphones,
  SquarePen,
  Smile,
  Paperclip,
  AtSign,
  SendHorizontal,
  Bold,
  Italic,
  Strikethrough,
  Link,
  List,
  Code,
  Video,
  Star,
} from 'lucide-react'

const zh = lang === 'zh'

const RAIL = [
  { icon: House, label: zh ? '主页' : 'Home', active: true },
  { icon: MessageSquareText, label: zh ? '私信' : 'DMs' },
  { icon: Bell, label: zh ? '动态' : 'Activity' },
  { icon: Clock, label: zh ? '稍后处理' : 'Later' },
  { icon: MoreHorizontal, label: zh ? '更多' : 'More' },
]
const CHANNELS = zh
  ? ['常规', '闲聊', '工程', '设计评审', '茶水间']
  : ['general', 'random', 'engineering', 'design-crit', 'watercooler']
const DMS = [
  { name: zh ? '设计同步' : 'Design Sync', hue: 168, on: true },
  { name: zh ? '值班' : 'On-call', hue: 268, on: false },
  { name: zh ? '数据团队' : 'Data Team', hue: 24, on: true },
]

// A rounded-square avatar hue from a string — deterministic (SSR/resume safe).
function hueOf(seed: string) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h % 360
}

export function SlackSkin({ doc }: { doc: DocumentRecord }) {
  const body = articleBody(doc)
  const site = getSiteLabel(doc.sourceUrl)
  const author = doc.projectName || site
  const initial = author.trim().charAt(0).toUpperCase()
  const hue = hueOf(author)
  let channel = doc.title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  if (channel.length > 22) {
    // Trim at a segment boundary — "#world-cup-2026-is-balo" reads fake.
    channel = channel.slice(0, 22).replace(/-[^-]*$/, '') || channel.slice(0, 22)
  }
  if (!channel) channel = zh ? '阅读' : 'reading'
  const chunks = splitMarkdownForChat(body)
  // Real, recent clock times: the run of messages ends a few minutes ago.
  const stampAt = (i: number) =>
    clockLabel(minutesAgo(6 + (chunks.length - 1 - i) * 3), { ampm: !zh })
  const workspace = zh ? '项目总部' : 'Project HQ'

  return (
    <div className="slack">
      <div className="sl-topbar">
        <div className="sl-top-nav" aria-hidden="true">
          <span>‹</span>
          <span>›</span>
        </div>
        <div className="sl-search">
          <Search size={15} />
          <span>{zh ? '搜索' : 'Search'} {workspace}</span>
        </div>
        <button type="button" className="sl-top-help" aria-label={zh ? '帮助' : 'Help'}>
          <CircleHelp size={18} />
        </button>
      </div>

      <div className="sl-body">
        <nav className="sl-rail">
          <div className="sl-rail-items">
            {RAIL.map((r) => (
              <button
                key={r.label}
                type="button"
                className={r.active ? 'sl-rail-btn is-active' : 'sl-rail-btn'}
              >
                <span className="sl-rail-ic">
                  <r.icon size={20} />
                </span>
                <span className="sl-rail-label">{r.label}</span>
              </button>
            ))}
          </div>
          <div className="sl-rail-foot">
            <button type="button" className="sl-rail-new" aria-label={zh ? '新建' : 'New'}>
              <Plus size={20} />
            </button>
            <span className="sl-rail-me" style={{ background: `hsl(${hue} 55% 42%)` }}>
              {aliasInitial(initial)}
              <em className="sl-presence" />
            </span>
          </div>
        </nav>

        <aside className="sl-side">
          <div className="sl-side-head" data-appmenu="file">
            <b>{workspace}</b>
            <ChevronDown size={16} />
            <span className="sl-side-compose" aria-hidden="true">
              <SquarePen size={16} />
            </span>
          </div>
          <div className="sl-side-scroll">
            <div className="sl-quick">
              <span className="sl-quick-row">{zh ? '话题' : 'Threads'}</span>
              <span className="sl-quick-row">{zh ? '草稿与已发送' : 'Drafts & sent'}</span>
            </div>
            <div className="sl-section">
              <ChevronDown size={13} /> {zh ? '频道' : 'Channels'}
            </div>
            {CHANNELS.map((c) => (
              <span key={c} className="sl-chan">
                <Hash size={15} className="sl-chan-hash" />
                {c}
              </span>
            ))}
            <span className="sl-chan is-active">
              <Hash size={15} className="sl-chan-hash" />
              {channel}
            </span>
            <div className="sl-section">
              <ChevronDown size={13} /> {zh ? '私信' : 'Direct messages'}
            </div>
            {DMS.map((d) => (
              <span key={d.name} className="sl-dm">
                <span className="sl-dm-av" style={{ background: `hsl(${d.hue} 55% 45%)` }}>
                  {d.name.charAt(0)}
                  <em className={d.on ? 'sl-presence on' : 'sl-presence'} />
                </span>
                {d.name}
              </span>
            ))}
          </div>
        </aside>

        <main className="sl-main">
          <header className="sl-chan-head">
            <div className="sl-chan-title">
              <Hash size={17} />
              <b>{channel}</b>
              <ChevronDown size={15} className="sl-chan-title-chev" />
            </div>
            <div className="sl-chan-actions">
              <span className="sl-chan-members">
                <Star size={14} />
              </span>
              <button type="button" className="sl-huddle">
                <Headphones size={15} /> {zh ? '快速会议' : 'Huddle'}
              </button>
              <span className="sl-chan-ic">
                <Video size={16} />
              </span>
              <span className="sl-chan-ic">
                <MoreHorizontal size={16} />
              </span>
            </div>
          </header>

          <div className="sl-stream">
            <SkinSwitcher className="sl-switch" />
            <div className="sl-day">
              <span>{zh ? '今天' : 'Today'}</span>
            </div>

            <div className="sl-msg sl-msg-lead">
              <span className="sl-msg-av" style={{ background: `hsl(${hue} 55% 42%)` }}>
                {initial}
              </span>
              <div className="sl-msg-content">
                <div className="sl-msg-head">
                  <b className="sl-msg-name">{author}</b>
                  <span className="sl-app-badge">{zh ? '应用' : 'APP'}</span>
                  <span className="sl-msg-time">{stampAt(0)}</span>
                </div>
                <div className="sl-msg-body markdown-body">
                  <MarkdownContent markdown={chunks[0] ?? body} baseUrl={doc.sourceUrl} />
                </div>
              </div>
            </div>

            {chunks.slice(1).map((chunk, i) => (
              <div key={i} className="sl-msg sl-msg-cont">
                <span className="sl-cont-time">{stampAt(i + 1)}</span>
                <div className="sl-msg-content">
                  <div className="sl-msg-body markdown-body">
                    <MarkdownContent markdown={chunk} baseUrl={doc.sourceUrl} />
                  </div>
                </div>
              </div>
            ))}

            {body.trim() && (
              <div className="sl-reactions">
                <span className="sl-react">👀 3</span>
                <span className="sl-react">🔥 2</span>
                <span className="sl-react sl-react-add">
                  <Smile size={14} />
                </span>
              </div>
            )}
          </div>

          <div className="sl-composer">
            <div className="sl-composer-tools">
              <Bold size={15} />
              <Italic size={15} />
              <Strikethrough size={15} />
              <Link size={15} />
              <List size={15} />
              <Code size={15} />
            </div>
            <div className="sl-composer-input">{zh ? '发送消息到' : 'Message'} #{channel}</div>
            <div className="sl-composer-foot">
              <span className="sl-composer-left">
                <Plus size={16} />
                <Smile size={16} />
                <AtSign size={16} />
                <Paperclip size={16} />
              </span>
              <span className="sl-send">
                <SendHorizontal size={15} />
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

const slack: SkinDefinition = {
  id: 'slack',
  label: 'Slack',
  appName: 'Slack',
  fileExtension: 'slack',
  accent: '#4a154b',
  faviconGlyph: '#',
  Surface: SlackSkin,
}
export default slack
