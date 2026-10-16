'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFeedbackOptions } from './feedback-options'

export function FeedbackModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (content: string) => void
}) {
  const feedbackOptions = useFeedbackOptions()
  const [selected, setSelected] = useState<string[]>([])
  const [comment, setComment] = useState('')

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape')
        onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function appendTag(current: string, option: string) {
    const trimmed = current.trimEnd()
    return trimmed ? `${trimmed}\n${option}` : option
  }

  function removeTag(current: string, option: string) {
    return current
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line !== option)
      .join('\n')
  }

  function toggle(option: string) {
    const isSelected = selected.includes(option)
    if (isSelected) {
      setSelected(current => current.filter(item => item !== option))
      setComment(current => removeTag(current, option))
    }
    else {
      setSelected(current => [...current, option])
      setComment(current => appendTag(current, option))
    }
  }

  function submit() {
    const content = comment.trim()
    if (content)
      onSubmit(content)
  }

  const canSubmit = comment.trim().length > 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Message feedback"
        onClick={event => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">Help us improve</h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <p className="modal-subtitle">What was the problem with this answer?</p>

        <div className="modal-options">
          {feedbackOptions.map(option => (
            <button
              key={option}
              type="button"
              className={cn('modal-option', selected.includes(option) && 'modal-option-active')}
              aria-pressed={selected.includes(option)}
              onClick={() => toggle(option)}
            >
              {selected.includes(option) && <Check size={12} strokeWidth={2.6} />}
              {option}
            </button>
          ))}
        </div>

        <textarea
          className="modal-textarea"
          rows={3}
          autoFocus
          placeholder="Add a comment (optional)…"
          value={comment}
          onChange={event => setComment(event.target.value)}
        />

        <div className="modal-actions">
          <button type="button" className="modal-button modal-button-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="modal-button modal-button-submit"
            disabled={!canSubmit}
            onClick={submit}
          >
            Submit feedback
          </button>
        </div>
      </div>
    </div>
  )
}
