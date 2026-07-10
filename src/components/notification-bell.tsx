'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { subscribeToNotifications, subscribeToUnreadCount, markNotificationAsRead } from '@/lib/notifications'
import type { Notification } from '@/types'

interface NotificationBellProps {
  userId: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    // Subscribe to notifications
    const unsubscribeNotifications = subscribeToNotifications(userId, (notifs) => {
      setNotifications(notifs)
      setLoading(false)
    })

    // Subscribe to unread count
    const unsubscribeCount = subscribeToUnreadCount(userId, (count) => {
      setUnreadCount(count)
    })

    return () => {
      unsubscribeNotifications()
      unsubscribeCount()
    }
  }, [userId])

  const handleNotificationClick = async (notifId: string) => {
    await markNotificationAsRead(notifId)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-muted rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="font-semibold">Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No notifications</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif.id)}
                  className={`p-4 border-b border-border last:border-0 cursor-pointer hover:bg-muted transition-colors ${
                    !notif.read ? 'bg-blue-50 dark:bg-blue-950' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${!notif.read ? 'bg-blue-500' : 'transparent'}`} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(notif.createdAt as any).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-border text-center">
              <a href="/notifications" className="text-sm text-primary hover:underline">
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
