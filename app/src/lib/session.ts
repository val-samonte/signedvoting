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
export async function getServerSession(cookieHeader?: string): Promise<{ user: SessionUser } | null> {
  try {
    if (!cookieHeader) return null;
    
    // Parse cookies
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    // Get session cookie
    const sessionCookie = cookies[SESSION_COOKIE_NAME];
    if (!sessionCookie) return null;
    
    // Parse session data
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    
    // Check if session is expired (7 days)
    const isExpired = Date.now() - sessionData.timestamp > (COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    if (isExpired) {
      return null;
    }
    
    return { user: sessionData.user };
  } catch (error) {
    console.error('Error parsing server session:', error);
    return null;
  }
}
