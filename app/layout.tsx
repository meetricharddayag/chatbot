import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { FeedbackOptionsProvider } from '@/components/feedback-options'
import { parseFeedbackOptions } from '@/lib/feedback-options'

export const metadata: Metadata = {
  title: 'Dify Chat',
  description: 'A private chat interface powered by Dify.',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const feedbackOptions = parseFeedbackOptions(process.env.FEEDBACK_OPTIONS)

  return (
    <html lang="en">
      <body>
        <FeedbackOptionsProvider options={feedbackOptions}>{children}</FeedbackOptionsProvider>
      </body>
    </html>
  )
}
