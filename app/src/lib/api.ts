/**
 * Backend API URL helper.
 *
 * In production the Next.js frontend talks to the standalone Express backend
 * running on Heroku (set via NEXT_PUBLIC_CLAWCLICK_BACKEND_URL).
 */
export const BACKEND_URL = process.env.NEXT_PUBLIC_CLAWCLICK_BACKEND_URL || 'https://claw-click-backend-5157d572b2b6.herokuapp.com'

/** Prefix a relative API path with the backend URL. */
export function apiUrl(path: string): string {
  return `${BACKEND_URL}${path}`
}
