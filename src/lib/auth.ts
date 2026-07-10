import { User } from '@/types'

/**
 * Check if user has admin role
 */
export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin'
}

/**
 * Check if user has company role
 */
export function isCompany(user: User | null): boolean {
  return user?.role === 'company'
}

/**
 * Check if user has student role
 */
export function isStudent(user: User | null): boolean {
  return user?.role === 'student'
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(user: User | null): boolean {
  return !!user
}

/**
 * Get user role display name
 */
export function getRoleDisplayName(role: string): string {
  const roleMap: Record<string, string> = {
    admin: 'Administrator',
    company: 'Company',
    student: 'Student',
  }
  return roleMap[role] || role
}
