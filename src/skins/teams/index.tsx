import './style.css'
// Microsoft Teams (new Teams, work/school, light theme) — a channel post.
// The article arrives as a post from a digest bot in a fictional team channel,
// with reactions, a folded reply summary, two short replies and a Reply box.
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import type { DocumentRecord } from '../../core/types'
import type { SkinDefinition } from '../types'
import { articleBody, getSiteLabel } from '../../core/content'
import { MarkdownContent, SkinSwitcher } from '../shared'
import { lang } from '../../i18n'
import {
  Alert24Regular,
  Chat24Regular,
  PeopleTeam24Filled,
  CalendarLtr24Regular,
  Call24Regular,
  Cloud24Regular,
  Apps24Regular,
  Search20Regular,
  ArrowLeft20Regular,
  ArrowRight20Regular,
  MoreHorizontal20Regular,
  Filter20Regular,
  Add20Regular,
  ChevronDown16Regular,
  Video20Regular,
} from '@fluentui/react-icons'

// The purple double-person + T tile mark, drawn inline so this skin never
// touches shared files.
export function TeamsLogo({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="tm-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5a62c3" />
          <stop offset="1" stopColor="#4d55bd" />
        </linearGradient>
      </defs>
      {/* small buddy (darker purple), tucked behind on the right */}
      <circle cx="26" cy="9.4" r="2.8" fill="#5059c9" />
      <path
        d="M22.8 13.4h6.2c.6 0 1 .5 1 1v5.6c0 2.4-1.9 4.3-4.3 4.3-1.1 0-2.1-.4-2.9-1.1z"
        fill="#5059c9"
      />
      {/* main buddy (lighter purple) */}
      <circle cx="20" cy="8.2" r="3.9" fill="#7b83eb" />
      <path
        d="M13.6 14h11.5c.7 0 1.2.5 1.2 1.2v7a6.4 6.4 0 0 1-6.4 6.4c-2.7 0-5-1.7-6-4z"
        fill="#7b83eb"
      />
      {/* T tile in front */}
      <rect x="2" y="9.6" width="16.8" height="16.8" rx="2" fill="url(#tm-tile)" />
      <path d="M5.9 13.7h9.1v2.3h-3.4v9.2H9.3v-9.2H5.9z" fill="#fff" />
    </svg>
  )
}

const zh = lang === 'zh'

const RAIL: { label: string; icon: ReactNode; active?: boolean }[] = [
  { label: zh ? '动态' : 'Activity', icon: <Alert24Regular /> },
  { label: zh ? '聊天' : 'Chat', icon: <Chat24Regular /> },
  { label: zh ? '团队' : 'Teams', icon: <PeopleTeam24Filled />, active: true },
  { label: zh ? '日历' : 'Calendar', icon: <CalendarLtr24Regular /> },
  { label: zh ? '通话' : 'Calls', icon: <Call24Regular /> },
  { label: 'OneDrive', icon: <Cloud24Regular /> },
  { label: zh ? '应用' : 'Apps', icon: <Apps24Regular /> },
]

const TEAM_NAME = zh ? 'Northwind 产品团队' : 'Northwind Product Team'
const CHANNELS_BEFORE = zh ? ['常规', '公告'] : ['General', 'Announcements']
const CHANNELS_AFTER = zh ? ['设计', '工程'] : ['Design', 'Engineering']
const MEMBERS = [
  { initial: 'P', hue: 268 },
  { initial: 'A', hue: 168 },
  { initial: 'M', hue: 24 },
]

// Deterministic avatar hue from a string (same doc → same color across loads).
function hueOf(seed: string) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h % 360
}

function clockOf(d: Date) {
  const h24 = d.getHours()
  if (zh) return `${String(h24).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`
}
function dayOf(d: Date, now: Date) {
  return d.toDateString() === now.toDateString()
    ? (zh ? '今天' : 'Today')
    : (zh ? '昨天' : 'Yesterday')
}
function stampOf(d: Date, now: Date) {
  return `${dayOf(d, now)} ${clockOf(d)}`
}

