'use client'

import { FileText, Image as ImageIcon, Music, Paperclip, Video, X } from 'lucide-react'
import type { MessageFile, PendingAttachment } from '@/lib/types'
import { fileKind, formatBytes } from '@/lib/client'

function fileIcon(kind?: string) {
  switch (kind) {
    case 'image': return <ImageIcon size={15} />
    case 'audio': return <Music size={15} />
    case 'video': return <Video size={15} />
    case 'document': return <FileText size={15} />
    default: return <Paperclip size={15} />
  }
}

export function AttachmentChip({ attachment, onRemove }: { attachment: PendingAttachment; onRemove: (id: string) => void }) {
  return (
    <div className="attachment-chip">
      {attachment.kind === 'image' && attachment.objectUrl
        ? <img className="attachment-thumb" src={attachment.objectUrl} alt={attachment.name} />
        : <span className="attachment-icon">{fileIcon(attachment.kind)}</span>}
      <span className="attachment-copy">
        <strong>{attachment.name}</strong>
        <small>{attachment.uploading ? 'Uploading…' : attachment.error ? attachment.error : formatBytes(attachment.size)}</small>
      </span>
      <button type="button" className="attachment-remove" aria-label={`Remove ${attachment.name}`} onClick={() => onRemove(attachment.id)}>
        <X size={13} />
      </button>
    </div>
  )
}

export function MessageFiles({ files }: { files: MessageFile[] }) {
  if (!files?.length)
    return null

  return (
    <div className="message-files">
      {files.map((file, index) => {
        const key = file.id ?? file.upload_file_id ?? `${file.url ?? ''}-${index}`
        const name = file.filename ?? 'File'
        if (file.type === 'image' && file.url) {
          return (
            <a key={key} href={file.url} target="_blank" rel="noreferrer" className="message-image">
              <img src={file.url} alt={name} loading="lazy" />
            </a>
          )
        }
        if (file.type === 'video' && file.url) {
          return <video key={key} className="message-media" src={file.url} controls />
        }
        if (file.type === 'audio' && file.url) {
          return <audio key={key} className="message-media" src={file.url} controls />
        }
        if (file.url) {
          return (
            <a key={key} href={file.url} target="_blank" rel="noreferrer" className="message-file-link">
              <span className="message-file-icon">{fileIcon(file.type)}</span>
              <span className="message-file-copy">
                <strong>{name}</strong>
                <small>{`${fileKind(file.type)}${file.size ? ` · ${formatBytes(file.size)}` : ''}`}</small>
              </span>
            </a>
          )
        }
        return (
          <span key={key} className="message-file-link">
            <span className="message-file-icon">{fileIcon(file.type)}</span>
            <span className="message-file-copy">
              <strong>{name}</strong>
              <small>{fileKind(file.type)}</small>
            </span>
          </span>
        )
      })}
    </div>
  )
}
