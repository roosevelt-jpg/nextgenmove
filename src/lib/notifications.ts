import { db } from './firebase-client'
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  writeBatch,
  limit,
  orderBy,
} from 'firebase/firestore'
import type { Notification } from '@/types'

export type NotificationType = 'job_application' | 'job_match' | 'message' | 'event_update' | 'community_invite' | 'system'

export interface CreateNotificationPayload {
  userId: string
  type: NotificationType
  title: string
  message: string
  relatedId?: string
  relatedType?: string
  actionUrl?: string
}

// Create a new notification
export async function createNotification(payload: CreateNotificationPayload): Promise<string> {
  const notificationRef = collection(db, 'notifications')
  const docRef = await addDoc(notificationRef, {
    ...payload,
    read: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const notifRef = doc(db, 'notifications', notificationId)
  await updateDoc(notifRef, {
    read: true,
    readAt: serverTimestamp(),
  })
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const notificationsRef = collection(db, 'notifications')
  const q = query(notificationsRef, where('userId', '==', userId), where('read', '==', false))
  
  const snapshot = await getDocs(q)
  const batch = writeBatch(db)
  
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      read: true,
      readAt: serverTimestamp(),
    })
  })
  
  await batch.commit()
}

// Subscribe to user notifications in real-time
export function subscribeToNotifications(
  userId: string,
  onUpdate: (notifications: Notification[]) => void
) {
  const notificationsRef = collection(db, 'notifications')
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  )

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Notification))
    onUpdate(notifications)
  })

  return unsubscribe
}

// Get unread notification count
export function subscribeToUnreadCount(
  userId: string,
  onUpdate: (count: number) => void
) {
  const notificationsRef = collection(db, 'notifications')
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    where('read', '==', false)
  )

  const unsubscribe = onSnapshot(q, (snapshot) => {
    onUpdate(snapshot.size)
  })

  return unsubscribe
}

// Notification templates
export const notificationTemplates = {
  jobApplication: (companyName: string, jobTitle: string) => ({
    title: 'New Job Application',
    message: `${companyName} received your application for "${jobTitle}"`,
    type: 'job_application' as NotificationType,
  }),

  jobMatch: (matchScore: number) => ({
    title: 'New Job Match',
    message: `We found a job that matches ${matchScore}% of your skills!`,
    type: 'job_match' as NotificationType,
  }),

  applicationAccepted: (companyName: string) => ({
    title: 'Application Accepted',
    message: `Great news! ${companyName} accepted your application.`,
    type: 'system' as NotificationType,
  }),

  applicationRejected: (companyName: string) => ({
    title: 'Application Update',
    message: `${companyName} has moved forward with other candidates.`,
    type: 'system' as NotificationType,
  }),

  eventReminder: (eventName: string) => ({
    title: 'Event Reminder',
    message: `Reminder: ${eventName} is starting in 1 hour!`,
    type: 'event_update' as NotificationType,
  }),

  communityInvite: (communityName: string) => ({
    title: 'Community Invitation',
    message: `You've been invited to join ${communityName}`,
    type: 'community_invite' as NotificationType,
  }),

  message: (senderName: string) => ({
    title: 'New Message',
    message: `${senderName} sent you a message`,
    type: 'message' as NotificationType,
  }),
}

// Email notification helpers
export async function sendEmailNotification(
  email: string,
  template: string,
  data: Record<string, any>
): Promise<void> {
  // This would call your email service (SendGrid, Resend, etc)
  // For now, we're creating the infrastructure
  try {
    const response = await fetch('/api/notifications/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        template,
        data,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to send email notification')
    }
  } catch (error) {
    console.error('Email notification error:', error)
    // Log to Sentry in production
  }
}

// Batch create notifications for multiple users
export async function createBulkNotifications(
  userIds: string[],
  template: Omit<CreateNotificationPayload, 'userId'>
): Promise<string[]> {
  const notificationIds: string[] = []
  
  for (const userId of userIds) {
    const id = await createNotification({
      ...template,
      userId,
    })
    notificationIds.push(id)
  }

  return notificationIds
}

// Clean up old notifications (run periodically)
export async function cleanupOldNotifications(daysOld: number = 90): Promise<number> {
  const notificationsRef = collection(db, 'notifications')
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)
  
  const q = query(
    notificationsRef,
    where('createdAt', '<', cutoffDate),
    where('read', '==', true)
  )

  const snapshot = await getDocs(q)
  const batch = writeBatch(db)
  let count = 0

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
    count++
  })

  if (count > 0) {
    await batch.commit()
  }

  return count
}
