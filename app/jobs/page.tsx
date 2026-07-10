'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Briefcase, DollarSign, Calendar } from 'lucide-react'

const mockJobs = [
  {
    id: '1',
    title: 'Senior Frontend Engineer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    sector: 'Technology',
    salary: '$120k - $160k',
    type: 'Full-time',
    requiredSkills: ['React', 'TypeScript', 'Node.js'],
    description: 'We are looking for an experienced frontend engineer to join our team.',
    postedAt: '2 days ago',
  },
  {
    id: '2',
    title: 'Product Manager',
    company: 'StartupX',
    location: 'New York, NY',
    sector: 'Product',
    salary: '$100k - $140k',
    type: 'Full-time',
    requiredSkills: ['Product Strategy', 'Data Analysis', 'Leadership'],
    description: 'Looking for a talented PM to lead product development.',
    postedAt: '1 week ago',
  },
  {
    id: '3',
    title: 'UX Designer',
    company: 'DesignStudio',
    location: 'Remote',
    sector: 'Design',
    salary: '$80k - $110k',
    type: 'Full-time',
    requiredSkills: ['Figma', 'User Research', 'Prototyping'],
    description: 'Join our design team and create beautiful user experiences.',
    postedAt: '3 days ago',
  },
  {
    id: '4',
    title: 'Backend Engineer',
    company: 'CloudSys',
    location: 'Austin, TX',
    sector: 'Backend',
    salary: '$110k - $150k',
    type: 'Full-time',
    requiredSkills: ['Python', 'AWS', 'Kubernetes'],
    description: 'Help us build scalable backend systems.',
    postedAt: '5 days ago',
  },
]

export default function JobsPage() {
  const [jobs] = useState(mockJobs)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])

  const filteredJobs = jobs.filter(job => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Job Board</h1>
          <p className="text-lg text-muted-foreground">
            Discover amazing career opportunities
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search jobs by title or company..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Results */}
        <div className="space-y-4">
          {filteredJobs.length > 0 ? (
            filteredJobs.map(job => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Main Info */}
                    <div className="md:col-span-2 space-y-3">
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{job.title}</h3>
                        <p className="text-muted-foreground">{job.company}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Briefcase className="w-4 h-4" />
                          {job.type}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {job.postedAt}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.description}
                      </p>

                      <div className="flex flex-wrap gap-2 pt-2">
                        {job.requiredSkills.map(skill => (
                          <Badge key={skill} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Sidebar */}
                    <div className="flex flex-col items-end justify-between">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-lg font-bold text-foreground mb-1">
                          <DollarSign className="w-5 h-5" />
                          {job.salary}
                        </div>
                        <Badge variant="outline">{job.sector}</Badge>
                      </div>
                      <Button className="mt-4 w-full md:w-auto">
                        Apply Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No jobs found matching your search.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-primary">{jobs.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Active Positions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-primary">
                {new Set(jobs.map(j => j.company)).size}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Hiring Companies</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-primary">
                {new Set(jobs.map(j => j.sector)).size}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Industry Sectors</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
