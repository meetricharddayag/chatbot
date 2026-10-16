'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Menu, Sparkles, X } from 'lucide-react'
import type {
  AgentThought,
  AppParameters,
  ChatFiles,
  ChatMessage,
  Conversation,
  DifyApp,
  MessageFile,
  PendingAttachment,
  RetrieverResource,
  Usage,
} from '@/lib/types'
import { appModeLabel, getUserId, readErrorMessage } from '@/lib/client'
import { Sidebar } from '@/components/sidebar'
import { Welcome } from '@/components/welcome'
import { Composer } from '@/components/composer'
import { ChatMessageItem } from '@/components/chat-message'
import { FeedbackModal } from '@/components/feedback-modal'

type DifyEvent = {
  event?: string
  answer?: string
  conversation_id?: string
  message_id?: string
  task_id?: string
  message?: string
  metadata?: { usage?: Usage; retriever_resources?: RetrieverResource[] }
  id?: string
  position?: number
  thought?: string
  tool?: string
  tool_input?: string
  observation?: string
  type?: string
  belongs_to?: string
  url?: string
  created_at?: number
}

function guessKind(file: File): PendingAttachment['kind'] {
  if (file.type.startsWith('image/'))
    return 'image'
  if (file.type.startsWith('audio/'))
    return 'audio'
  if (file.type.startsWith('video/'))
    return 'video'
  return 'document'
}

function upsertThought(list: AgentThought[], thought: AgentThought): AgentThought[] {
  const key = thought.id ?? String(thought.position)
  const index = list.findIndex(item => (item.id ?? String(item.position)) === key)
  if (index >= 0) {
    const next = [...list]
    next[index] = { ...next[index], ...thought }
    return next
  }
  return [...list, thought]
}

