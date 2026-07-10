'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { CompanySidebar } from '@/components/employer/sidebar'

export default function EmployerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, loading, isCompany } = useAuth()

  useEffect(() => {
    if (!loading && (!user || !isCompany)) {
      router.push('/login')
    }
  }, [user, loading, isCompany, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isCompany) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-background">
      <CompanySidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
