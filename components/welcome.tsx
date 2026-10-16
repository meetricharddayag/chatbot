'use client'

import { ArrowDown, Sparkles } from 'lucide-react'
import type { InputFormField } from '@/lib/types'
import { InputForm } from './input-form'
import { Markdown } from './markdown'

export function Welcome({
  appName,
  openingStatement,
  suggestedQuestions,
  inputFields,
  inputValues,
  onInputChange,
  onPrompt,
  disabled,
}: {
  appName: string | null
  openingStatement: string | null
  suggestedQuestions: string[]
  inputFields: InputFormField[]
  inputValues: Record<string, string>
  onInputChange: (variable: string, value: string) => void
  onPrompt: (prompt: string) => void
  disabled: boolean
}) {
  const prompts = suggestedQuestions.map(prompt => ({ icon: '✦', title: prompt, prompt }))

  return (
    <div className="welcome">
      <div className="welcome-orbit">
        <span className="orbit-ring orbit-ring-one" />
        <span className="orbit-ring orbit-ring-two" />
        <div className="welcome-icon"><Sparkles size={25} strokeWidth={1.8} /></div>
        <span className="orbit-spark orbit-spark-one">✦</span>
        <span className="orbit-spark orbit-spark-two">✧</span>
      </div>
      <p className="eyebrow"><span /> YOUR AI ASSISTANT</p>
      <h1>{appName ?? 'A little help goes<br />a <em>long</em> way.'}</h1>

      {openingStatement
        ? <div className="welcome-opening"><Markdown>{openingStatement}</Markdown></div>
        : (
            <p className="welcome-copy">
              Ask a question, explore an idea, or just see where<br className="desktop-break" /> a good conversation takes you.
            </p>
          )}

      {inputFields.length > 0 && (
        <InputForm fields={inputFields} values={inputValues} onChange={onInputChange} />
      )}

      {prompts.length > 0 && (
        <div className="suggestion-grid">
          {prompts.map(item => (
            <button key={item.title} className="suggestion-card" disabled={disabled} onClick={() => onPrompt(item.prompt)}>
              <span className="suggestion-icon">{item.icon}</span>
              <span className="suggestion-label">{item.title}</span>
              <ArrowDown size={14} className="suggestion-arrow" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
