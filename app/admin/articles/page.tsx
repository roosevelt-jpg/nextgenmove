'use client'

import { useState, useContext } from 'react'
import { AuthContext } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Edit2, Trash2, Plus, Eye } from 'lucide-react'
import type { Article } from '@/types'

const mockArticles: (Article & { slug?: string })[] = [
  {
    id: '1',
    title: 'Getting Started with NextGenMove',
    slug: 'getting-started',
    excerpt: 'Learn how to set up your profile and start matching with opportunities.',
    body: 'Full article content...',
    category: 'Getting Started',
    tags: ['tutorial', 'setup'],
    author: 'Admin User',
    status: 'published',
    publishedDate: new Date() as any,
    createdAt: new Date() as any,
  },
  {
    id: '2',
    title: 'Best Practices for Job Applications',
    slug: 'job-application-tips',
    excerpt: 'Tips and tricks to improve your job application success rate.',
    body: 'Full article content...',
    category: 'Tips',
    tags: ['applications', 'tips'],
    author: 'Admin User',
    status: 'draft',
    createdAt: new Date() as any,
  },
]

export default function ArticlesPage() {
  const context = useContext(AuthContext)
  const user = context?.user
  const [articles, setArticles] = useState(mockArticles)

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this article?')) {
      setArticles(articles.filter((a) => a.id !== id))
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Articles & Blog</h1>
          <p className="text-muted-foreground mt-1">Manage platform articles and blog posts</p>
        </div>
        <Link href="/admin/articles/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Article
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Articles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Title</th>
                  <th className="text-left py-3 px-4 font-semibold">Category</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Views</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{article.title}</p>
                        <p className="text-xs text-muted-foreground">{article.slug}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">{article.category}</td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(article.status)}>
                        {article.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">-</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Link href={`/admin/articles/${article.id}`}>
                          <Button variant="outline" size="sm" className="gap-1">
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-destructive"
                          onClick={() => handleDelete(article.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
