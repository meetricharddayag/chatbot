'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUp, Loader2, Mic, Paperclip, Square } from 'lucide-react'
import type { PendingAttachment } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AttachmentChip } from './attachments'

export function Composer({
  value,
  onChange,
  onSubmit,
  isStreaming,
  onStop,
  disabled,
  canAttach,
  canTranscribe,
  attachments,
  onAttachFiles,
  onRemoveAttachment,
  onTranscribe,
  transcribing,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isStreaming: boolean
  onStop: () => void
  disabled: boolean
  canAttach: boolean
  canTranscribe: boolean
  attachments: PendingAttachment[]
  onAttachFiles: (files: File[]) => void
  onRemoveAttachment: (id: string) => void
  onTranscribe: (audio: Blob) => void
  transcribing: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea)
      return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }, [value])

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmit()
    }
  }

  function handleFiles(files: FileList | null) {
    if (files && files.length)
      onAttachFiles(Array.from(files))
    if (fileInputRef.current)
      fileInputRef.current.value = ''
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop()
      setRecording(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size)
          chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        chunksRef.current = []
        if (blob.size)
          onTranscribe(blob)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    }
    catch {
      onTranscribe(new Blob([]))
    }
  }

  return (
    <div className="composer">
      {attachments.length > 0 && (
        <div className="composer-attachments">
          {attachments.map(attachment => (
            <AttachmentChip key={attachment.id} attachment={attachment} onRemove={onRemoveAttachment} />
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        aria-label="Message your assistant"
        placeholder="Ask anything..."
        rows={1}
        value={value}
        onChange={event => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isStreaming}
      />

      <div className="composer-bottom">
        <div className="composer-tools">
          {canAttach && (
            <>
              <button
                type="button"
                className="composer-tool"
                aria-label="Attach a file"
                disabled={isStreaming}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                multiple
                accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.md,.csv,.xls,.xlsx,.ppt,.pptx"
                onChange={event => handleFiles(event.target.files)}
              />
            </>
          )}
          {canTranscribe && (
            <button
              type="button"
              className={cn('composer-tool', recording && 'composer-tool-recording')}
              aria-label={recording ? 'Stop recording' : 'Speak your message'}
              disabled={isStreaming || transcribing}
              onClick={() => void toggleRecording()}
            >
              {transcribing ? <Loader2 size={16} className="spin" /> : recording ? <Square size={15} /> : <Mic size={16} />}
            </button>
          )}
        </div>

        <span className="composer-hint">
          <kbd>↵</kbd> to send <span className="hint-divider">·</span> <kbd>⇧ ↵</kbd> for new line
        </span>

        {isStreaming
          ? (
              <button type="button" className="stop-button" onClick={onStop} aria-label="Stop generating">
                <Square size={14} fill="currentColor" />
              </button>
            )
          : (
              <button
                type="button"
                className="send-button"
                disabled={disabled || (!value.trim() && attachments.length === 0)}
                onClick={onSubmit}
                aria-label="Send message"
              >
                <ArrowUp size={17} strokeWidth={2.4} />
              </button>
            )}
      </div>
    </div>
  )
}
