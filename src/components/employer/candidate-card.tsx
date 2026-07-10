'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Briefcase, Zap } from 'lucide-react'

interface CandidateCardProps {
  name: string
  sector: string
  location?: string
  skills: string[]
  matchScore: number
  availability?: string
  onContact?: () => void
  onSave?: () => void
}

export function CandidateCard({
  name,
  sector,
  location,
  skills,
  matchScore,
  availability,
  onContact,
  onSave,
}: CandidateCardProps) {
  const scoreColor =
    matchScore >= 90
      ? 'text-green-600 dark:text-green-400'
      : matchScore >= 80
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-yellow-600 dark:text-yellow-400'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{name}</CardTitle>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Briefcase className="w-4 h-4" />
              {sector}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${scoreColor}`}>
              {matchScore}%
            </div>
            <p className="text-xs text-muted-foreground">Match</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            {location}
          </div>
        )}

        {availability && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="w-4 h-4" />
            {availability}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Skills</p>
          <div className="flex flex-wrap gap-2">
            {skills.map(skill => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {onContact && (
            <Button onClick={onContact} className="flex-1">
              Contact
            </Button>
          )}
          {onSave && (
            <Button onClick={onSave} variant="outline" className="flex-1">
              Save
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
