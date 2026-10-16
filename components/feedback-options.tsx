'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { DEFAULT_FEEDBACK_OPTIONS } from '@/lib/feedback-options'

const FeedbackOptionsContext = createContext<string[]>(DEFAULT_FEEDBACK_OPTIONS)

export function FeedbackOptionsProvider({ options, children }: { options: string[]; children: ReactNode }) {
  return <FeedbackOptionsContext.Provider value={options}>{children}</FeedbackOptionsContext.Provider>
}

export function useFeedbackOptions(): string[] {
  return useContext(FeedbackOptionsContext)
}
