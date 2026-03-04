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

/**
 * Claws.fun backend URL — handles GPU sessions, Vast.ai provisioning,
 * payment verification, and OpenClaw gateway WebSocket relay.
 */
export const CLAWSFUN_BACKEND_URL = process.env.NEXT_PUBLIC_CLAWSFUN_BACKEND_URL || 'https://claws-fun-backend-764a4f25b49e.herokuapp.com'

/** Prefix a relative API path with the claws.fun backend URL. */
export function clawsFunApiUrl(path: string): string {
  return `${CLAWSFUN_BACKEND_URL}${path}`
}
