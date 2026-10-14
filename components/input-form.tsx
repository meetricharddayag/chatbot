'use client'

import type { InputFormField } from '@/lib/types'

export function InputForm({
  fields,
  values,
  onChange,
}: {
  fields: InputFormField[]
  values: Record<string, string>
  onChange: (variable: string, value: string) => void
}) {
  if (!fields?.length)
    return null

  return (
    <div className="input-form">
      {fields.map((field) => {
        const value = values[field.variable] ?? field.default ?? ''
        if (field.type === 'select') {
          return (
            <label className="input-field" key={field.variable}>
              <span className="input-label">{field.label}{field.required ? ' *' : ''}</span>
              <select value={value} onChange={event => onChange(field.variable, event.target.value)}>
                <option value="">Choose…</option>
                {(field.options ?? []).map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          )
        }
        if (field.type === 'paragraph') {
          return (
            <label className="input-field" key={field.variable}>
              <span className="input-label">{field.label}{field.required ? ' *' : ''}</span>
              <textarea
                rows={2}
                value={value}
                onChange={event => onChange(field.variable, event.target.value)}
              />
            </label>
          )
        }
        return (
          <label className="input-field" key={field.variable}>
            <span className="input-label">{field.label}{field.required ? ' *' : ''}</span>
            <input
              type="text"
              value={value}
              onChange={event => onChange(field.variable, event.target.value)}
            />
          </label>
        )
      })}
    </div>
  )
}
