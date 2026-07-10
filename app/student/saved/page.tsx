'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, MapPin, Briefcase } from 'lucide-react'

export default function SavedJobsPage() {
  const savedJobs: any[] = []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Saved Jobs</h1>
        <p className="text-muted-foreground mt-2">
          Your bookmarked job listings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bookmarked Positions</CardTitle>
          <CardDescription>
            {savedJobs.length} job{savedJobs.length !== 1 ? 's' : ''} saved
          </CardDescription>
        </CardHeader>
        <CardContent>
          {savedJobs.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">
                No saved jobs yet. Start saving jobs to bookmark them for later.
              </p>
              <a
                href="/student/jobs"
                className="text-primary hover:underline inline-block"
              >
                Browse all jobs
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {savedJobs.map((job) => (
                <Card key={job.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{job.title}</h3>
                        <p className="text-muted-foreground">{job.company}</p>

                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="secondary" className="gap-1">
                            <Briefcase className="w-3 h-3" />
                            {job.type}
                          </Badge>
                          <Badge variant="secondary" className="gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </Badge>
                          <Badge variant="secondary">{job.sector}</Badge>
                        </div>
                      </div>

                      <button className="p-2 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/30 ml-4">
                        <Heart className="w-5 h-5" fill="currentColor" />
                      </button>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1">
                        View Details
                      </Button>
                      <Button size="sm" className="flex-1">
                        Apply Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
