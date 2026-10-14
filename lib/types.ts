export type DifyApp = {
  id: string
  name: string
  mode: string
  description?: string
  icon?: string
  icon_background?: string
}

export type MessageFile = {
  id?: string
  type?: string
  transfer_method?: string
  url?: string
  upload_file_id?: string
  belongs_to?: string
  filename?: string
  mime_type?: string
  size?: number
}

export type RetrieverResource = {
  id?: string
  dataset_name?: string
  document_name?: string
  content?: string
  score?: number
  position?: number
  segment_position?: number
  word_count?: number
  data_source_type?: string
}

export type Usage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  total_price?: string
  currency?: string
  latency?: number
}

export type AgentThought = {
  id?: string
  position?: number
  thought?: string
  tool?: string
  tool_input?: string
  observation?: string
  message_files?: MessageFile[]
}

export type Feedback = {
  rating?: 'like' | 'dislike' | null
  content?: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  messageId?: string
  taskId?: string
  files?: MessageFile[]
  agentThoughts?: AgentThought[]
  retrieverResources?: RetrieverResource[]
  usage?: Usage
  feedback?: Feedback
  status?: 'normal' | 'error' | 'streaming'
  error?: string
}

export type Conversation = {
  id: string
  name: string
  introduction?: string
  inputs?: Record<string, unknown>
  created_at?: number
  updated_at?: number
}

export type InputFormField = {
  type: 'text-input' | 'paragraph' | 'select'
  label: string
  variable: string
  required?: boolean
  default?: string
  options?: string[]
}

export type FileUploadConfig = {
  enabled?: boolean
  number_limits?: number
  transfer_methods?: string[]
  image?: { enabled?: boolean; number_limits?: number; transfer_methods?: string[] }
  document?: { enabled?: boolean; number_limits?: number }
  audio?: { enabled?: boolean; number_limits?: number }
  video?: { enabled?: boolean; number_limits?: number }
}

export type AppParameters = {
  opening_statement?: string | null
  suggested_questions?: string[]
  suggested_questions_after_answer?: { enabled?: boolean }
  more_like_this?: { enabled?: boolean }
  speech_to_text?: { enabled?: boolean }
  text_to_speech?: { enabled?: boolean; voice?: string; language?: string; autoPlay?: string }
  file_upload?: FileUploadConfig
  retriever_resource?: { enabled?: boolean }
  sensitive_word_avoidance?: { enabled?: boolean }
  annotation_reply?: { enabled?: boolean }
  system_parameters?: {
    image_file_size_limit?: number
    audio_file_size_limit?: number
    file_size_limit?: number
    video_file_size_limit?: number
    workflow_file_upload_limit?: number
  }
  user_input_form?: InputFormField[]
}

export type AppMeta = {
  tool_icons?: Record<string, string | { background?: string; content?: string }>
}

export type ToolIcon = { name: string; value: string | { background?: string; content?: string } }

export type PendingAttachment = {
  id: string
  kind: 'image' | 'document' | 'audio' | 'video' | 'custom'
  name: string
  size?: number
  mimeType?: string
  objectUrl?: string
  url?: string
  uploadFileId?: string
  uploading?: boolean
  error?: string
}

export type ChatFiles = {
  type: 'image' | 'document' | 'audio' | 'video' | 'custom'
  transfer_method: 'remote_url' | 'local_file'
  url?: string
  upload_file_id?: string
}
