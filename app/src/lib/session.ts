import Cookies from 'js-cookie'

export interface SessionUser {
  id: number
  username: string
  wallet_address: string | null
}

const SESSION_COOKIE_NAME = 'signedvoting_session'
const COOKIE_EXPIRY_DAYS = 7

export function setSession(user: SessionUser) {
  const sessionData = {
    user,
    timestamp: Date.now()
  }
  
  Cookies.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    expires: COOKIE_EXPIRY_DAYS,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  })
}

export function getSession(): SessionUser | null {
  try {
    const sessionCookie = Cookies.get(SESSION_COOKIE_NAME)
    if (!sessionCookie) return null
    
    const sessionData = JSON.parse(sessionCookie)
    
    // Check if session is expired (7 days)
    const isExpired = Date.now() - sessionData.timestamp > (COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    if (isExpired) {
      clearSession()
      return null
    }
    
    return sessionData.user
  } catch (error) {
    console.error('Error parsing session cookie:', error)
    clearSession()
    return null
  }
}

export function clearSession() {
  Cookies.remove(SESSION_COOKIE_NAME)
}

export function isSessionValid(): boolean {
  return getSession() !== null
}

// Server-side session function for API routes
export async function getServerSession(): Promise<{ user: SessionUser } | null> {
  // This is a placeholder - in a real app you'd implement proper server-side session handling
  // For now, we'll return null to indicate no session
  return null;
}
