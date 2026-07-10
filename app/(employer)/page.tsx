'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Users, Briefcase, Plus } from 'lucide-react'

interface CompanyStats {
  talentViews: number
  activeJobs: number
  matchedCandidates: number
}

export default function CompanyDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<CompanyStats>({
    talentViews: 0,
    activeJobs: 0,
    matchedCandidates: 0,
  })
  const [loading, setLoading] = useState(true)
  const [companyProfile, setCompanyProfile] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return

      try {
        // Fetch company profile
        const companiesQuery = query(
          collection(db, 'companies'),
          where('userId', '==', user.uid)
        )
        const companiesSnapshot = await getDocs(companiesQuery)
        if (companiesSnapshot.docs.length > 0) {
          setCompanyProfile(companiesSnapshot.docs[0].data())
        }

        // TODO: Fetch matches and active jobs from Firestore
        setStats({
          talentViews: 0,
          activeJobs: 0,
          matchedCandidates: 0,
        })
      } catch (error) {
        console.error('Error fetching company data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.uid])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.displayName}
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your company profile, jobs, and talent pipeline
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Talent Views</CardTitle>
            <Users className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.talentViews}</div>
            <p className="text-xs text-muted-foreground mt-2">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeJobs}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Open positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched Talent</CardTitle>
            <Building2 className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.matchedCandidates}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Ready to review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            Set up your company profile to start connecting with talent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companyProfile ? (
              <>
                <Link href="/profile">
                  <Button variant="outline" className="w-full">
                    Edit Profile
                  </Button>
                </Link>
                <Link href="/jobs">
                  <Button className="w-full gap-2">
                    <Plus className="w-4 h-4" />
                    Create Job
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/profile">
                  <Button className="w-full gap-2">
                    <Plus className="w-4 h-4" />
                    Create Profile
                  </Button>
                </Link>
                <Link href="/talent-pool">
                  <Button variant="outline" className="w-full">
                    Browse Talent
                  </Button>
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your recent actions on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No activity yet. Start by creating your company profile.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
