export const DEFAULT_FEEDBACK_OPTIONS = [
  'Poor answer',
  'Wrong answer',
  'Did not answer',
  'Irrelevant answer',
]

/**
 * Parses the FEEDBACK_OPTIONS environment variable (comma-separated) into a
 * list of options. Falls back to the defaults when unset or empty.
 */
export function parseFeedbackOptions(raw?: string): string[] {
  if (!raw)
    return DEFAULT_FEEDBACK_OPTIONS

  const options = raw
    .split(',')
    .map(option => option.trim())
    .filter(Boolean)

  return options.length > 0 ? options : DEFAULT_FEEDBACK_OPTIONS
}
