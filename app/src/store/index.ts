import { atom } from 'jotai'
import { getSession, setSession, clearSession, type SessionUser } from '@/lib/session'

// User state - initialize as null, will be restored on client side
export const userAtom = atom<{
  id: number
  username: string
  wallet_address: string | null
} | null>(null)

// Authentication state
export const isAuthenticatedAtom = atom((get) => get(userAtom) !== null)

// UI state
export const sidebarOpenAtom = atom(false)

// Session management actions
export const loginAtom = atom(
  null,
  (get, set, user: SessionUser) => {
    set(userAtom, user)
    setSession(user)
  }
)

export const logoutAtom = atom(
  null,
  (get, set) => {
    set(userAtom, null)
    clearSession()
  }
)
