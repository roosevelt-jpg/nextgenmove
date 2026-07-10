'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { stripUndefined } from '@/lib/stripUndefined'
import type { Company } from '@/types'

export default function CompanyProfilePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState<Company & { id?: string }>({
    id: '',
    userId: user?.uid || '',
    name: '',
    contactEmail: user?.email || '',
    logoUrl: undefined,
    industry: '',
    website: '',
    plan: null,
    subscriptionStatus: 'inactive',
    requirements: undefined,
    createdAt: new Date() as any,
  })

  useEffect(() => {
    const fetchCompany = async () => {
      if (!user?.uid) return

      try {
        const companiesQuery = query(
          collection(db, 'companies'),
          where('userId', '==', user.uid)
        )
        const snapshot = await getDocs(companiesQuery)
        if (snapshot.docs.length > 0) {
          const data = snapshot.docs[0].data() as Company
          setCompany({ ...data, id: snapshot.docs[0].id })
        }
      } catch (error) {
        console.error('Error fetching company:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCompany()
  }, [user?.uid])

  const handleSave = async () => {
    if (!user?.uid) return

    try {
      setSaving(true)
      const companyData = stripUndefined({
        ...company,
        userId: user.uid,
      })

      if (company.id) {
        await updateDoc(doc(db, 'companies', company.id), companyData)
      } else {
        const newDocRef = doc(collection(db, 'companies'))
        await setDoc(newDocRef, { ...companyData, createdAt: new Date() })
        setCompany({ ...company, id: newDocRef.id })
      }

      alert('Profile saved successfully!')
    } catch (error) {
      console.error('Error saving company:', error)
      alert('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your company information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Your company details visible to candidates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Company Name</label>
            <input
              type="text"
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
              placeholder="Acme Inc."
              className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Contact Email</label>
            <input
              type="email"
              value={company.contactEmail}
              onChange={(e) =>
                setCompany({ ...company, contactEmail: e.target.value })
              }
              className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Industry</label>
            <input
              type="text"
              value={company.industry || ''}
              onChange={(e) =>
                setCompany({ ...company, industry: e.target.value })
              }
              placeholder="e.g., Technology, Finance"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Website</label>
            <input
              type="url"
              value={company.website || ''}
              onChange={(e) =>
                setCompany({ ...company, website: e.target.value })
              }
              placeholder="https://acme.com"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requirements</CardTitle>
          <CardDescription>
            Upload files required from candidates (e.g., screening forms, NDAs)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>File upload coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
