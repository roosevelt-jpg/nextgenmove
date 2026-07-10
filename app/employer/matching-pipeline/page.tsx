'use client'

import { useContext, useState } from 'react'
import { AuthContext } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, MessageSquare, CheckCircle, XCircle } from 'lucide-react'

// Mock matching data - in real app, fetch from Firestore
const mockMatches = [
  {
    id: '1',
    studentName: 'Alex Johnson',
    sector: 'Technology',
    skills: ['React', 'Node.js', 'TypeScript'],
    matchScore: 95,
    status: 'new',
  },
  {
    id: '2',
    studentName: 'Sarah Chen',
    sector: 'Product',
    skills: ['UX Design', 'Figma', 'Research'],
    matchScore: 87,
    status: 'contacted',
  },
  {
    id: '3',
    studentName: 'Marcus Williams',
    sector: 'Backend',
    skills: ['Python', 'PostgreSQL', 'AWS'],
    matchScore: 92,
    status: 'interviewed',
  },
  {
    id: '4',
    studentName: 'Emma Rodriguez',
    sector: 'Frontend',
    skills: ['Vue.js', 'CSS', 'Accessibility'],
    matchScore: 88,
    status: 'accepted',
  },
]

export default function MatchingPipelinePage() {
  const context = useContext(AuthContext)
  const user = context?.user
  const [matches, setMatches] = useState(mockMatches)

  const updateStatus = (id: string, newStatus: string) => {
    setMatches(matches.map(m => m.id === id ? { ...m, status: newStatus } : m))
  }

  const columns = {
    new: { title: 'New Matches', color: 'bg-blue-50 dark:bg-blue-950' },
    contacted: { title: 'Contacted', color: 'bg-yellow-50 dark:bg-yellow-950' },
    interviewed: { title: 'Interviewed', color: 'bg-purple-50 dark:bg-purple-950' },
    accepted: { title: 'Accepted', color: 'bg-green-50 dark:bg-green-950' },
  }

  const groupedMatches = {
    new: matches.filter(m => m.status === 'new'),
    contacted: matches.filter(m => m.status === 'contacted'),
    interviewed: matches.filter(m => m.status === 'interviewed'),
    accepted: matches.filter(m => m.status === 'accepted'),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Talent Matching Pipeline</h1>
        <p className="text-muted-foreground mt-2">
          AI-powered candidate matching and pipeline management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(columns).map(([key, { title, color }]) => (
          <div key={key} className={`${color} rounded-lg p-4`}>
            <h2 className="font-semibold mb-4">{title}</h2>
            <div className="space-y-3">
              {groupedMatches[key as keyof typeof groupedMatches].map(match => (
                <Card key={match.id} className="cursor-move">
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{match.studentName}</p>
                        <Badge variant="outline" className="text-xs">
                          {match.matchScore}%
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {match.skills.slice(0, 2).map(skill => (
                          <Badge key={skill} variant="secondary" className="text-xs py-0">
                            {skill}
                          </Badge>
                        ))}
                        {match.skills.length > 2 && (
                          <Badge variant="secondary" className="text-xs py-0">
                            +{match.skills.length - 2}
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => updateStatus(match.id, 'contacted')}
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Contact
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => updateStatus(match.id, 'accepted')}
                        >
                          <Star className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {groupedMatches[key as keyof typeof groupedMatches].length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No candidates
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(columns).map(([key, { title }]) => (
              <div key={key} className="space-y-1">
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="text-2xl font-bold">
                  {groupedMatches[key as keyof typeof groupedMatches].length}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
