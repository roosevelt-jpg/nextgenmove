'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Briefcase } from 'lucide-react'

export default function JobsPage() {
  const [jobs] = useState([])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Postings</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage job openings
          </p>
        </div>
        <Link href="/jobs/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Job
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Postings</CardTitle>
          <CardDescription>
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} posted
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">
                No job postings yet. Create your first job to start recruiting.
              </p>
              <Link href="/jobs/new">
                <Button>Create Job Posting</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Jobs will be listed here */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
