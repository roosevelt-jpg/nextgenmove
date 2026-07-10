'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Mail, MessageSquare } from 'lucide-react'

interface NotificationSetting {
  id: string
  label: string
  description: string
  enabled: boolean
  icon: React.ReactNode
}

interface NotificationPreferences {
  emailNotifications: boolean
  pushNotifications: boolean
  smsNotifications: boolean
  jobMatches: boolean
  applications: boolean
  messages: boolean
  events: boolean
  community: boolean
  newsletter: boolean
}

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
    jobMatches: true,
    applications: true,
    messages: true,
    events: true,
    community: true,
    newsletter: false,
  })

  const [saved, setSaved] = useState(false)

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    try {
      // TODO: Save to Firestore
      // await updateDoc(userRef, { notificationPreferences: preferences })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Failed to save preferences:', error)
    }
  }

  const settings: NotificationSetting[] = [
    {
      id: 'emailNotifications',
      label: 'Email Notifications',
      description: 'Receive updates via email',
      enabled: preferences.emailNotifications,
      icon: <Mail className="w-4 h-4" />,
    },
    {
      id: 'pushNotifications',
      label: 'Push Notifications',
      description: 'Browser notifications for important updates',
      enabled: preferences.pushNotifications,
      icon: <Bell className="w-4 h-4" />,
    },
    {
      id: 'jobMatches',
      label: 'Job Matches',
      description: 'When new jobs match your profile',
      enabled: preferences.jobMatches,
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      id: 'applications',
      label: 'Application Updates',
      description: 'Status changes on your applications',
      enabled: preferences.applications,
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      id: 'messages',
      label: 'Messages',
      description: 'New messages from companies or peers',
      enabled: preferences.messages,
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      id: 'events',
      label: 'Event Updates',
      description: 'Reminders for registered events',
      enabled: preferences.events,
      icon: <Bell className="w-4 h-4" />,
    },
    {
      id: 'community',
      label: 'Community Activity',
      description: 'Updates from joined communities',
      enabled: preferences.community,
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      id: 'newsletter',
      label: 'Weekly Newsletter',
      description: 'Curated opportunities and tips',
      enabled: preferences.newsletter,
      icon: <Mail className="w-4 h-4" />,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Manage how and when you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {settings.map((setting) => (
          <div key={setting.id} className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-primary">{setting.icon}</div>
              <div>
                <p className="font-medium text-sm">{setting.label}</p>
                <p className="text-xs text-muted-foreground">{setting.description}</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle(setting.id as keyof NotificationPreferences)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                setting.enabled ? 'bg-primary' : 'bg-muted'
              }`}
              role="switch"
              aria-checked={setting.enabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  setting.enabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}

        <div className="pt-4 flex gap-3">
          <Button onClick={handleSave} className="flex-1">
            Save Preferences
          </Button>
          {saved && (
            <div className="text-xs text-green-600 flex items-center gap-1">
              ✓ Saved
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
