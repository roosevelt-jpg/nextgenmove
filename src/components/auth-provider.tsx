'use client'

import { useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth, db } from '@/lib/firebase-client'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { AuthContext } from '@/lib/auth-context'
import type { User } from '@/types'
import { stripUndefined } from '@/lib/stripUndefined'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Fetch user document from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            setUser(userDoc.data() as User)
          } else {
            setUser(null)
          }
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('Error fetching user:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch user')
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  const signUp = useCallback(async (
    email: string,
    password: string,
    displayName: string,
    role: 'admin' | 'company' | 'student'
  ) => {
    try {
      setError(null)
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password)

      // Create user document in Firestore
      const userData = {
        uid: firebaseUser.uid,
        email,
        displayName,
        role,
        photoUrl: undefined,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        status: 'active',
      }

      await setDoc(doc(db, 'users', firebaseUser.uid), stripUndefined(userData))
      // Note: timestamps will be Firestore Timestamp objects in real data
      setUser(userData as any)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed'
      setError(errorMessage)
      throw err
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null)
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed'
      setError(errorMessage)
      throw err
    }
  }, [])

  const signOutUser = useCallback(async () => {
    try {
      setError(null)
      await signOut(auth)
      setUser(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed'
      setError(errorMessage)
      throw err
    }
  }, [])

  const value = {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut: signOutUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isCompany: user?.role === 'company',
    isStudent: user?.role === 'student',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
