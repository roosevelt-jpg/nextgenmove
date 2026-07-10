'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, GraduationCap, FileText } from 'lucide-react'

interface DashboardStats {
  totalUsers: number
  totalCompanies: number
  totalStudents: number
  totalArticles: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCompanies: 0,
    totalStudents: 0,
    totalArticles: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch all users
        const usersSnapshot = await getDocs(collection(db, 'users'))
        const totalUsers = usersSnapshot.size

        // Fetch companies
        const companiesSnapshot = await getDocs(collection(db, 'companies'))
        const totalCompanies = companiesSnapshot.size

        // Fetch students
        const studentsSnapshot = await getDocs(collection(db, 'students'))
        const totalStudents = studentsSnapshot.size

        // Fetch articles
        const articlesSnapshot = await getDocs(collection(db, 'articles'))
        const totalArticles = articlesSnapshot.size

        setStats({
          totalUsers,
          totalCompanies,
          totalStudents,
          totalArticles,
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-50 dark:bg-blue-950',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Companies',
      value: stats.totalCompanies,
      icon: Building2,
      color: 'bg-purple-50 dark:bg-purple-950',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Students',
      value: stats.totalStudents,
      icon: GraduationCap,
      color: 'bg-green-50 dark:bg-green-950',
      textColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Articles',
      value: stats.totalArticles,
      icon: FileText,
      color: 'bg-orange-50 dark:bg-orange-950',
      textColor: 'text-orange-600 dark:text-orange-400',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to the NextGenMove admin panel
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className={`w-4 h-4 ${stat.textColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-8 bg-muted rounded animate-pulse" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Total {stat.title.toLowerCase()}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common admin tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Manage Users', href: '/admin/users' },
              { label: 'Edit Settings', href: '/admin/settings' },
              { label: 'Manage Content', href: '/admin/content' },
              { label: 'View Reports', href: '/admin/reports' },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="px-4 py-3 border border-border rounded-lg hover:bg-accent transition-colors text-center font-medium text-sm"
              >
                {action.label}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
