# NextGenMove Performance Optimization Guide

## Performance Targets

- Page Load Time: < 2 seconds
- Lighthouse Score: > 85
- LCP (Largest Contentful Paint): < 2.5 seconds
- FCP (First Contentful Paint): < 1.5 seconds
- CLS (Cumulative Layout Shift): < 0.1
- Time to Interactive: < 3.5 seconds

---

## 1. Code-Level Optimizations

### Component Optimization

Use React.memo for expensive components:
```typescript
import { memo } from 'react'

const ExpensiveComponent = memo(({ data }) => {
  return <div>{data}</div>
})
```

Implement proper memoization:
```typescript
import { useMemo, useCallback } from 'react'

function MyComponent() {
  const memoizedValue = useMemo(() => {
    return expensiveCalculation()
  }, [dependencies])

  const memoizedCallback = useCallback(() => {
    doSomethingWith(memoizedValue)
  }, [memoizedValue])

  return <div onClick={memoizedCallback}>{memoizedValue}</div>
}
```

### Dynamic Imports

Code split heavy components:
```typescript
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('@/components/heavy'), {
  loading: () => <LoadingSpinner />,
  ssr: false, // Disable SSR if not needed
})

export function Page() {
  return <HeavyComponent />
}
```

### Query Optimization

Always use pagination:
```typescript
// Efficient - uses index
const q = query(
  collection(db, 'students'),
  where('sector', '==', 'Technology'),
  orderBy('createdAt', 'desc'),
  limit(20) // Crucial!
)
```

Avoid N+1 queries:
```typescript
// Bad - multiple queries in loop
for (const student of students) {
  const profile = await getDoc(doc(db, 'profiles', student.id))
}

// Good - batch load
const profileDocs = await Promise.all(
  students.map(s => getDoc(doc(db, 'profiles', s.id)))
)
```

---

## 2. Image Optimization

### Image Loading

Use Next.js Image component:
```typescript
import Image from 'next/image'

export function Avatar({ url, name }) {
  return (
    <Image
      src={url}
      alt={name}
      width={40}
      height={40}
      priority={false} // Set to true for above-fold images
    />
  )
}
```

Implement lazy loading:
```typescript
<Image
  src="/large-image.jpg"
  alt="Description"
  loading="lazy"
  width={1200}
  height={600}
/>
```

### Image Formats

Use modern formats:
- WebP for modern browsers
- JPEG as fallback
- Serve appropriate sizes for device

---

## 3. Bundle Size Optimization

### Current Bundle Analysis

Run bundle analysis:
```bash
# Install next-bundle-analyzer
npm install --save-dev @next/bundle-analyzer

# Add to next.config.mjs
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

export default withBundleAnalyzer(nextConfig)

# Generate report
ANALYZE=true npm run build
```

### Reducing Bundle Size

1. **Remove Unused Dependencies**
   - Audit npm packages
   - Replace large libraries with smaller alternatives
   - Use tree-shaking

2. **Code Splitting**
   - Split by routes
   - Lazy load modals and heavy components
   - Separate vendor code

3. **CSS Optimization**
   - Purge unused CSS with Tailwind
   - Minify CSS in production
   - Remove duplicate styles

---

## 4. Runtime Performance

### Monitoring Performance

Use the performance monitoring utility:
```typescript
import { measureAsync, monitor } from '@/lib/performance'

// Measure async operations
const data = await measureAsync('api-call', async () => {
  return fetch('/api/data').then(r => r.json())
})

// Get performance report
const report = monitor.generatePerformanceReport()
console.log(report)
```

### Core Web Vitals

Monitor in production:
```typescript
import { captureWebVitals } from '@/lib/performance'

captureWebVitals((vitals) => {
  console.log('Web Vitals:', vitals)
  // Send to analytics
})
```

---

## 5. Caching Strategy

### Browser Caching

Set appropriate cache headers:
```typescript
// next.config.mjs
async headers() {
  return [
    {
      source: '/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'private, max-age=0, must-revalidate',
        },
      ],
    },
  ]
}
```

### Client-Side Caching

