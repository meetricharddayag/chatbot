export function getUserId() {
  const key = 'dify-chat-user'
  let userId = window.localStorage.getItem(key)
  if (!userId) {
    userId = `web-${crypto.randomUUID()}`
    window.localStorage.setItem(key, userId)
  }
  return userId
}

export function readErrorMessage(text: string, fallback: string) {
  try {
    const payload: unknown = JSON.parse(text)
    if (typeof payload === 'object' && payload !== null && 'error' in payload) {
      const error = payload.error
      if (typeof error === 'string')
        return error
      if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string')
        return error.message
    }
    if (typeof payload === 'object' && payload !== null && 'code' in payload && 'message' in payload && typeof payload.message === 'string')
      return payload.message
    if (typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string')
      return payload.message
  }
  catch {
    if (text.trim())
      return text.trim()
  }
  return fallback
}

export function formatRelativeTime(timestamp?: number): string {
  if (!timestamp)
    return ''
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - timestamp)
  if (diff < 60)
    return 'just now'
  if (diff < 3600)
    return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)
    return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7)
    return `${Math.floor(diff / 86400)}d ago`
  return new Date(timestamp * 1000).toLocaleDateString()
}

export function formatBytes(bytes?: number): string {
  if (!bytes)
    return ''
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function fileKind(type?: string): string {
  switch (type) {
    case 'image': return 'Image'
    case 'audio': return 'Audio'
    case 'video': return 'Video'
    case 'document': return 'Document'
    default: return 'File'
  }
}

export function appModeLabel(mode: string): string {
  switch (mode) {
    case 'advanced-chat': return 'Chatflow'
    case 'agent-chat': return 'Legacy Agent'
    case 'agent': return 'Agent'
    case 'workflow': return 'Workflow'
    case 'completion': return 'Text Generator'
    case 'chat': return 'Chatbot'
    default: return 'App'
  }
}
