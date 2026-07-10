'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, Shield, AlertCircle } from 'lucide-react'
import type { User } from '@/types'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'))
        const usersData = usersSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        } as User & { id: string }))
        setUsers(usersData)
      } catch (err) {
        console.error('Error fetching users:', err)
        setError('Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const handleSuspendUser = async (userId: string) => {
    if (!confirm('Are you sure you want to suspend this user?')) return

    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'suspended',
      })
      setUsers(users.map(u => u.uid === userId ? { ...u, status: 'suspended' } : u))
    } catch (err) {
      console.error('Error suspending user:', err)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'company':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'student':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    return status === 'active'
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage platform users and their permissions
        </p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {users.length} user{users.length !== 1 ? 's' : ''} on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No users yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Joined</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.uid} className="hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">{user.displayName}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(user.status)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {user.createdAt instanceof Date
                          ? user.createdAt.toLocaleDateString()
                          : new Date().toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {user.status === 'active' && (
                            <button
                              onClick={() => handleSuspendUser(user.uid)}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                              title="Suspend user"
                            >
                              <AlertCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
