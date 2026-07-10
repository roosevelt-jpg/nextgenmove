'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Briefcase, DollarSign, ArrowLeft, Share2 } from 'lucide-react'

const mockJob = {
  id: '1',
  title: 'Senior Frontend Engineer',
  company: 'TechCorp',
  location: 'San Francisco, CA',
  sector: 'Technology',
  salary: '$120k - $160k',
  type: 'Full-time',
  requiredSkills: ['React', 'TypeScript', 'Node.js', 'CSS', 'REST APIs'],
  postedAt: '2 days ago',
  description: `We are looking for an experienced Senior Frontend Engineer to join our growing team at TechCorp.

You will:
- Lead frontend architecture and best practices
- Mentor junior developers on the team
- Collaborate with product and design teams to implement new features
- Optimize performance and improve user experience
- Contribute to our design system and component library

Requirements:
- 5+ years of professional frontend development experience
- Expert-level knowledge of React and TypeScript
- Strong understanding of web performance and optimization
- Experience with state management solutions
- Excellent problem-solving skills
- Great communication and collaboration abilities`,
  benefits: ['Health Insurance', '401k Matching', 'Remote Work', 'Professional Development', 'Flexible Hours'],
}

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const [applied, setApplied] = useState(false)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link href="/jobs" className="flex items-center gap-2 text-primary mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">{mockJob.title}</h1>
              <p className="text-xl text-muted-foreground">{mockJob.company}</p>
            </div>
            <Button variant="outline" size="icon">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {mockJob.location}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Briefcase className="w-4 h-4" />
              {mockJob.type}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              {mockJob.salary}
            </div>
            <Badge variant="outline">{mockJob.sector}</Badge>
          </div>

          {!applied ? (
            <Button size="lg" onClick={() => setApplied(true)}>
              Apply Now
            </Button>
          ) : (
            <Button size="lg" disabled>
              Application Submitted
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-muted-foreground leading-relaxed">
                  {mockJob.description}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Required Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {mockJob.requiredSkills.map(skill => (
                    <Badge key={skill} variant="secondary" className="px-3 py-2">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {mockJob.benefits.map(benefit => (
                    <li key={benefit} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-1">✓</span>
                      <span className="text-muted-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Company Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Company Name</p>
                  <p className="font-medium">{mockJob.company}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Industry</p>
                  <p className="font-medium">{mockJob.sector}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Posted</p>
                  <p className="font-medium">{mockJob.postedAt}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
