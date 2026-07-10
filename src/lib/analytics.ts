// Analytics tracking utilities
// Configured for Vercel Analytics, Google Analytics, or PostHog

export interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  timestamp?: number
}

class Analytics {
  private events: AnalyticsEvent[] = []
  private isEnabled: boolean = true

  // Track an event
  trackEvent(name: string, properties?: Record<string, any>): void {
    if (!this.isEnabled) return

    const event: AnalyticsEvent = {
      name,
      properties,
      timestamp: Date.now(),
    }

    this.events.push(event)

    // Send to services
    this.sendToProviders(event)

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', name, properties)
    }
  }

  // Track page view
  trackPageView(pageName: string, properties?: Record<string, any>): void {
    this.trackEvent('page_view', {
      page: pageName,
      ...properties,
    })
  }

  // Track user action
  trackUserAction(action: string, metadata?: Record<string, any>): void {
    this.trackEvent('user_action', {
      action,
      ...metadata,
    })
  }

  // Track conversion
  trackConversion(conversionType: string, value?: number): void {
    this.trackEvent('conversion', {
      type: conversionType,
      value,
    })
  }

  // Track error (for analytics, not error reporting)
  trackError(errorName: string, errorMessage: string): void {
    this.trackEvent('error_tracked', {
      error: errorName,
      message: errorMessage,
    })
  }

  // Track user properties
  setUserProperties(userId: string, properties: Record<string, any>): void {
    // This would be sent to analytics provider
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', 'GA_ID', {
        'user_id': userId,
        ...properties,
      })
    }
  }

  // Get local events
  getEvents(): AnalyticsEvent[] {
    return [...this.events]
  }

  // Clear local events
  clearEvents(): void {
    this.events = []
  }

  // Export events
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2)
  }

  // Send to external providers
  private sendToProviders(event: AnalyticsEvent): void {
    // Vercel Analytics (built-in)
    if (typeof window !== 'undefined') {
      // Vercel Web Analytics tracks automatically
      // but we can send custom events
      try {
        (window as any).va?.track(event.name, event.properties)
      } catch (e) {
        // Provider not loaded
      }
    }

    // Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event.name, event.properties)
    }

    // PostHog (if configured)
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture(event.name, event.properties)
    }
  }
}

export const analytics = new Analytics()

// Event tracking helpers

export const trackingEvents = {
  // User events
  userSignup: () => analytics.trackEvent('user_signup'),
  userLogin: (method: string) => analytics.trackEvent('user_login', { method }),
  userLogout: () => analytics.trackEvent('user_logout'),
  userProfileCreated: () => analytics.trackEvent('user_profile_created'),
  userProfileUpdated: () => analytics.trackEvent('user_profile_updated'),

  // Job events
  jobPosted: (jobId: string) => analytics.trackEvent('job_posted', { jobId }),
  jobViewed: (jobId: string) => analytics.trackEvent('job_viewed', { jobId }),
  jobSearched: (query: string) => analytics.trackEvent('job_searched', { query }),
  jobApplied: (jobId: string) => analytics.trackEvent('job_applied', { jobId }),
  jobSaved: (jobId: string) => analytics.trackEvent('job_saved', { jobId }),

  // Application events
  applicationSubmitted: (jobId: string) => 
    analytics.trackEvent('application_submitted', { jobId }),
  applicationViewed: (appId: string) => 
    analytics.trackEvent('application_viewed', { appId }),
  applicationStatusUpdated: (appId: string, status: string) =>
    analytics.trackEvent('application_status_updated', { appId, status }),

  // Matching events
  matchingTriggered: (studentId: string, jobId: string) =>
    analytics.trackEvent('matching_triggered', { studentId, jobId }),
  matchesViewed: (count: number) =>
    analytics.trackEvent('matches_viewed', { count }),

  // Community events
  communityJoined: (communityId: string) =>
    analytics.trackEvent('community_joined', { communityId }),
  communityCreated: (communityId: string) =>
    analytics.trackEvent('community_created', { communityId }),
  postCreated: (communityId: string) =>
    analytics.trackEvent('post_created', { communityId }),

  // Event events
  eventAttended: (eventId: string) =>
    analytics.trackEvent('event_attended', { eventId }),
  eventViewed: (eventId: string) =>
    analytics.trackEvent('event_viewed', { eventId }),

  // Admin events
  adminActionExecuted: (action: string) =>
    analytics.trackEvent('admin_action', { action }),
  settingsUpdated: (setting: string) =>
    analytics.trackEvent('settings_updated', { setting }),

  // Feature usage
  featureUsed: (featureName: string) =>
    analytics.trackEvent('feature_used', { feature: featureName }),
  filterApplied: (filterType: string) =>
    analytics.trackEvent('filter_applied', { filter: filterType }),

  // Performance events
  pageLoadTime: (pageUrl: string, loadTime: number) =>
    analytics.trackEvent('page_load_time', { page: pageUrl, loadTime }),
  apiCallTime: (endpoint: string, duration: number) =>
    analytics.trackEvent('api_call_time', { endpoint, duration }),
}

// Conversion events
export const conversionEvents = {
  jobPosted: () => analytics.trackConversion('job_posted'),
  jobFilled: () => analytics.trackConversion('job_filled'),
  applicationAccepted: () => analytics.trackConversion('application_accepted'),
  studentHired: () => analytics.trackConversion('student_hired'),
  premiumSignup: (value: number) => analytics.trackConversion('premium_signup', value),
}

// Track page view with React Router
export function usePageTracking(): void {
  if (typeof window === 'undefined') return

  React.useEffect(() => {
    const page = window.location.pathname
    analytics.trackPageView(page, {
      referrer: document.referrer,
      host: window.location.host,
    })
  }, [])
}

// Error tracking wrapper
export function trackError(error: Error, context?: string): void {
  analytics.trackError(error.name, error.message)
  console.error('[Tracked Error]', context, error)
}

// Verify tracking is working
export function verifyAnalyticsSetup(): {
  vercelAnalytics: boolean
  googleAnalytics: boolean
  postHog: boolean
  customEvents: number
} {
  return {
    vercelAnalytics: typeof (window as any)?.va !== 'undefined',
    googleAnalytics: typeof (window as any)?.gtag !== 'undefined',
    postHog: typeof (window as any)?.posthog !== 'undefined',
    customEvents: analytics.getEvents().length,
  }
}

import React from 'react'
