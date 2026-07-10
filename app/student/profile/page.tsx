'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { stripUndefined } from '@/lib/stripUndefined'
import { X } from 'lucide-react'
import type { Student } from '@/types'

export default function StudentProfilePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [profile, setProfile] = useState<Student & { id?: string }>({
    id: '',
    userId: user?.uid || '',
    fullName: '',
    email: user?.email || '',
    sector: '',
    seniority: '',
    currentCity: '',
    skills: [],
    experience: '',
    availability: 'not-looking',
    resume: undefined,
    credits: 0,
    status: 'active',
    createdAt: new Date() as any,
  })

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return

      try {
        const studentsQuery = query(
          collection(db, 'students'),
          where('userId', '==', user.uid)
        )
        const snapshot = await getDocs(studentsQuery)
        if (snapshot.docs.length > 0) {
          const data = snapshot.docs[0].data() as Student
          setProfile({ ...data, id: snapshot.docs[0].id })
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user?.uid])

  const handleSave = async () => {
    if (!user?.uid) return

    try {
      setSaving(true)
      const profileData = stripUndefined({
        ...profile,
        userId: user.uid,
      })

      if (profile.id) {
        await updateDoc(doc(db, 'students', profile.id), profileData)
      } else {
        const newDocRef = doc(collection(db, 'students'))
        await setDoc(newDocRef, { ...profileData, createdAt: new Date() })
        setProfile({ ...profile, id: newDocRef.id })
      }

      alert('Profile saved successfully!')
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !(profile.skills || []).includes(newSkill)) {
      setProfile({
        ...profile,
        skills: [...(profile.skills || []), newSkill],
      })
      setNewSkill('')
    }
  }

  const removeSkill = (skill: string) => {
    setProfile({
      ...profile,
      skills: (profile.skills || []).filter((s) => s !== skill),
    })
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Build your professional profile to attract employers
        </p>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Your professional details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              value={profile.fullName}
              onChange={(e) =>
                setProfile({ ...profile, fullName: e.target.value })
              }
              placeholder="John Doe"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Sector</label>
              <input
                type="text"
                value={profile.sector || ''}
                onChange={(e) =>
                  setProfile({ ...profile, sector: e.target.value })
                }
                placeholder="e.g., Technology"
                className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Seniority</label>
              <select
                value={profile.seniority || ''}
                onChange={(e) =>
                  setProfile({ ...profile, seniority: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select level</option>
                <option value="Junior">Junior</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
                <option value="Lead">Lead</option>
                <option value="Principal">Principal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Current City</label>
            <input
              type="text"
              value={profile.currentCity || ''}
              onChange={(e) =>
                setProfile({ ...profile, currentCity: e.target.value })
              }
              placeholder="e.g., San Francisco, CA"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
          <CardDescription>
            List your professional skills
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSkill()}
              placeholder="Add a skill..."
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button onClick={addSkill}>Add</Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(profile.skills || []).map((skill) => (
              <Badge key={skill} className="gap-1">
                {skill}
                <button
                  onClick={() => removeSkill(skill)}
                  className="ml-1 hover:bg-white/20"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardHeader>
          <CardTitle>Experience</CardTitle>
          <CardDescription>
            Describe your professional background
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={profile.experience || ''}
            onChange={(e) =>
              setProfile({ ...profile, experience: e.target.value })
            }
            placeholder="Share your work experience, achievements, and background..."
            rows={6}
            className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </CardContent>
      </Card>

      {/* Availability */}
      <Card>
        <CardHeader>
          <CardTitle>Job Availability</CardTitle>
          <CardDescription>
            Let employers know your job search status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="availability"
              value="actively-looking"
              checked={profile.availability === 'actively-looking'}
              onChange={(e) =>
                setProfile({ ...profile, availability: e.target.value })
              }
              className="cursor-pointer"
            />
            <label className="cursor-pointer text-sm">
              I&apos;m actively looking for opportunities
            </label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="availability"
              value="open-to-opportunities"
              checked={profile.availability === 'open-to-opportunities'}
              onChange={(e) =>
                setProfile({ ...profile, availability: e.target.value })
              }
              className="cursor-pointer"
            />
            <label className="cursor-pointer text-sm">
              I&apos;m open to opportunities
            </label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="availability"
              value="not-looking"
              checked={profile.availability === 'not-looking'}
              onChange={(e) =>
                setProfile({ ...profile, availability: e.target.value })
              }
              className="cursor-pointer"
            />
            <label className="cursor-pointer text-sm">
              I&apos;m not looking right now
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} size="lg" className="w-full">
        {saving ? 'Saving...' : 'Save Profile'}
      </Button>
    </div>
  )
}
