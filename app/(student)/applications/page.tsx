'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle, XCircle } from 'lucide-react'

interface Application {
  id: string
  jobTitle: string
  company: string
  status: 'pending' | 'viewed' | 'rejected' | 'accepted'
  appliedAt: Date
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    label: 'Pending',
  },
  viewed: {
    icon: Clock,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    label: 'Viewed',
  },
  rejected: {
    icon: XCircle,
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    label: 'Rejected',
  },
  accepted: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    label: 'Accepted',
  },
}

export default function ApplicationsPage() {
  const applications: Application[] = []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
        <p className="text-muted-foreground mt-2">
          Track the status of your job applications
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Applications</CardTitle>
          <CardDescription>
            {applications.length} application{applications.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                You haven&apos;t applied to any jobs yet.
              </p>
              <a
                href="/student/jobs"
                className="text-primary hover:underline"
              >
                Browse jobs to get started
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => {
                const statusConfig = STATUS_CONFIG[app.status]
                const StatusIcon = statusConfig.icon
                return (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{app.jobTitle}</h3>
                      <p className="text-sm text-muted-foreground">
                        {app.company}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Applied{' '}
                        {app.appliedAt.toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
