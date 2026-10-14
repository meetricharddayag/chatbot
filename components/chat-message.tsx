'use client'

import { useState } from 'react'
import {
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Loader2,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  Wrench,
} from 'lucide-react'
import type { AgentThought, ChatMessage } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Markdown } from './markdown'
import { MessageFiles } from './attachments'

function AgentThoughts({ thoughts }: { thoughts: AgentThought[] }) {
  const [open, setOpen] = useState(false)
  if (!thoughts?.length)
    return null

  return (
    <div className="agent-thoughts">
      <button type="button" className="agent-thoughts-toggle" onClick={() => setOpen(current => !current)}>
        <Wrench size={13} />
        <span>{thoughts.length} reasoning step{thoughts.length === 1 ? '' : 's'}</span>
        <ChevronDown size={13} className={cn('agent-thoughts-chevron', open && 'agent-thoughts-chevron-open')} />
      </button>
      {open && (
        <div className="agent-thoughts-list">
          {thoughts.map(thought => (
            <div className="agent-thought" key={thought.id ?? thought.position}>
              {thought.tool && <div className="agent-thought-tool"><span>Tool</span> {thought.tool}</div>}
              {thought.thought && <p className="agent-thought-text">{thought.thought}</p>}
              {thought.observation && (
                <pre className="agent-thought-observation">{thought.observation}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Sources({ message }: { message: ChatMessage }) {
  const resources = message.retrieverResources ?? []
  const [open, setOpen] = useState(false)
  if (!resources.length)
    return null

  return (
    <div className="sources">
      <button type="button" className="sources-toggle" onClick={() => setOpen(current => !current)}>
        <BookOpen size={13} />
        <span>{resources.length} source{resources.length === 1 ? '' : 's'}</span>
        <ChevronDown size={13} className={cn('sources-chevron', open && 'sources-chevron-open')} />
      </button>
      {open && (
        <div className="sources-list">
          {resources.map((resource, index) => (
            <div className="source-item" key={resource.id ?? index}>
              <div className="source-title">
                {resource.document_name
                  ? `${resource.dataset_name ?? 'Knowledge'} · ${resource.document_name}`
                  : resource.dataset_name ?? 'Knowledge'}
              </div>
              {resource.content && <p className="source-content">{resource.content}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ChatMessageItem({
  message,
  isStreaming,
  isLastAssistant,
  copiedId,
  speakingId,
  suggestedQuestions,
  onCopy,
  onSpeak,
  onFeedback,
  onSuggest,
  onRegenerate,
  canRegenerate,
}: {
  message: ChatMessage
  isStreaming: boolean
  isLastAssistant: boolean
  copiedId: string | null
  speakingId: string | null
  suggestedQuestions: string[]
  onCopy: (message: ChatMessage) => void
  onSpeak: (message: ChatMessage) => void
  onFeedback: (message: ChatMessage, rating: 'like' | 'dislike') => void
  onSuggest: (question: string) => void
  onRegenerate: () => void
  canRegenerate: boolean
}) {
  const isUser = message.role === 'user'
  const thinking = isLastAssistant && !message.content && isStreaming
  const error = message.status === 'error' && message.error

  return (
    <article className={cn('message-row', isUser ? 'message-user' : 'message-assistant')}>
      {!isUser && (
        <div className="message-avatar">
          {thinking ? <Loader2 size={14} className="message-avatar-spin" /> : '✦'}
        </div>
      )}
      <div className="message-body">
        {message.files && message.files.length > 0 && <MessageFiles files={message.files} />}

        {thinking
          ? <span className="thinking-indicator"><span /><span /><span /></span>
          : isUser
            ? <p className="message-content">{message.content}</p>
            : (
                <Markdown className="message-content">{message.content}</Markdown>
              )}

        {error && <p className="message-error" role="alert">{error}</p>}

        {!isUser && <AgentThoughts thoughts={message.agentThoughts ?? []} />}
        {!isUser && <Sources message={message} />}

        {!isUser && message.content && !isStreaming && (
          <div className="message-actions">
            <button type="button" className="message-action" onClick={() => onCopy(message)} aria-label="Copy response">
              {copiedId === message.id ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button
              type="button"
              className={cn('message-action', message.feedback?.rating === 'like' && 'message-action-active')}
              onClick={() => onFeedback(message, 'like')}
              aria-label="Good response"
            >
              <ThumbsUp size={14} />
            </button>
            <button
              type="button"
              className={cn('message-action', message.feedback?.rating === 'dislike' && 'message-action-active')}
              onClick={() => onFeedback(message, 'dislike')}
              aria-label="Poor response"
            >
              <ThumbsDown size={14} />
            </button>
            <button
              type="button"
              className={cn('message-action', speakingId === message.id && 'message-action-active')}
              onClick={() => onSpeak(message)}
              aria-label="Read aloud"
            >
              <Volume2 size={14} />
            </button>
            {isLastAssistant && canRegenerate && (
              <button type="button" className="message-action" onClick={onRegenerate} aria-label="Regenerate response">
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        )}

        {!isUser && message.usage && message.usage.total_tokens !== undefined && !isStreaming && (
          <div className="message-usage">
            {message.usage.total_tokens} tokens{message.usage.latency !== undefined ? ` · ${message.usage.latency.toFixed(1)}s` : ''}
          </div>
        )}

        {isLastAssistant && suggestedQuestions.length > 0 && !isStreaming && (
          <div className="suggested-questions">
            {suggestedQuestions.map(question => (
              <button key={question} type="button" className="suggested-question" onClick={() => onSuggest(question)}>
                {question}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
