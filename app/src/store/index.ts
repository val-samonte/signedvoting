import { atom } from 'jotai'

// User state
export const userAtom = atom<{
  id: number
  username: string
  wallet_address: string | null
} | null>(null)

// Authentication state
export const isAuthenticatedAtom = atom((get) => get(userAtom) !== null)

// UI state
export const sidebarOpenAtom = atom(false)
