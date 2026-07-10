# NextGenMove Analytics & Error Monitoring Setup

## Overview

This guide covers setting up analytics tracking and error monitoring for NextGenMove to track user behavior, platform performance, and system health.

---

## 1. Analytics Setup

### Vercel Analytics (Recommended - Zero Configuration)

Vercel Analytics provides web vitals automatically with zero configuration.

**Setup**:
1. Go to Vercel Dashboard
2. Select Project → Settings → Analytics
3. Enable Web Analytics

**What it tracks automatically**:
- Core Web Vitals (LCP, FID, CLS)
- Page load time
- First Contentful Paint
- Time to First Byte
- Edge request count

**Access**: Vercel Dashboard → Analytics tab

### Custom Event Tracking

Use the built-in analytics utility:

```typescript
import { analytics, trackingEvents } from '@/lib/analytics'

// Track user signup
trackingEvents.userSignup()

// Track job application
trackingEvents.jobApplied(jobId)

// Track search
trackingEvents.jobSearched('React Developer')

// Custom event
analytics.trackEvent('custom_event', {
  property1: 'value',
  property2: 123,
})
```

### Google Analytics Setup

**Installation**:

```bash
npm install @react-ga/core @react-ga/hooks
```

**Configuration** (in layout.tsx):

```typescript
import ReactGA from '@react-ga/core'

export default function RootLayout({ children }) {
  useEffect(() => {
    ReactGA.initialize('GA_MEASUREMENT_ID')
  }, [])

  return <>{children}</>
}
```

**Tracking Events**:

```typescript
import { usePageTracker } from '@react-ga/hooks'

export function MyComponent() {
  usePageTracker() // Tracks page views

  return <div onClick={() => gtag.event('click')}>Click me</div>
}
```

### PostHog Setup (Advanced)

**Installation**:

```bash
npm install posthog-js
```

**Configuration** (in layout.tsx):

```typescript
import posthog from 'posthog-js'

export default function RootLayout({ children }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    })
  }, [])

  return <>{children}</>
}
```

---

## 2. Key Metrics to Track

### User Engagement Metrics

```typescript
// Track user signup funnel
trackingEvents.userSignup() // Beginning
trackingEvents.userProfileCreated() // Mid
trackingEvents.userProfileUpdated() // Completed
```

### Job Application Metrics

```typescript
// Track conversion funnel
trackingEvents.jobViewed(jobId) // Discovery
trackingEvents.jobApplied(jobId) // Application
trackingEvents.applicationSubmitted(jobId) // Completion
```

### Feature Usage

```typescript
// Track feature adoption
trackingEvents.featureUsed('matching_algorithm')
trackingEvents.featureUsed('community_feature')
trackingEvents.filterApplied('sector_filter')
```

### Performance Metrics

```typescript
// Track performance
trackingEvents.pageLoadTime('/jobs', 1234) // ms
trackingEvents.apiCallTime('/api/jobs', 456) // ms
```

---

## 3. Error Monitoring with Sentry

### Setup Instructions

**Step 1: Create Sentry Account**
- Go to https://sentry.io
- Sign up and create new project
- Select "Next.js" framework

**Step 2: Install Dependencies**

```bash
npm install @sentry/nextjs
```

**Step 3: Initialize Sentry**

Create `sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  beforeSend(event) {
    // Filter out certain errors
    return event
  },
})
```

**Step 4: Add to .env.local**

```
NEXT_PUBLIC_SENTRY_DSN=https://key@sentry.io/project-id
```

**Step 5: Wrap App**

In `app/layout.tsx`:

```typescript
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function RootLayout({ children }) {
  useEffect(() => {
    // Initialize error monitoring
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    })
  }, [])

  return <>{children}</>
}
```

### Using Error Monitoring

```typescript
import { errorMonitor, handleError } from '@/lib/error-monitoring'

// Log errors
try {
  await riskyOperation()
} catch (error) {
  errorMonitor.logError(error as Error, {
    operation: 'riskyOperation',
    userId: user.id,
  })
}

// Track warnings
errorMonitor.logWarning('Low memory detected', { memory: '90%' })

// Custom error types
import { ValidationError, NotFoundError } from '@/lib/error-monitoring'

throw new ValidationError('Invalid email format')
throw new NotFoundError('User')
```

### Error Monitoring Dashboard

Access Sentry Dashboard:
1. Go to https://sentry.io
2. View Issue Trends
3. Filter by release, environment, user
4. Set up alerts for critical errors

---

## 4. User Tracking & Privacy

### Privacy Considerations

**GDPR Compliance**:
- Get consent before tracking
- Allow users to opt-out
- Implement data retention policies

**Implementation**:

```typescript
// Check cookie consent
function shouldTrack(): boolean {
  return localStorage.getItem('analytics_consent') === 'true'
}

// Disable tracking if not consented
if (!shouldTrack()) {
  analytics.clearEvents()
}
```

### Sensitive Data

Do NOT track:
- Passwords
- Credit card numbers
- API keys
- Personal identification numbers

