'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Edit, Eye } from 'lucide-react'
import type { Article } from '@/types'

export default function ContentPage() {
  const [articles, setArticles] = useState<(Article & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const articlesSnapshot = await getDocs(collection(db, 'articles'))
        const articlesData = articlesSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        } as Article & { id: string })
        )
        setArticles(articlesData)
      } catch (error) {
        console.error('Error fetching articles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [])

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return

    try {
      await deleteDoc(doc(db, 'articles', articleId))
      setArticles(articles.filter((a) => a.id !== articleId))
    } catch (error) {
      console.error('Error deleting article:', error)
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'published'
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage articles, blog posts, and other content
          </p>
        </div>
        <Link href="/admin/content/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Article
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Articles</CardTitle>
          <CardDescription>
            {articles.length} article{articles.length !== 1 ? 's' : ''} published or drafted
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No articles yet. Create your first article to get started.</p>
              <Link href="/admin/content/new" className="text-primary hover:underline mt-2 inline-block">
                Create Article
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{article.title}</h3>
                    <div className="flex gap-2 mt-2">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          article.status
                        )}`}
                      >
                        {article.status}
                      </span>
                      {article.category && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          {article.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/content/${article.id}/edit`}>
                      <button className="p-2 hover:bg-muted rounded transition-colors" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDeleteArticle(article.id)}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