// Self-drawn thin-line minimize / maximize / close (Windows caption buttons).
function TmWindowButtons() {
  return (
    <div className="tm-winbtns" aria-hidden="true">
      <span className="tm-winbtn">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1" />
        </svg>
      </span>
      <span className="tm-winbtn">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </span>
      <span className="tm-winbtn tm-winbtn-close">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth="1" />
          <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" stroke="currentColor" strokeWidth="1" />
        </svg>
      </span>
    </div>
  )
}

export function TeamsSkin({ doc }: { doc: DocumentRecord }) {
  const body = articleBody(doc)
  const site = getSiteLabel(doc.sourceUrl)
  // The digest bot that "posted" the article, derived from the document.
  const botName = doc.projectName
    ? `${doc.projectName}${zh ? ' 摘要' : ' Digest'}`
    : (zh ? '新闻摘要' : 'News Digest')
  const botInitial = botName.trim().charAt(0).toUpperCase()
  const botHue = hueOf(botName)
  // Channel name generated from the article's source site, e.g. "theonion-reads".
  const root = site.split('.').slice(-2, -1)[0] || site
  const channel = zh
    ? `${root}阅读`
    : `${root.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-reads`.slice(0, 26)

  // Dynamic timestamps: the post landed ~47 minutes ago, replies followed.
  const times = useMemo(() => {
    const now = new Date()
    const post = new Date(now.getTime() - 47 * 60000)
    const reply1 = new Date(now.getTime() - 31 * 60000)
    const reply2 = new Date(now.getTime() - 12 * 60000)
    return {
      day: dayOf(post, now),
      post: stampOf(post, now),
      reply1: stampOf(reply1, now),
      reply2: stampOf(reply2, now),
    }
  }, [])

  return (
    <div className="teams">
      <div className="tm-titlebar">
        <div className="tm-title-left">
          <button type="button" className="tm-navbtn" aria-label={zh ? '后退' : 'Go back'}>
            <ArrowLeft20Regular />
          </button>
          <button type="button" className="tm-navbtn is-dim" aria-label={zh ? '前进' : 'Go forward'}>
            <ArrowRight20Regular />
          </button>
        </div>
        <div className="tm-search">
          <Search20Regular />
          <span>{zh ? '搜索 (Ctrl+E)' : 'Search (Ctrl+E)'}</span>
        </div>
        <div className="tm-title-right">
          <button type="button" className="tm-titlebar-ic" aria-label={zh ? '设置及更多' : 'Settings and more'}>
            <MoreHorizontal20Regular />
          </button>
          <span className="tm-me">
            M
            <em className="tm-presence" />
          </span>
          <TmWindowButtons />
        </div>
      </div>

      <div className="tm-body">
        <nav className="tm-rail">
          {RAIL.map((item) => (
            <button
              key={item.label}
              type="button"
              className={item.active ? 'tm-rail-btn is-active' : 'tm-rail-btn'}
            >
              {item.icon}
              <span className="tm-rail-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <aside className="tm-side">
          <div className="tm-side-head">
            <b>{zh ? '团队' : 'Teams'}</b>
            <span className="tm-side-icons">
              <span className="tm-side-icon" aria-hidden="true">
                <Filter20Regular />
              </span>
              <span className="tm-side-icon" aria-hidden="true">
                <Add20Regular />
              </span>
            </span>
          </div>
          <div className="tm-side-scroll">
            <div className="tm-team">
              <ChevronDown16Regular className="tm-team-chev" />
              <span className="tm-team-av">NP</span>
              <b>{TEAM_NAME}</b>
            </div>
            <div className="tm-chans">
              {CHANNELS_BEFORE.map((c) => (
                <span key={c} className="tm-chan">
                  {c}
                </span>
              ))}
              <span className="tm-chan is-active">{channel}</span>
              {CHANNELS_AFTER.map((c) => (
                <span key={c} className="tm-chan">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <main className="tm-main">
          <header className="tm-chan-head">
            <div className="tm-chan-title">
              <b>{channel}</b>
            </div>
            <div className="tm-chan-actions">
              <span className="tm-members" aria-hidden="true">
                {MEMBERS.map((m) => (
                  <span key={m.initial} style={{ background: `hsl(${m.hue} 45% 45%)` }}>
                    {m.initial}
                  </span>
                ))}
                <em>12</em>
              </span>
              <button type="button" className="tm-meet">
                <Video20Regular /> {zh ? '开会' : 'Meet'} <ChevronDown16Regular />
              </button>
              <button
                type="button"
                className="tm-chan-more"
                data-appmenu="file"
                aria-label={zh ? '更多选项' : 'More options'}
              >
                <MoreHorizontal20Regular />
              </button>
            </div>
          </header>

          <div className="tm-tabs">
            <span className="tm-tab is-active">{zh ? '帖子' : 'Posts'}</span>
            <span className="tm-tab">{zh ? '文件' : 'Files'}</span>
            <span className="tm-tab">{zh ? '笔记' : 'Notes'}</span>
            <span className="tm-tab-add" aria-hidden="true">
              <Add20Regular />
            </span>
          </div>

          <div className="tm-stream">
            <div className="tm-stream-col">
              <SkinSwitcher className="tm-switch" />
              <div className="tm-day">
                <span>{times.day}</span>
              </div>

              <article className="tm-post">
                <div className="tm-post-main">
                  <div className="tm-post-head">
                    <span className="tm-av" style={{ background: `hsl(${botHue} 45% 45%)` }}>
                      {botInitial}
                    </span>
                    <div className="tm-post-who">
                      <b>{botName}</b>
                      <i className="tm-bot">{zh ? '机器人' : 'BOT'}</i>
                      <span className="tm-time">{times.post}</span>
                    </div>
                  </div>
                  <h1 className="tm-post-title">{doc.title}</h1>
                  <div className="tm-post-body markdown-body">
                    <MarkdownContent markdown={body} baseUrl={doc.sourceUrl} />
                  </div>
                  <div className="tm-reacts">
                    <span className="tm-react">👍 4</span>
                    <span className="tm-react">💡 2</span>
                  </div>
                </div>

                <div className="tm-fold">
                  <span className="tm-fold-avs" aria-hidden="true">
                    <span style={{ background: 'hsl(268 45% 50%)' }}>P</span>
                    <span style={{ background: 'hsl(168 45% 38%)' }}>A</span>
                  </span>
                  {zh ? 'Priya 和 Alex 的 3 条回复' : '3 replies from Priya and Alex'}
                </div>

                <div className="tm-reply">
                  <span className="tm-av tm-av-sm" style={{ background: 'hsl(268 45% 50%)' }}>
                    P
                  </span>
                  <div className="tm-reply-main">
                    <div className="tm-reply-who">
                      <b>Priya N.</b>
                      <span className="tm-time">{times.reply1}</span>
                    </div>
                    <div className="tm-reply-text">{zh ? '发现得不错，分享给团队了' : 'Great find, sharing with the team'}</div>
                  </div>
                </div>
                <div className="tm-reply">
                  <span className="tm-av tm-av-sm" style={{ background: 'hsl(168 45% 38%)' }}>
                    A
                  </span>
                  <div className="tm-reply-main">
                    <div className="tm-reply-who">
                      <b>Alex R.</b>
                      <span className="tm-time">{times.reply2}</span>
                    </div>
                    <div className="tm-reply-text">{zh ? '已收藏 👍' : 'Bookmarked 👍'}</div>
                  </div>
                </div>

                <div className="tm-replybox">
                  <div className="tm-replybox-inner">{zh ? '回复' : 'Reply'}</div>
                </div>
              </article>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

const teams: SkinDefinition = {
  id: 'teams',
  label: 'Teams',
  appName: 'Microsoft Teams',
  fileExtension: 'msg',
  accent: '#5b5fc7',
  faviconGlyph: 'T',
  Surface: TeamsSkin,
  Logo: TeamsLogo,
}
export default teams
