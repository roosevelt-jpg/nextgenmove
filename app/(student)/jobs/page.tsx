'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Heart, MapPin, Briefcase } from 'lucide-react'

interface Job {
  id: string
  title: string
  company: string
  sector: string
  location: string
  type: string
  salary?: string
  description: string
}

const SAMPLE_JOBS: Job[] = [
  {
    id: '1',
    title: 'Senior React Developer',
    company: 'TechCorp',
    sector: 'Technology',
    location: 'San Francisco, CA',
    type: 'Full-Time',
    salary: '$150k - $180k',
    description: 'Build scalable web applications with React and Node.js',
  },
  {
    id: '2',
    title: 'Product Manager',
    company: 'StartupXYZ',
    sector: 'Technology',
    location: 'Remote',
    type: 'Full-Time',
    salary: '$120k - $150k',
    description: 'Lead product strategy and roadmap for our flagship platform',
  },
  {
    id: '3',
    title: 'Data Scientist',
    company: 'Analytics Pro',
    sector: 'Finance',
    location: 'New York, NY',
    type: 'Full-Time',
    salary: '$130k - $160k',
    description: 'Develop ML models for financial forecasting',
  },
]

export default function StudentJobsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [saved, setSaved] = useState<Set<string>>(new Set())

  const filteredJobs = SAMPLE_JOBS.filter((job) =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.sector.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleSave = (jobId: string) => {
    const newSaved = new Set(saved)
    if (newSaved.has(jobId)) {
      newSaved.delete(jobId)
    } else {
      newSaved.add(jobId)
    }
    setSaved(newSaved)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Browse Jobs</h1>
        <p className="text-muted-foreground mt-2">
          Find your next opportunity
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jobs by title, company, or sector..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              No jobs match your search. Try adjusting your criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
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
                      {job.salary && (
                        <Badge variant="secondary">{job.salary}</Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mt-3">
                      {job.description}
                    </p>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => toggleSave(job.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        saved.has(job.id)
                          ? 'bg-red-50 text-red-600 dark:bg-red-950/30'
                          : 'hover:bg-muted text-muted-foreground'
                      }`}
                      title="Save job"
                    >
                      <Heart
                        className="w-5 h-5"
                        fill={saved.has(job.id) ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>
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
    </div>
  )
}
