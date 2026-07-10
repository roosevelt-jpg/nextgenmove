'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Briefcase, Users, Zap, TrendingUp } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">NextGenMove</h1>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Connect with the Right Talent
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            AI-powered talent matching platform connecting companies with exceptional professionals.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/jobs">
              <Button size="lg">Browse Jobs</Button>
            </Link>
            <Link href="/signup?role=company">
              <Button size="lg" variant="outline">
                Post a Job
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-20">
          {[
            { label: 'Active Jobs', value: '500+' },
            { label: 'Companies', value: '150+' },
            { label: 'Professionals', value: '5000+' },
            { label: 'Placements', value: '200+' },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-primary mb-2">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-secondary/50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-3xl font-bold text-center mb-12">Why Choose NextGenMove?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'AI-Powered Matching',
                description: 'Smart algorithms match your skills and preferences with ideal opportunities.',
              },
              {
                icon: Users,
                title: 'Expert Network',
                description: 'Connect with top companies and talented professionals in your industry.',
              },
              {
                icon: TrendingUp,
                title: 'Career Growth',
                description: 'Access resources and opportunities for continuous professional development.',
              },
            ].map(feature => {
              const Icon = feature.icon
              return (
                <Card key={feature.title}>
                  <CardContent className="p-6 space-y-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="font-semibold text-lg">{feature.title}</h4>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-primary text-primary-foreground rounded-lg p-12 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Find Your Next Opportunity?</h3>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of professionals and companies using NextGenMove.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/signup?role=student">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                For Job Seekers
              </Button>
            </Link>
            <Link href="/signup?role=company">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                For Companies
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background/50 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-muted-foreground text-sm">
          <p>&copy; 2024 NextGenMove. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