Track only:
- User ID (anonymized)
- Actions taken
- Feature usage
- Performance metrics

---

## 5. Dashboard Setup

### Vercel Analytics Dashboard

View in Vercel Console:
1. Project → Settings → Analytics
2. View Core Web Vitals
3. Track page performance over time
4. Monitor edge function performance

### Sentry Dashboard

Monitors & alerts:
1. Error trends
2. Performance degradation
3. Release health
4. User impact

Setup alerts:
```
Alerts → Create Alert Rule
When error count > 10 in 5 minutes
Send to Slack/Email
```

### Google Analytics Reporting

Standard reports:
- User engagement
- Traffic sources
- Device breakdown
- Geographic distribution

Custom reports:
- Funnel analysis
- Cohort analysis
- User retention

---

## 6. Performance Metrics Dashboard

Monitor Core Web Vitals:

```typescript
import { captureWebVitals } from '@/lib/performance'

// In app/layout.tsx
useEffect(() => {
  captureWebVitals((vitals) => {
    console.log('Web Vitals:', vitals)
    
    // Send to Sentry for Performance Monitoring
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureMessage('Web Vitals', {
        contexts: { vitals },
      })
    }
  })
}, [])
```

### Key Metrics to Monitor

- **LCP** (Largest Contentful Paint): Should be < 2.5s
- **FID** (First Input Delay): Should be < 100ms
- **CLS** (Cumulative Layout Shift): Should be < 0.1
- **TTFB** (Time to First Byte): Should be < 600ms

---

## 7. Configuration by Environment

### Development

```
NEXT_PUBLIC_ANALYTICS_DEBUG=true
NEXT_PUBLIC_SENTRY_DSN= (disabled)
```

Features:
- Local event logging
- Console output for all events
- No external services

### Staging

```
NEXT_PUBLIC_ANALYTICS_DEBUG=false
NEXT_PUBLIC_SENTRY_DSN=https://staging@sentry.io/project
```

Features:
- Full analytics tracking
- Sentry error reporting
- 50% transaction sampling

### Production

```
NEXT_PUBLIC_ANALYTICS_DEBUG=false
NEXT_PUBLIC_SENTRY_DSN=https://prod@sentry.io/project
```

Features:
- Full analytics tracking
- Sentry error reporting with alerts
- 10% transaction sampling
- Real User Monitoring enabled

---

## 8. Event Tracking Implementation

### User Events

```typescript
// Registration funnel
trackingEvents.userSignup() // Step 1
await createProfile()
trackingEvents.userProfileCreated() // Step 2

// Login
trackingEvents.userLogin('email')

// Logout
trackingEvents.userLogout()
```

### Application Events

```typescript
// Job discovery
trackingEvents.jobSearched('React')
trackingEvents.jobViewed(jobId)
trackingEvents.jobSaved(jobId)

// Application
trackingEvents.jobApplied(jobId)
trackingEvents.applicationSubmitted(jobId)

// Status updates
trackingEvents.applicationStatusUpdated(appId, 'accepted')
```

### Business Events (Conversions)

```typescript
// Conversion tracking
conversionEvents.jobPosted() // When company posts
conversionEvents.jobFilled() // When position filled
conversionEvents.studentHired() // Key conversion
conversionEvents.premiumSignup(499) // Revenue-tracked
```

---

## 9. Data Retention Policy

### Event Data

- Keep for 90 days minimum
- Delete after 2 years
- Archive anonymized data

### Error Logs

- Keep for 30 days (development)
- Keep for 90 days (production)
- Alert on critical errors immediately

### User Data

- Only store user ID (anonymized)
- Don't track PII
- Comply with GDPR

---

## 10. Monitoring Checklist

### Daily
- [ ] Check Sentry for critical errors
- [ ] Review error spike notifications
- [ ] Monitor API response times

### Weekly
- [ ] Review conversion metrics
- [ ] Check Core Web Vitals trends
- [ ] Analyze user engagement

### Monthly
- [ ] Generate full analytics report
- [ ] Identify trends and anomalies
- [ ] Optimize based on findings

---

## 11. Cost Optimization

### Vercel Analytics
- Free tier: 3 projects
- $10/month per additional project

### Sentry
- Free tier: 5,000 errors/month
- Pay as you go: $0.000029 per event

### Google Analytics
- Free
- Premium: $150,000/year

---

## Environment Variables

Add to `.env.local`:

```
# Vercel Analytics (automatic)
NEXT_PUBLIC_VERCEL_ENV=production

# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G_XXXXXXXXXX

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://key@sentry.io/project-id

# PostHog (optional)
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Custom logging endpoint
NEXT_PUBLIC_ERROR_LOG_ENDPOINT=/api/logs/errors
```

---

## Resources

- [Vercel Analytics](https://vercel.com/docs/analytics)
- [Sentry Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Google Analytics 4](https://analytics.google.com)
- [PostHog Documentation](https://posthog.com/docs)

---

Last Updated: July 2024
Next Review: Monthly
