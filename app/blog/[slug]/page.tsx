'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const mockArticle = {
  id: '1',
  title: 'Getting Started with NextGenMove',
  slug: 'getting-started',
  excerpt: 'Learn how to set up your profile and start matching with opportunities.',
  body: `# Getting Started with NextGenMove

Welcome to NextGenMove, your gateway to finding the perfect job or talent match!

## Creating Your Profile

The first step is to create your profile. Here's what you need:

1. **Basic Information** - Your name, email, and role (Student or Company)
2. **Profile Picture** - A professional photo helps you stand out
3. **Skills & Experience** - For students, highlight your skills and experience
4. **Company Details** - For employers, fill in company information and requirements

## Finding Opportunities

Once your profile is set up, you can start browsing opportunities:

- **Job Board** - Browse all available positions
- **Recommendations** - Get AI-powered job recommendations
- **Saved Jobs** - Bookmark interesting positions for later

## Submitting Applications

Applying is simple:

1. Find a job you're interested in
2. Click "Apply"
3. Review your profile information
4. Submit your application

The employer will receive your application and may reach out for next steps.

## Tips for Success

- **Complete Your Profile** - A complete profile increases your chances of being matched
- **Update Regularly** - Keep your skills and experience current
- **Be Specific** - The more details you provide, the better matches you'll get

Good luck with your job search!`,
  category: 'Getting Started',
  tags: ['tutorial', 'setup'],
  author: 'Admin User',
  coverImageUrl: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&h=400&fit=crop',
  status: 'published',
  publishedDate: new Date('2024-07-10'),
  createdAt: new Date('2024-07-10'),
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Back Button */}
        <Link href="/blog" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        {/* Article Header */}
        <article>
          <div className="mb-6">
            <div className="flex gap-2 flex-wrap mb-4">
              <Badge>{mockArticle.category}</Badge>
              <span className="text-sm text-muted-foreground">
                {new Date(mockArticle.publishedDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <span className="text-sm text-muted-foreground">by {mockArticle.author}</span>
            </div>

            <h1 className="text-4xl font-bold mb-4">{mockArticle.title}</h1>
            <p className="text-xl text-muted-foreground mb-6">{mockArticle.excerpt}</p>

            {mockArticle.publishedDate && (
              <span className="text-xs text-muted-foreground block mb-4">
                Published: {new Date(mockArticle.publishedDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}

            {mockArticle.coverImageUrl && (
              <img
                src={mockArticle.coverImageUrl}
                alt={mockArticle.title}
                className="w-full h-96 object-cover rounded-lg mb-8"
              />
            )}
          </div>

          {/* Article Content */}
          <div className="prose prose-sm max-w-none dark:prose-invert mb-8">
            {mockArticle.body.split('\n\n').map((paragraph, idx) => {
              if (paragraph.startsWith('#')) {
                const level = paragraph.match(/^#+/)?.[0].length || 1
                const text = paragraph.replace(/^#+\s/, '')
                const headingClass = {
                  1: 'text-3xl font-bold mt-8 mb-4',
                  2: 'text-2xl font-bold mt-6 mb-3',
                  3: 'text-xl font-bold mt-4 mb-2',
                }[level as 1 | 2 | 3] || 'text-lg font-bold'
                return (
                  <p key={idx} className={headingClass}>
                    {text}
                  </p>
                )
              }
              if (paragraph.startsWith('-')) {
                const items = paragraph.split('\n').filter((l) => l.startsWith('-'))
                return (
                  <ul key={idx} className="list-disc list-inside space-y-2 mb-4">
                    {items.map((item, i) => (
                      <li key={i} className="text-foreground">
                        {item.replace(/^-\s/, '')}
                      </li>
                    ))}
                  </ul>
                )
              }
              if (paragraph.match(/^\d+\./)) {
                const items = paragraph.split('\n').filter((l) => l.match(/^\d+\./))
                return (
                  <ol key={idx} className="list-decimal list-inside space-y-2 mb-4">
                    {items.map((item, i) => (
                      <li key={i} className="text-foreground">
                        {item.replace(/^\d+\.\s/, '')}
                      </li>
                    ))}
                  </ol>
                )
              }
              return (
                <p key={idx} className="text-foreground mb-4 leading-relaxed">
                  {paragraph}
                </p>
              )
            })}
          </div>

          {/* Tags */}
          {mockArticle.tags && mockArticle.tags.length > 0 && (
            <Card className="bg-muted/50 border-0">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Tags:</p>
                  <div className="flex gap-2 flex-wrap">
                    {mockArticle.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </article>
      </div>
    </div>
  )
}
