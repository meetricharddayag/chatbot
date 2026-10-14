'use client'

import { useMemo, useState } from 'react'
import {
  Bot,
  CircleHelp,
  Command,
  LifeBuoy,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import type { Conversation, DifyApp } from '@/lib/types'
import { appModeLabel, formatRelativeTime } from '@/lib/client'
import { cn } from '@/lib/utils'

function AppIcon({ app }: { app: DifyApp }) {
  if (app.icon) {
    return (
      <span className="chatbot-icon chatbot-icon-emoji" style={{ background: app.icon_background ?? '#f4f6f0' }}>
        {app.icon}
      </span>
    )
  }
  return <span className="chatbot-icon"><Bot size={15} /></span>
}

export function Sidebar({
  open,
  onClose,
  apps,
  appsLoading,
  appsError,
  selectedAppId,
  onSelectApp,
  onRefreshApps,
  onNewChat,
  conversations,
  conversationsLoading,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
}: {
  open: boolean
  onClose: () => void
  apps: DifyApp[]
  appsLoading: boolean
  appsError: string | null
  selectedAppId: string | null
  onSelectApp: (app: DifyApp) => void
  onRefreshApps: () => void
  onNewChat: () => void
  conversations: Conversation[]
  conversationsLoading: boolean
  activeConversationId: string | null
  onSelectConversation: (conversation: Conversation) => void
  onDeleteConversation: (conversation: Conversation) => void
  onRenameConversation: (conversation: Conversation, name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q)
      return apps
    return apps.filter(app => app.name.toLowerCase().includes(q) || appModeLabel(app.mode).toLowerCase().includes(q))
  }, [apps, query])

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q)
      return conversations
    return conversations.filter(conversation => conversation.name.toLowerCase().includes(q))
  }, [conversations, query])

  function beginRename(conversation: Conversation) {
    setMenuFor(null)
    setRenaming(conversation.id)
    setRenameValue(conversation.name)
  }

  function commitRename(conversation: Conversation) {
    const name = renameValue.trim()
    setRenaming(null)
    if (name && name !== conversation.name)
      onRenameConversation(conversation, name)
  }

  return (
    <aside className={cn('sidebar', open && 'sidebar-open')}>
      <div className="sidebar-top">
        <a href="/" className="brand" aria-label="Dify Chat home" onClick={(event) => { event.preventDefault(); onNewChat() }}>
          <span className="brand-mark"><Sparkles size={17} strokeWidth={2.4} /></span>
          <span className="brand-name">dify<span>chat</span></span>
        </a>
        <button type="button" className="sidebar-close md:hidden" aria-label="Close menu" onClick={onClose}>
          <X size={17} />
        </button>
      </div>

      <button type="button" className="new-chat-button" onClick={onNewChat}>
        <Plus size={16} />
        New chat
        <span className="shortcut"><Command size={11} /> K</span>
      </button>

      <div className="sidebar-search">
        <Search size={14} />
        <input
          type="text"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search chatbots & chats"
          aria-label="Search chatbots and chats"
        />
      </div>

      <div className="sidebar-scroll">
        <div className="sidebar-section">
          <div className="chatbots-heading">
            <p className="sidebar-label">CHATBOTS</p>
            <button
              className="refresh-chatbots"
              type="button"
              aria-label="Refresh chatbot list"
              title="Refresh chatbot list"
              disabled={appsLoading}
              onClick={onRefreshApps}
            >
              <RefreshCw size={13} />
            </button>
          </div>
          {appsLoading
            ? <p className="chatbots-message">Loading your chatbots…</p>
            : appsError
              ? <p className="chatbots-message chatbots-error" role="alert">{appsError}</p>
              : filteredApps.length === 0
                ? <p className="chatbots-message">No chat apps found in your Dify workspace.</p>
                : (
                    <div className="chatbot-list">
                      {filteredApps.map(app => (
                        <button
                          key={app.id}
                          type="button"
                          className={cn('chatbot-row', app.id === selectedAppId && 'chatbot-row-active')}
                          aria-current={app.id === selectedAppId ? 'page' : undefined}
                          onClick={() => onSelectApp(app)}
                        >
                          <AppIcon app={app} />
                          <span className="chatbot-copy">
                            <strong>{app.name}</strong>
                            <small>{appModeLabel(app.mode)}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
        </div>

        <div className="sidebar-section">
          <div className="chatbots-heading">
            <p className="sidebar-label">CONVERSATIONS</p>
          </div>
          {!selectedAppId
            ? <p className="chatbots-message">Select a chatbot to see its chats.</p>
            : conversationsLoading
              ? <p className="chatbots-message">Loading conversations…</p>
              : filteredConversations.length === 0
                ? <p className="chatbots-message">No conversations yet.</p>
                : (
                    <div className="conversation-list">
                      {filteredConversations.map(conversation => (
                        <div
                          key={conversation.id}
                          className={cn('conversation-row', conversation.id === activeConversationId && 'conversation-row-active')}
                        >
                          {renaming === conversation.id
                            ? (
                                <input
                                  className="conversation-rename-input"
                                  value={renameValue}
                                  autoFocus
                                  onChange={event => setRenameValue(event.target.value)}
                                  onBlur={() => commitRename(conversation)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter')
                                      commitRename(conversation)
                                    if (event.key === 'Escape')
                                      setRenaming(null)
                                  }}
                                />
                              )
                            : (
                                <button
                                  type="button"
                                  className="conversation-button"
                                  aria-current={conversation.id === activeConversationId ? 'page' : undefined}
                                  onClick={() => onSelectConversation(conversation)}
                                >
                                  <span className="conversation-icon"><MessageSquare size={14} /></span>
                                  <span className="conversation-copy">
                                    <strong>{conversation.name || 'New chat'}</strong>
                                    <small>{formatRelativeTime(conversation.updated_at)}</small>
                                  </span>
                                </button>
                              )}
                          <div className="conversation-menu-wrap">
                            <button
                              type="button"
                              className="conversation-menu-trigger"
                              aria-label="Conversation actions"
                              onClick={() => setMenuFor(current => current === conversation.id ? null : conversation.id)}
                            >
                              <MoreHorizontal size={14} />
                            </button>
                            {menuFor === conversation.id && (
                              <div className="conversation-menu">
                                <button type="button" onClick={() => beginRename(conversation)}>
                                  <Pencil size={13} /> Rename
                                </button>
                                <button type="button" className="conversation-menu-danger" onClick={() => { setMenuFor(null); onDeleteConversation(conversation) }}>
                                  <Trash2 size={13} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
        </div>
      </div>

      <div className="sidebar-bottom">
        <a className="sidebar-link" href="https://docs.dify.ai/" target="_blank" rel="noreferrer">
          <CircleHelp size={16} /> Help center
        </a>
        <a className="sidebar-link" href="https://github.com/langgenius/dify" target="_blank" rel="noreferrer">
          <LifeBuoy size={16} /> Dify community
        </a>
        <div className="account-row">
          <div className="account-avatar">Y</div>
          <span className="account-name">Your workspace</span>
          <button className="account-menu" type="button" aria-label="Workspace menu"><Menu size={17} /></button>
        </div>
      </div>
    </aside>
  )
}