Cache API responses:
```typescript
const cache = new Map()

async function fetchWithCache(url, ttl = 5 * 60 * 1000) {
  if (cache.has(url)) {
    const { data, timestamp } = cache.get(url)
    if (Date.now() - timestamp < ttl) {
      return data
    }
  }

  const data = await fetch(url).then(r => r.json())
  cache.set(url, { data, timestamp: Date.now() })
  return data
}
```

---

## 6. Database Performance

### Query Performance Targets

- Simple queries: < 100ms
- Complex queries: < 500ms
- Batch operations: < 1s

### Optimization Strategies

1. **Use Indexes** - See DATABASE_OPTIMIZATION.md
2. **Pagination** - Always use limit()
3. **Denormalization** - Avoid excessive joins
4. **Connection Pooling** - For Node.js backends
5. **Read Replicas** - For read-heavy workloads

---

## 7. Third-Party Scripts

### Loading Strategy

```typescript
<Script
  src="https://external-script.com/lib.js"
  strategy="lazyOnload" // Or "afterInteractive"
  onLoad={() => {
    // Initialize script
  }}
/>
```

Strategies:
- `beforeInteractive` - Critical scripts
- `afterInteractive` - Default, non-critical
- `lazyOnload` - Low-priority scripts

---

## 8. Rendering Optimization

### Server-Side Rendering (SSR)

Currently: Next.js with App Router (SSR by default)

Disable SSR for expensive components:
```typescript
const HeavyChart = dynamic(
  () => import('@/components/heavy-chart'),
  { ssr: false }
)
```

### Incremental Static Regeneration (ISR)

For static pages with updates:
```typescript
export const revalidate = 3600 // Revalidate every hour

export default function Page() {
  return <div>Static content</div>
}
```

---

## 9. Network Optimization

### API Request Batching

```typescript
// Batch multiple requests
const [user, posts, comments] = await Promise.all([
  fetch('/api/user').then(r => r.json()),
  fetch('/api/posts').then(r => r.json()),
  fetch('/api/comments').then(r => r.json()),
])
```

### Compression

Enable gzip/brotli compression (handled by Vercel).

### HTTP/2 & HTTP/3

Enabled by default on Vercel - enables multiplexing and server push.

---

## 10. Production Deployment Checklist

### Before Going Live

- [ ] Bundle analysis completed
- [ ] Images optimized
- [ ] Unused code removed
- [ ] Database indexes created
- [ ] Cache headers configured
- [ ] Third-party scripts optimized
- [ ] Performance budget set
- [ ] Monitoring configured

### Performance Monitoring

Tools to set up:
- Vercel Analytics
- Google PageSpeed Insights
- Lighthouse CI
- Real User Monitoring (RUM)

---

## 11. Performance Optimization Roadmap

### Week 1 (Critical)
- Implement database indexes
- Optimize images
- Enable caching headers

### Week 2-3 (Important)
- Code split heavy components
- Reduce bundle size
- Optimize API queries

### Month 1 (Nice-to-Have)
- Implement service workers
- Add progressive web app
- Advanced caching strategies

### Ongoing
- Monitor Core Web Vitals
- Regular bundle analysis
- Performance testing
- User feedback integration

---

## 12. Common Performance Issues & Solutions

### Issue: Slow Page Load
**Symptoms**: LCP > 3s, FCP > 2s
**Diagnosis**: Use Lighthouse, DevTools
**Solutions**:
1. Defer non-critical JavaScript
2. Optimize images
3. Enable caching
4. Use CDN

### Issue: High CLS
**Symptoms**: Layout shifts while page loads
**Diagnosis**: Record video with DevTools
**Solutions**:
1. Reserve space for dynamic content
2. Load fonts asynchronously
3. Avoid layout thrashing
4. Use CSS containment

### Issue: Slow API Responses
**Symptoms**: Network tab shows > 500ms requests
**Diagnosis**: Check database queries
**Solutions**:
1. Add database indexes
2. Implement pagination
3. Use caching
4. Optimize queries

### Issue: High Memory Usage
**Symptoms**: 90%+ heap size in DevTools
**Diagnosis**: Check Chrome DevTools Memory
**Solutions**:
1. Unsubscribe from listeners
2. Clear caches
3. Reduce subscription count
4. Implement garbage collection

---

## References

- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/learn/seo/performance)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [React Performance](https://react.dev/reference/react/useMemo)

---

Last Updated: July 2024
Review Frequency: Monthly
