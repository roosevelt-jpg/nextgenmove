'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Briefcase, Heart, FileText, TrendingUp } from 'lucide-react'

interface StudentStats {
  jobsViewed: number
  applicationsSent: number
  saved: number
  profileCompletion: number
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<StudentStats>({
    jobsViewed: 0,
    applicationsSent: 0,
    saved: 0,
    profileCompletion: 0,
  })
  const [loading, setLoading] = useState(true)
  const [studentProfile, setStudentProfile] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return

      try {
        // Fetch student profile
        const studentsQuery = query(
          collection(db, 'students'),
          where('userId', '==', user.uid)
        )
        const studentsSnapshot = await getDocs(studentsQuery)
        if (studentsSnapshot.docs.length > 0) {
          const profile = studentsSnapshot.docs[0].data()
          setStudentProfile(profile)

          // Calculate profile completion
          let completion = 0
          if (profile.fullName) completion += 20
          if (profile.sector) completion += 20
          if (profile.skills?.length > 0) completion += 20
          if (profile.resume) completion += 20
          if (profile.availability) completion += 20
          setStats((prev) => ({ ...prev, profileCompletion: completion }))
        }

        // TODO: Fetch applications and saved jobs from Firestore
        setStats((prev) => ({
          ...prev,
          applicationsSent: 0,
          saved: 0,
        }))
      } catch (error) {
        console.error('Error fetching student data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.uid])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.displayName}
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your career profile and job applications
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile</CardTitle>
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.profileCompletion}%</div>
            <p className="text-xs text-muted-foreground mt-2">Completion</p>
            {stats.profileCompletion < 100 && (
              <Link href="/student/profile">
                <p className="text-xs text-primary hover:underline mt-2">Complete Profile</p>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.applicationsSent}</div>
            <p className="text-xs text-muted-foreground mt-2">Sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Jobs</CardTitle>
            <Heart className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.saved}</div>
            <p className="text-xs text-muted-foreground mt-2">In your list</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jobs Viewed</CardTitle>
            <Briefcase className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.jobsViewed}</div>
            <p className="text-xs text-muted-foreground mt-2">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      {!studentProfile && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle>Welcome to NextGenMove</CardTitle>
            <CardDescription>
              Get started by completing your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/student/profile">
                <Button className="w-full">Create Profile</Button>
              </Link>
              <Link href="/student/jobs">
                <Button variant="outline" className="w-full">
                  Browse Jobs
                </Button>
              </Link>
              <Link href="/student/profile">
                <Button variant="outline" className="w-full">
                  Upload Resume
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <CardDescription>
            Track your job application status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No applications yet. Start by browsing jobs.</p>
            <Link href="/student/jobs">
              <p className="text-primary hover:underline mt-2 inline-block">Browse Jobs</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
