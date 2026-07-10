# NextGenMove Vercel Deployment Guide

## Pre-Deployment Checklist

Complete these items before deploying to production:

### Critical Items (Must Complete)
- [ ] All TypeScript errors resolved (0 errors)
- [ ] Environment variables configured in Vercel
- [ ] Firestore security rules deployed
- [ ] Firestore indexes created
- [ ] Database backup configured
- [ ] SSL certificate ready
- [ ] Custom domain configured

### Security Items
- [ ] Security audit reviewed (SECURITY_AUDIT.md)
- [ ] Firestore security rules deployed
- [ ] CSP headers configured in next.config.mjs
- [ ] Rate limiting enabled
- [ ] HTTPS enforced

### Performance Items
- [ ] Bundle size optimized
- [ ] Images optimized
- [ ] Database queries optimized
- [ ] Caching headers configured
- [ ] Lighthouse score > 85

### Monitoring Items
- [ ] Sentry DSN configured
- [ ] Vercel Analytics enabled
- [ ] Error logging setup
- [ ] Performance monitoring ready

---

## Step 1: Connect GitHub Repository

1. Go to Vercel Dashboard (https://vercel.com)
2. Click "New Project"
3. Connect GitHub account
4. Select `roosevelt-jpg/nextgen-move-rules` repository
5. Grant necessary permissions

**Repository Settings**:
- Framework: Next.js
- Build Command: `pnpm run build`
- Output Directory: `.next`
- Install Command: `pnpm install`

---

## Step 2: Configure Environment Variables

### In Vercel Dashboard

1. Project → Settings → Environment Variables
2. Add all variables from `.env.local.example`

### Firebase Configuration

**Public Variables**:
```
NEXT_PUBLIC_FIREBASE_API_KEY=xxxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxxxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxxxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxxxx
```

**Secret Variables**:
```
FIREBASE_ADMIN_PROJECT_ID=xxxxx
FIREBASE_ADMIN_CLIENT_EMAIL=admin@xxxxx.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
```

### Monitoring Setup

```
NEXT_PUBLIC_SENTRY_DSN=https://key@sentry.io/project-id
NEXT_PUBLIC_GA_MEASUREMENT_ID=G_XXXXXXXXXX
```

### Node Environment

```
NODE_ENV=production
```

---

## Step 3: Deploy Firestore Security Rules

**Before Deploying**:
1. Review `firestore.rules` file
2. Test rules locally if possible
3. Plan rollback strategy

**Deploy via Firebase Console**:
1. Go to Firebase Console → Firestore → Rules
2. Copy rules from `firestore.rules`
3. Click "Publish"
4. Wait for deployment to complete

**Deploy via Firebase CLI**:
```bash
firebase deploy --only firestore:rules
```

---

## Step 4: Deploy Firestore Indexes

**Automatic Deployment**:
1. Vercel will run initial build
2. Firestore will suggest indexes if needed
3. Deploy indexes via Firebase Console

**Manual Deployment**:
```bash
firebase deploy --only firestore:indexes
```

**Verify Indexes**:
1. Firebase Console → Firestore → Indexes
2. Confirm all 6 indexes are "Enabled"
3. Monitor query performance

---

## Step 5: Configure Custom Domain

1. Vercel Project → Settings → Domains
2. Add custom domain
3. Follow DNS configuration instructions
4. Wait for DNS propagation (up to 24 hours)

**DNS Configuration** (varies by provider):
- Create CNAME record pointing to Vercel
- Or update A records as specified

**Verify Domain**:
```bash
dig yourdomain.com
# Should show Vercel servers
```

---

## Step 6: Enable HTTPS & Security

### Automatic (Vercel Default)
- SSL certificate auto-generated via Let's Encrypt
- HTTPS enforced automatically
- Certificate auto-renewal

### Manual Configuration
1. Project → Settings → SSL/TLS
2. Configure HSTS headers
3. Enable "Managed SSL Certificates"

---

## Step 7: Set Up Monitoring

### Vercel Analytics

1. Project → Settings → Analytics
2. Enable "Web Analytics"
3. View in Analytics tab

### Sentry Integration

1. Create Sentry project (https://sentry.io)
2. Add DSN to environment variables
3. Configure Sentry integration in Vercel

### GitHub Integration

1. Enable GitHub Checks
2. Configure branch protection rules
3. Set up required status checks

---

## Step 8: Configure Build & Deployment

### Build Settings

```
Framework Preset: Next.js
Build Command: pnpm run build
Output Directory: .next
Install Command: pnpm install
```

### Deployment Settings

```
Production Branch: main
Preview Deployments: Automatic
Serverless Functions: Node.js 18
```

### Environment-Specific

**Production (main branch)**:
- NODE_ENV: production
- Sentry tracing: 10% sample rate

**Preview (other branches)**:
- NODE_ENV: production
- Sentry tracing: 100% sample rate

---

## Step 9: First Deployment

### Deploy Process

1. Push code to `main` branch (or configured production branch)
2. Vercel automatically starts build
3. Monitor build log in Vercel Dashboard
4. Deployment completes and goes live

### Build Log Monitoring

Check for:
```
✓ Compiled successfully
✓ Created optimized production build
✓ Deployed to production
```

### Post-Deployment Verification

```bash
# Check if site is accessible
curl https://yourdomain.com

# Check if API routes work
curl https://yourdomain.com/api/health

# Check Web Vitals
# Go to Vercel Dashboard → Analytics
```

---

## Step 10: Post-Deployment Tasks

### Day 1

- [ ] Verify all pages load correctly
- [ ] Test user authentication
- [ ] Check database connections
- [ ] Monitor error logs in Sentry
- [ ] Check Vercel Analytics

### Week 1

- [ ] Monitor performance metrics
- [ ] Check for error spikes
- [ ] Collect user feedback
- [ ] Monitor database usage
- [ ] Check build times

### Month 1

- [ ] Full security audit
- [ ] Performance optimization
- [ ] User analytics review
- [ ] Cost analysis
- [ ] Plan next features

---

## Troubleshooting

### Build Fails

**Error: TypeScript compilation error**
```
Solution: Fix TS errors locally first
npm run build
# Fix errors reported
git push
```

**Error: Missing environment variables**
```
Solution: Add all required env vars to Vercel
Vercel → Settings → Environment Variables
Add each variable and redeploy
```

### Application Errors

**Error: Database connection failed**
```
Solution: Verify Firebase credentials
Check FIREBASE_ADMIN_* environment variables
Verify IP whitelist in Firebase Console
```

**Error: Authentication not working**
```
Solution: Verify Firebase Auth domain
Go to Firebase Console → Auth → Authorized domains
Add yourvercel.app and yourdomain.com
```

### Performance Issues

**LCP too high (> 3s)**
```
Solution: Optimize images, enable caching
Review PERFORMANCE_OPTIMIZATION.md
Run Lighthouse audit
```

**API timeouts**
```
Solution: Increase function timeout
Vercel → Settings → Functions
Increase timeout from default 60s to 300s
```

---

## Rollback Procedure

### Rollback to Previous Deployment

1. Vercel Dashboard → Deployments
2. Find previous successful deployment
3. Click "..." → Promote to Production
4. Confirm rollback

### Rollback Time

- Typically completes in < 1 minute
- No database changes needed
- Previous code version is restored

### Communication

If rollback needed:
- Notify team immediately
- Post status update
- Begin root cause analysis

---

## Monitoring Production

### Daily Checks

```
Vercel Dashboard:
- Build status ✓
- Deployment status ✓
- Analytics dashboard
- Error logs

Sentry:
- Critical errors
- Error trends
- Release health
```

### Weekly Reports

Generate weekly status report:
- Deployment frequency
- Error rates
- Performance metrics
- User engagement

### Performance Baseline

Establish baseline metrics:
- Page load time: < 2s
- Lighthouse score: > 85
- Error rate: < 0.1%
- Database response: < 100ms

---

## Optimization After Launch

### Week 1 Optimization

- [ ] Analyze Core Web Vitals
- [ ] Identify slow pages
- [ ] Optimize slow queries
- [ ] Monitor error patterns

### Month 1 Optimization

- [ ] Full performance audit
- [ ] Database query optimization
- [ ] Bundle size reduction
- [ ] Image optimization

### Ongoing

- [ ] Monitor performance metrics
- [ ] Optimize based on real usage
- [ ] Regular security updates
- [ ] Dependency updates

---

## Deployment Commands

### Manual Deployment (if needed)

```bash
# Build locally
npm run build

# Deploy to Vercel (with Vercel CLI)
vercel deploy

# Deploy to production
vercel deploy --prod
```

### Vercel CLI Installation

```bash
npm i -g vercel
vercel login
vercel link  # Link to Vercel project
vercel deploy --prod
```

---

## Support & Help

### Common Resources

- Vercel Documentation: https://vercel.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Firebase Documentation: https://firebase.google.com/docs
- Sentry Documentation: https://docs.sentry.io

### Troubleshooting Guides

- DEPLOYMENT_GUIDE.md - General deployment steps
- SECURITY_AUDIT.md - Security pre-checks
- DATABASE_OPTIMIZATION.md - Database setup
- PERFORMANCE_OPTIMIZATION.md - Performance tuning

### Getting Help

- Check Vercel Status: https://vercelstatus.com
- Vercel Support: https://vercel.com/help
- Community: Stack Overflow, GitHub Issues

---

## Success Criteria

Your deployment is successful when:

✓ Site is accessible at yourdomain.com
✓ All pages load without errors
✓ Authentication works
✓ Database queries complete successfully
✓ No critical errors in Sentry
✓ Core Web Vitals are good (Green in Lighthouse)
✓ Analytics tracking is working
✓ Users can complete full user journey

---

Last Updated: July 2024
Status: Production Ready
