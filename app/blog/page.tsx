'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { Article } from '@/types'

const mockArticles: (Article & { slug: string; viewCount?: number })[] = [
  {
    id: '1',
    title: 'Getting Started with NextGenMove',
    slug: 'getting-started',
    excerpt: 'Learn how to set up your profile and start matching with opportunities.',
    body: '',
    category: 'Getting Started',
    tags: ['tutorial', 'setup'],
    author: 'Admin User',
    coverImageUrl: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=400&h=300&fit=crop',
    status: 'published',
    publishedDate: new Date('2024-07-10') as any,
    createdAt: new Date('2024-07-10') as any,
    viewCount: 234,
  },
  {
    id: '3',
    title: 'Top 5 Skills Employers Are Looking For',
    slug: 'top-skills-employers',
    excerpt: 'Discover the most in-demand skills and how to develop them.',
    body: '',
    category: 'Tips',
    tags: ['skills', 'career'],
    author: 'Admin User',
    coverImageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop',
    status: 'published',
    publishedDate: new Date('2024-07-05') as any,
    createdAt: new Date('2024-07-05') as any,
    viewCount: 567,
  },
]

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const categories = ['All', 'Getting Started', 'Tips', 'Case Study', 'Update']
  const filteredArticles = mockArticles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold">NextGenMove Blog</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Tips, insights, and updates for job seekers and employers
          </p>
        </div>

        {/* Search & Filter */}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />

          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid gap-6">
          {filteredArticles.length > 0 ? (
            filteredArticles.map((article) => (
              <Link key={article.id} href={`/blog/${article.slug}`}>
                <Card className="overflow-hidden hover:shadow-lg transition cursor-pointer">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {article.coverImageUrl && (
                      <div className="md:col-span-1 h-48 md:h-auto bg-muted overflow-hidden">
                        <img
                          src={article.coverImageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover hover:scale-105 transition"
                        />
                      </div>
                    )}
                    <div className={article.coverImageUrl ? 'md:col-span-2 p-6' : 'col-span-1 p-6'}>
                      <CardHeader className="p-0 pb-2">
                        <div className="flex gap-2 flex-wrap mb-2">
                          <Badge variant="outline">{article.category}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {article.publishedDate
                              ? new Date(article.publishedDate as any).toLocaleDateString()
                              : 'Unpublished'}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold">{article.title}</h3>
                      </CardHeader>
                      <CardContent className="p-0">
                        <p className="text-muted-foreground mb-4">{article.excerpt}</p>
                        <div className="flex gap-1 flex-wrap">
                          {article.tags?.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No articles found matching your criteria.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
