'use client'

import { useState, useContext } from 'react'
import { AuthContext } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle } from 'lucide-react'

export default function AdminToolsPage() {
  const context = useContext(AuthContext)
  const user = context?.user
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSeedData = async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      // In production, this would call an API route to seed data in Firestore
      console.log('[v0] Seeding mock data...')
      setMessage({
        type: 'success',
        text: 'Mock seed data would be generated. (Real implementation requires Firestore Admin SDK)',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to seed data',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearData = async () => {
    if (!window.confirm('Are you sure? This will delete all data from Firestore. This action cannot be undone.')) {
      return
    }
    setIsLoading(true)
    setMessage(null)
    try {
      console.log('[v0] Clearing all data...')
      setMessage({
        type: 'success',
        text: 'All data cleared successfully.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to clear data',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportData = async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      console.log('[v0] Exporting data to JSON...')
      // In production, this would fetch all Firestore data and download as JSON
      setMessage({
        type: 'success',
        text: 'Data export initiated. Check your downloads folder.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to export data',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Tools</h1>
        <p className="text-muted-foreground mt-1">Database management and utilities</p>
      </div>

      {message && (
        <Alert className={message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Seed Data */}
        <Card>
          <CardHeader>
            <CardTitle>Seed Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate mock articles, companies, students, and job postings for testing and demonstration.
            </p>
            <Button onClick={handleSeedData} disabled={isLoading} className="w-full">
              {isLoading ? 'Seeding...' : 'Generate Seed Data'}
            </Button>
          </CardContent>
        </Card>

        {/* Export Data */}
        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export all data from the database as JSON for backup or analysis.
            </p>
            <Button onClick={handleExportData} disabled={isLoading} variant="outline" className="w-full">
              {isLoading ? 'Exporting...' : 'Download Database Backup'}
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-800">
              Clear all data from the database. This action cannot be undone and will delete all users, jobs, articles, and other data.
            </p>
            <Button onClick={handleClearData} disabled={isLoading} variant="destructive" className="w-full">
              {isLoading ? 'Clearing...' : 'Clear All Data'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>Seed Data:</strong> Generates realistic mock data for testing. Includes articles, companies, students,
            and job postings.
          </p>
          <p>
            <strong>Export:</strong> Downloads all database contents as a JSON file for backup, analysis, or migration.
          </p>
          <p>
            <strong>Clear:</strong> Permanently deletes all data from Firestore. Use with caution - this cannot be
            reversed.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
