'use client'

import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'
import type { User } from '@/types'

/**
 * Get a user by UID
 */
export async function getUser(uid: string): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid))
    return userDoc.exists() ? (userDoc.data() as User) : null
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
}

/**
 * Get all users with a specific role
 */
export async function getUsersByRole(role: 'admin' | 'company' | 'student'): Promise<User[]> {
  try {
    const q = query(collection(db, 'users'), where('role', '==', role))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => doc.data() as User)
  } catch (error) {
    console.error('Error getting users by role:', error)
    return []
  }
}

/**
 * Get all active users
 */
export async function getActiveUsers(): Promise<User[]> {
  try {
    const q = query(collection(db, 'users'), where('status', '==', 'active'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => doc.data() as User)
  } catch (error) {
    console.error('Error getting active users:', error)
    return []
  }
}

/**
 * Get user count by role
 */
export async function getUserCountByRole(
  role: 'admin' | 'company' | 'student'
): Promise<number> {
  try {
    const users = await getUsersByRole(role)
    return users.length
  } catch (error) {
    console.error('Error counting users:', error)
    return 0
  }
}
