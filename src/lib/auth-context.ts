'use client'

import { createContext, useContext } from 'react'
import type { User } from '@/types'

export interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signUp: (email: string, password: string, displayName: string, role: 'admin' | 'company' | 'student') => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isAuthenticated: boolean
  isAdmin: boolean
  isCompany: boolean
  isStudent: boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
