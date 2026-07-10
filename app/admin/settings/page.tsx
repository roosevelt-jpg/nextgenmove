'use client'

import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { stripUndefined } from '@/lib/stripUndefined'

interface AppSettings {
  appName: string
  appDescription: string
  supportEmail: string
  maxUploadSize: number
  allowNewSignups: boolean
  sectors: string[]
  employmentTypes: string[]
  seniorityLevels: string[]
}

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'NextGenMove',
  appDescription: 'Talent matching and recruitment platform',
  supportEmail: 'support@nextgenmove.com',
  maxUploadSize: 10485760,
  allowNewSignups: true,
  sectors: [
    'Technology',
    'Finance',
    'Healthcare',
    'Marketing',
    'Operations',
    'Design',
  ],
  employmentTypes: ['Full-Time', 'Part-Time', 'Contract', 'Internship'],
  seniorityLevels: ['Junior', 'Mid', 'Senior', 'Lead', 'Principal'],
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newSector, setNewSector] = useState('')

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'system', 'settings'))
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as AppSettings)
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      await setDoc(doc(db, 'system', 'settings'), stripUndefined(settings))
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const addSector = () => {
    if (newSector.trim() && !settings.sectors.includes(newSector)) {
      setSettings({
        ...settings,
        sectors: [...settings.sectors, newSector],
      })
      setNewSector('')
    }
  }

  const removeSector = (sector: string) => {
    setSettings({
      ...settings,
      sectors: settings.sectors.filter((s) => s !== sector),
    })
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure application settings and taxonomies
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Basic application settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">App Name</label>
                <input
                  type="text"
                  value={settings.appName}
                  onChange={(e) =>
                    setSettings({ ...settings, appName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={settings.appDescription}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      appDescription: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Support Email
                </label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, supportEmail: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.allowNewSignups}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      allowNewSignups: e.target.checked,
                    })
                  }
                  className="w-4 h-4 cursor-pointer"
                />
                <label className="text-sm font-medium cursor-pointer">
                  Allow New Signups
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Sectors Taxonomy */}
          <Card>
            <CardHeader>
              <CardTitle>Sectors</CardTitle>
              <CardDescription>
                Available industry sectors for companies and students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSector()}
                  placeholder="Enter new sector..."
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button onClick={addSector}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.sectors.map((sector) => (
                  <div
                    key={sector}
                    className="flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm"
                  >
                    {sector}
                    <button
                      onClick={() => removeSector(sector)}
                      className="text-primary-foreground/60 hover:text-primary-foreground"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Employment Types */}
          <Card>
            <CardHeader>
              <CardTitle>Employment Types</CardTitle>
              <CardDescription>
                Types of employment available for job postings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {settings.employmentTypes.map((type) => (
                  <div key={type} className="text-sm">
                    {type}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex gap-2">
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