export default function ChatPage() {
  const [apps, setApps] = useState<DifyApp[]>([])
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [appsLoading, setAppsLoading] = useState(true)
  const [appsError, setAppsError] = useState<string | null>(null)
  const [appRefresh, setAppRefresh] = useState(0)

  const [parameters, setParameters] = useState<AppParameters | null>(null)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(false)

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)

  const [input, setInput] = useState('')
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])

  const [isStreaming, setIsStreaming] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [feedbackTarget, setFeedbackTarget] = useState<ChatMessage | null>(null)
  const [suggested, setSuggested] = useState<string[]>([])
  const [account, setAccount] = useState<{ name: string; avatarUrl: string | null } | null>(null)

  const [menuOpen, setMenuOpen] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const taskIdRef = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const selectedApp = useMemo(
    () => apps.find(app => app.id === selectedAppId) ?? null,
    [apps, selectedAppId],
  )

  const canAttach = useMemo(() => {
    const upload = parameters?.file_upload
    if (!upload)
      return true
    const image = upload.image?.enabled ?? false
    const document = upload.document?.enabled ?? false
    const audio = upload.audio?.enabled ?? false
    const video = upload.video?.enabled ?? false
    return image || document || audio || video
  }, [parameters])

  const canTranscribe = parameters?.speech_to_text?.enabled === true

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => () => abortRef.current?.abort(), [])

  // Load apps
  useEffect(() => {
    const controller = new AbortController()
    async function loadApps() {
      try {
        const response = await fetch('/api/apps', { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) {
          const details = await response.text()
          throw new Error(readErrorMessage(details, `Could not load Dify chatbots (${response.status}).`))
        }
        const payload: unknown = await response.json()
        if (typeof payload !== 'object' || payload === null || !('apps' in payload) || !Array.isArray(payload.apps))
          throw new Error('Dify returned an invalid chatbot list.')

        const loadedApps = (payload.apps as unknown[]).filter((app): app is DifyApp =>
          typeof app === 'object'
          && app !== null
          && 'id' in app
          && typeof app.id === 'string'
          && 'name' in app
          && typeof app.name === 'string'
          && 'mode' in app
          && typeof app.mode === 'string',
        )
        setApps(loadedApps)
        setSelectedAppId(current => loadedApps.some(app => app.id === current) ? current : loadedApps[0]?.id ?? null)
      }
      catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError')
          return
        setAppsError(caught instanceof Error ? caught.message : 'Could not load Dify chatbots.')
      }
      finally {
        if (!controller.signal.aborted)
          setAppsLoading(false)
      }
    }

    void loadApps()
    return () => controller.abort()
  }, [appRefresh])

  // Load the signed-in user's profile
  useEffect(() => {
    const controller = new AbortController()
    async function loadAccount() {
      try {
        const response = await fetch('/api/me', { signal: controller.signal, cache: 'no-store' })
        if (!response.ok)
          return
        const payload: unknown = await response.json()
        if (typeof payload === 'object' && payload !== null && 'name' in payload && typeof payload.name === 'string') {
          setAccount({
            name: payload.name,
            avatarUrl: 'avatarUrl' in payload && typeof payload.avatarUrl === 'string' ? payload.avatarUrl : null,
          })
        }
      }
      catch {
        // Ignore; the sidebar falls back to a generic label.
      }
    }

    void loadAccount()
    return () => controller.abort()
  }, [])

  const loadConversations = useCallback(async (appId: string) => {
    setConversationsLoading(true)
    try {
      const response = await fetch(
        `/api/conversations?app_id=${encodeURIComponent(appId)}&user=${encodeURIComponent(getUserId())}`,
        { cache: 'no-store' },
      )
      if (!response.ok)
        throw new Error(readErrorMessage(await response.text(), 'Could not load conversations.'))
      const payload: unknown = await response.json()
      if (typeof payload === 'object' && payload !== null && 'data' in payload && Array.isArray(payload.data)) {
        setConversations((payload.data as unknown[]).filter((item): item is Conversation =>
          typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'string',
        ))
      }
    }
    catch {
      // Conversations are non-critical; ignore failures quietly.
    }
    finally {
      setConversationsLoading(false)
    }
  }, [])

  // Load parameters + conversations when the selected app changes
  useEffect(() => {
    setParameters(null)
    setConversations([])
    setActiveConversationId(null)
    setMessages([])
    setInput('')
    setInputValues({})
    setAttachments([])
    setError(null)
    setSuggested([])

    if (!selectedAppId)
      return
    const appId = selectedAppId

    const controller = new AbortController()
    async function loadParameters() {
      try {
        const response = await fetch(`/api/app/${encodeURIComponent(appId)}/parameters`, {
          signal: controller.signal,
          cache: 'no-store',
        })
        if (!response.ok)
          throw new Error(readErrorMessage(await response.text(), 'Could not load app settings.'))
        const payload: unknown = await response.json()
        if (typeof payload === 'object' && payload !== null)
          setParameters(payload as AppParameters)
      }
      catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError')
          return
        setError(caught instanceof Error ? caught.message : 'Could not load app settings.')
      }
    }

    void loadParameters()
    void loadConversations(appId)
    return () => controller.abort()
  }, [selectedAppId, loadConversations])

  const loadMessages = useCallback(async (conversationId: string, appId: string) => {
    setMessagesLoading(true)
    try {
      const response = await fetch(
        `/api/conversations/${encodeURIComponent(conversationId)}/messages?app_id=${encodeURIComponent(appId)}&user=${encodeURIComponent(getUserId())}`,
        { cache: 'no-store' },
      )
      if (!response.ok)
        throw new Error(readErrorMessage(await response.text(), 'Could not load the conversation.'))
      const payload: unknown = await response.json()
      if (typeof payload !== 'object' || payload === null || !('data' in payload) || !Array.isArray(payload.data)) {
        setMessages([])
        return
      }

      const items = payload.data as Array<Record<string, unknown>>
      const history: ChatMessage[] = []
      items.reverse().forEach((item, index) => {
        const id = typeof item.id === 'string' ? item.id : `hist-${index}`
        const query = typeof item.query === 'string' ? item.query : ''
        const answer = typeof item.answer === 'string' ? item.answer : ''
        const files = Array.isArray(item.message_files) ? item.message_files as MessageFile[] : []
        const userFiles = files.filter(file => file.belongs_to !== 'assistant')
        const assistantFiles = files.filter(file => file.belongs_to === 'assistant')
        const feedback = typeof item.feedback === 'object' && item.feedback !== null
          ? (item.feedback as { rating?: 'like' | 'dislike' })
          : undefined

        history.push({
          id: `${id}-user`,
          role: 'user',
          content: query,
          files: userFiles,
        })
        history.push({
          id: `${id}-assistant`,
          role: 'assistant',
          content: answer,
          messageId: id,
          files: assistantFiles,
          agentThoughts: Array.isArray(item.agent_thoughts) ? item.agent_thoughts as AgentThought[] : [],
          retrieverResources: Array.isArray(item.retriever_resources) ? item.retriever_resources as RetrieverResource[] : [],
          feedback,
          status: item.status === 'error' ? 'error' : 'normal',
          error: typeof item.error === 'string' ? item.error : undefined,
        })
      })
      setMessages(history)
    }
    catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the conversation.')
    }
    finally {
      setMessagesLoading(false)
    }
  }, [])

  function selectApp(app: DifyApp) {
    if (app.id === selectedAppId)
      return
    abortRef.current?.abort()
    setSelectedAppId(app.id)
    setMenuOpen(false)
  }

  function selectConversation(conversation: Conversation) {
    if (conversation.id === activeConversationId)
      return
    abortRef.current?.abort()
    setActiveConversationId(conversation.id)
    setError(null)
    setSuggested([])
    if (conversation.inputs && typeof conversation.inputs === 'object') {
      const values: Record<string, string> = {}
      Object.entries(conversation.inputs).forEach(([key, value]) => {
        values[key] = String(value ?? '')
      })
      setInputValues(values)
    }
    if (selectedAppId)
      void loadMessages(conversation.id, selectedAppId)
  }

  function newChat() {
    abortRef.current?.abort()
    setActiveConversationId(null)
    setMessages([])
    setInput('')
    setAttachments([])
    setError(null)
    setSuggested([])
    setIsStreaming(false)
    setMenuOpen(false)
  }

  async function logout() {
    try {
      await fetch('/api/logout', { method: 'POST' })
    }
    catch {
      // Ignore network errors; still reload below.
    }
    window.location.assign('/')
  }

  async function deleteConversation(conversation: Conversation) {
    if (!selectedAppId)
      return
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversation.id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: selectedAppId, user: getUserId() }),
      })
      if (!response.ok && response.status !== 204)
        throw new Error(readErrorMessage(await response.text(), 'Could not delete the conversation.'))
      setConversations(current => current.filter(item => item.id !== conversation.id))
      if (activeConversationId === conversation.id)
        newChat()
    }
    catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete the conversation.')
    }
  }

  async function renameConversation(conversation: Conversation, name: string) {
    if (!selectedAppId)
      return
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversation.id)}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: selectedAppId, user: getUserId(), name }),
      })
      if (!response.ok)
        throw new Error(readErrorMessage(await response.text(), 'Could not rename the conversation.'))
      setConversations(current => current.map(item => item.id === conversation.id ? { ...item, name } : item))
    }
    catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not rename the conversation.')
    }
  }

  async function uploadFile(file: File, attachmentId: string) {
    if (!selectedAppId)
      return
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('user', getUserId())
      form.set('app_id', selectedAppId)
      const response = await fetch('/api/files/upload', { method: 'POST', body: form })
      if (!response.ok)
        throw new Error(readErrorMessage(await response.text(), 'Could not upload the file.'))
      const payload: unknown = await response.json()
      if (typeof payload === 'object' && payload !== null && 'id' in payload && typeof payload.id === 'string') {
        const sourceUrl = 'source_url' in payload && typeof payload.source_url === 'string' ? payload.source_url : undefined
        setAttachments(current => current.map(attachment =>
          attachment.id === attachmentId
            ? { ...attachment, uploadFileId: payload.id as string, url: sourceUrl, uploading: false }
            : attachment,
        ))
      }
      else {
        throw new Error('Dify did not return an uploaded file id.')
      }
    }
    catch (caught) {
      setAttachments(current => current.map(attachment =>
        attachment.id === attachmentId
          ? { ...attachment, uploading: false, error: caught instanceof Error ? caught.message : 'Upload failed.' }
          : attachment,
      ))
    }
  }

  function handleAttachFiles(files: File[]) {
    if (!selectedAppId)
      return
    const next = files.map((file): PendingAttachment => {
      const kind = guessKind(file)
      const id = crypto.randomUUID()
      const attachment: PendingAttachment = {
        id,
        kind,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        objectUrl: kind === 'image' || kind === 'video' || kind === 'audio' ? URL.createObjectURL(file) : undefined,
        uploading: true,
      }
      void uploadFile(file, id)
      return attachment
    })
    setAttachments(current => [...current, ...next])
  }

  function removeAttachment(id: string) {
    setAttachments(current => current.filter(attachment => attachment.id !== id))
  }

  async function streamResponse(assistantId: string, query: string, files: ChatFiles[], conversationId?: string) {
    if (!selectedAppId)
      return

    const controller = new AbortController()
    abortRef.current = controller
    taskIdRef.current = null
    setIsStreaming(true)
    setError(null)
    setSuggested([])

    const patchMessage = (patch: Partial<ChatMessage>) => {
      setMessages(current => current.map(message => message.id === assistantId ? { ...message, ...patch } : message))
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          user: getUserId(),
          app_id: selectedAppId,
          inputs: inputValues,
          ...(files.length ? { files } : {}),
          ...(conversationId ? { conversation_id: conversationId } : {}),
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const details = await response.text()
        throw new Error(readErrorMessage(details, `Chat request failed (${response.status}).`))
      }
      if (!response.body)
        throw new Error('Dify returned an empty response stream.')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let answer = ''
      let agentThoughts: AgentThought[] = []
      let messageFiles: MessageFile[] = []
      let retrieverResources: RetrieverResource[] = []
      let usage: Usage | undefined
      let messageId: string | undefined
      let newConversationId: string | undefined

      const processEvent = (frame: string) => {
        const data = frame
          .split(/\r?\n/)
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trimStart())
          .join('\n')
        if (!data)
          return

        let event: DifyEvent
        try {
          event = JSON.parse(data) as DifyEvent
        }
        catch {
          return
        }

        if (event.conversation_id)
          newConversationId = event.conversation_id
        if (event.task_id)
          taskIdRef.current = event.task_id

        switch (event.event) {
          case 'message':
          case 'agent_message':
            if (typeof event.answer === 'string') {
              if (event.event === 'message' && selectedApp?.mode === 'agent')
                answer = event.answer
              else
                answer += event.answer
              patchMessage({ content: answer })
            }
            break
          case 'message_replace':
            if (typeof event.answer === 'string') {
              answer = event.answer
              patchMessage({ content: answer })
            }
            break
          case 'agent_thought':
            agentThoughts = upsertThought(agentThoughts, {
              id: event.id,
              position: event.position,
              thought: event.thought,
              tool: event.tool,
              tool_input: event.tool_input,
              observation: event.observation,
            })
            patchMessage({ agentThoughts })
            break
          case 'message_file':
            messageFiles = [...messageFiles, {
              id: event.id,
              type: event.type,
              belongs_to: event.belongs_to,
              url: event.url,
            }]
            patchMessage({ files: messageFiles })
            break
          case 'message_end':
            messageId = event.message_id
            usage = event.metadata?.usage
            retrieverResources = event.metadata?.retriever_resources ?? []
            patchMessage({ messageId, usage, retrieverResources, status: 'normal' })
            break
          case 'error':
            patchMessage({ status: 'error', error: event.message || 'Dify could not complete this response.' })
            break
          case 'ping':
            break
          default:
            break
        }
      }

      while (true) {
        const { value, done } = await reader.read()
        if (value)
          buffer += decoder.decode(value, { stream: !done })
        const frames = buffer.split(/\r?\n\r?\n/)
        buffer = frames.pop() ?? ''
        for (const frame of frames)
          processEvent(frame)
        if (done)
          break
      }
      if (buffer.trim())
        processEvent(buffer)

      if (newConversationId)
        setActiveConversationId(newConversationId)

      if (messageId && parameters?.suggested_questions_after_answer?.enabled)
        void fetchSuggested(messageId)
      if (selectedAppId)
        void loadConversations(selectedAppId)
    }
    catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError')
        return
      const message = caught instanceof Error ? caught.message : 'Something went wrong while contacting Dify.'
      patchMessage({ status: 'error', error: message })
      setError(message)
    }
    finally {
      abortRef.current = null
      taskIdRef.current = null
      setIsStreaming(false)
    }
  }

  function sendMessage(rawText?: string) {
    const query = (rawText ?? input).trim()
    if (!query || isStreaming)
      return
    if (!selectedAppId) {
      setError('Select a Dify chatbot before sending a message.')
      return
    }

    const readyAttachments = attachments.filter(attachment => attachment.uploadFileId)
    const files: ChatFiles[] = readyAttachments.map(attachment => ({
      type: attachment.kind,
      transfer_method: 'local_file',
      upload_file_id: attachment.uploadFileId as string,
    }))

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      files: readyAttachments.map(attachment => ({
        type: attachment.kind,
        upload_file_id: attachment.uploadFileId,
        filename: attachment.name,
        url: attachment.objectUrl ?? attachment.url,
        mime_type: attachment.mimeType,
        size: attachment.size,
      })),
    }
    const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', status: 'streaming' }

    setMessages(current => [...current, userMessage, assistantMessage])
    setInput('')
    setAttachments([])
    setError(null)

    void streamResponse(assistantMessage.id, query, files, activeConversationId ?? undefined)
  }

  function regenerate() {
    if (isStreaming || !selectedAppId)
      return
    const lastUserIndex = messages.reduce((found, message, index) => message.role === 'user' ? index : found, -1)
    if (lastUserIndex < 0)
      return

    const lastUser = messages[lastUserIndex]
    const trimmed = messages.slice(0, lastUserIndex + 1)
    const files: ChatFiles[] = (lastUser.files ?? [])
      .filter(file => file.upload_file_id)
      .map(file => ({
        type: (file.type as ChatFiles['type']) ?? 'document',
        transfer_method: 'local_file',
        upload_file_id: file.upload_file_id as string,
      }))

    const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', status: 'streaming' }
    setMessages([...trimmed, assistantMessage])
    setError(null)

    void streamResponse(assistantMessage.id, lastUser.content, files, activeConversationId ?? undefined)
  }

  async function stopGeneration() {
    const taskId = taskIdRef.current
    if (taskId && selectedAppId) {
      void fetch('/api/chat/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: selectedAppId, user: getUserId(), task_id: taskId }),
      })
    }
    abortRef.current?.abort()
  }

  async function copyMessage(message: ChatMessage) {
    await navigator.clipboard.writeText(message.content)
    setCopiedId(message.id)
    window.setTimeout(() => setCopiedId(null), 1500)
  }

  async function postFeedback(message: ChatMessage, rating: 'like' | 'dislike' | null, content?: string) {
    if (!message.messageId || !selectedAppId)
      return
    setMessages(current => current.map(item => item.id === message.id ? { ...item, feedback: { rating } } : item))
    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(message.messageId)}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: selectedAppId,
          user: getUserId(),
          rating,
          ...(content ? { content } : {}),
        }),
      })
      if (!response.ok)
        throw new Error(readErrorMessage(await response.text(), 'Could not save feedback.'))
    }
    catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save feedback.')
    }
  }

  function feedback(message: ChatMessage, rating: 'like' | 'dislike') {
    if (rating === 'dislike') {
      setFeedbackTarget(message)
      return
    }
    const next = message.feedback?.rating === 'like' ? null : 'like'
    void postFeedback(message, next)
  }

  function submitDislikeFeedback(content: string) {
    if (!feedbackTarget)
      return
    void postFeedback(feedbackTarget, 'dislike', content)
    setFeedbackTarget(null)
  }

  async function speak(message: ChatMessage) {
    if (!selectedAppId)
      return
    if (speakingId === message.id) {
      audioRef.current?.pause()
      setSpeakingId(null)
      return
    }
    try {
      const response = await fetch('/api/text-to-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: selectedAppId,
          user: getUserId(),
          text: message.content,
          ...(parameters?.text_to_speech?.voice ? { voice: parameters.text_to_speech.voice } : {}),
        }),
      })
      if (!response.ok)
        throw new Error(readErrorMessage(await response.text(), 'Could not read this message aloud.'))
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      audioRef.current?.pause()
      const audio = new Audio(url)
      audio.onended = () => setSpeakingId(null)
      audio.onerror = () => setSpeakingId(null)
      audioRef.current = audio
      setSpeakingId(message.id)
      await audio.play()
    }
    catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not read this message aloud.')
    }
  }

  async function fetchSuggested(messageId: string) {
    if (!selectedAppId)
      return
    try {
      const response = await fetch(
        `/api/messages/${encodeURIComponent(messageId)}/suggested?app_id=${encodeURIComponent(selectedAppId)}&user=${encodeURIComponent(getUserId())}`,
      )
      if (!response.ok)
        return
      const payload: unknown = await response.json()
      if (typeof payload === 'object' && payload !== null && 'data' in payload && Array.isArray(payload.data))
        setSuggested(payload.data.filter((item): item is string => typeof item === 'string'))
    }
    catch {
      // Suggested questions are optional.
    }
  }

  async function transcribe(audioBlob: Blob) {
    if (!selectedAppId)
      return
    if (!audioBlob.size) {
      setError('No audio was captured. Check your microphone and try again.')
      return
    }
    setTranscribing(true)
    try {
      const form = new FormData()
      form.set('file', audioBlob, 'voice.webm')
      form.set('user', getUserId())
      form.set('app_id', selectedAppId)
      const response = await fetch('/api/audio-to-text', { method: 'POST', body: form })
      if (!response.ok)
        throw new Error(readErrorMessage(await response.text(), 'Could not transcribe the audio.'))
      const payload: unknown = await response.json()
      if (typeof payload === 'object' && payload !== null && 'text' in payload && typeof payload.text === 'string')
        setInput(current => current ? `${current} ${payload.text as string}` : (payload.text as string))
    }
    catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not transcribe the audio.')
    }
    finally {
      setTranscribing(false)
    }
  }

  function handleInputChange(variable: string, value: string) {
    setInputValues(current => ({ ...current, [variable]: value }))
  }

  // Keyboard shortcut: Cmd/Ctrl+K opens a new chat.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        newChat()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const lastAssistantIndex = messages.reduce((found, message, index) => message.role === 'assistant' ? index : found, -1)

  return (
    <main className="app-shell">
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        apps={apps}
        appsLoading={appsLoading}
        appsError={appsError}
        selectedAppId={selectedAppId}
        onSelectApp={selectApp}
        onRefreshApps={() => { setAppsError(null); setAppsLoading(true); setAppRefresh(current => current + 1) }}
        onNewChat={newChat}
        conversations={conversations}
        conversationsLoading={conversationsLoading}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onDeleteConversation={conversation => void deleteConversation(conversation)}
        onRenameConversation={(conversation, name) => void renameConversation(conversation, name)}
        onLogout={() => void logout()}
        userName={account?.name ?? null}
        userAvatarUrl={account?.avatarUrl ?? null}
      />

      {menuOpen && <button className="mobile-overlay" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}

      <section className="chat-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="menu-trigger md:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
              <Menu size={18} />
            </button>
            <span className="assistant-avatar"><Sparkles size={15} /></span>
            <div className="assistant-heading">
              <span className="assistant-title">
                {selectedApp?.name ?? (appsLoading ? 'Loading chatbots…' : 'Select a chatbot')} <ChevronDown size={14} />
              </span>
              <span className="assistant-status">
                <span className="status-dot" />
                {isStreaming ? 'Generating…' : selectedApp ? appModeLabel(selectedApp.mode) : 'Dify chatbot'}
              </span>
            </div>
          </div>
        </header>

        <div className="conversation-area">
          {messagesLoading
            ? (
                <div className="messages-loading">
                  <span className="thinking-indicator"><span /><span /><span /></span>
                </div>
              )
            : messages.length === 0
              ? (
                  <Welcome
                    appName={selectedApp?.name ?? null}
                    openingStatement={parameters?.opening_statement ?? null}
                    suggestedQuestions={parameters?.suggested_questions ?? []}
                    inputFields={parameters?.user_input_form ?? []}
                    inputValues={inputValues}
                    onInputChange={handleInputChange}
                    onPrompt={prompt => sendMessage(prompt)}
                    disabled={!selectedApp || isStreaming}
                  />
                )
              : (
                  <div className="message-list">
                    {messages.map((message, index) => (
                      <ChatMessageItem
                        key={message.id}
                        message={message}
                        isStreaming={isStreaming}
                        isLastAssistant={index === lastAssistantIndex}
                        copiedId={copiedId}
                        speakingId={speakingId}
                        suggestedQuestions={index === lastAssistantIndex ? suggested : []}
                        onCopy={message => void copyMessage(message)}
                        onSpeak={message => void speak(message)}
                        onFeedback={(message, rating) => void feedback(message, rating)}
                        onSuggest={prompt => sendMessage(prompt)}
                        onRegenerate={regenerate}
                        canRegenerate={!isStreaming && index === lastAssistantIndex}
                      />
                    ))}
                    <div ref={bottomRef} />
                  </div>
                )}
        </div>

        <div className="composer-wrap">
          <div className="composer-column">
            {error && (
              <div className="error-banner" role="alert">
                <span>{error}</span>
                <button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><X size={15} /></button>
              </div>
            )}
            <Composer
              value={input}
              onChange={setInput}
              onSubmit={() => sendMessage()}
              isStreaming={isStreaming}
              onStop={() => void stopGeneration()}
              disabled={!selectedApp}
              canAttach={canAttach}
              canTranscribe={canTranscribe}
              attachments={attachments}
              onAttachFiles={handleAttachFiles}
              onRemoveAttachment={removeAttachment}
              onTranscribe={audio => void transcribe(audio)}
              transcribing={transcribing}
            />
            <p className="disclaimer">AI can make mistakes. Check important info.</p>
          </div>
        </div>
      </section>

      {feedbackTarget && (
        <FeedbackModal
          key={feedbackTarget.id}
          onClose={() => setFeedbackTarget(null)}
          onSubmit={content => submitDislikeFeedback(content)}
        />
      )}
    </main>
  )
}
