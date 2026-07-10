# NextGenMove - Talent Matching & Recruitment Platform

A comprehensive SaaS platform for connecting companies with talented professionals through intelligent matching, job postings, and community features.

## Features Overview

### Student Portal
- Comprehensive profile management with skills tracking
- Job search and application system
- Real-time application status tracking
- Save favorite jobs
- Join communities and attend events
- Professional networking

### Company Portal
- Company profile and verification
- Post and manage job openings
- AI-powered talent matching pipeline
- Kanban-style candidate management
- Browse and communicate with students
- Create industry communities
- Host events and webinars

### Admin Dashboard
- Complete user management
- Article and blog CMS
- Platform settings configuration
- Content moderation
- Database management tools
- Analytics and reporting

### Public Features
- Beautiful landing page
- Public job board with search
- Blog with articles and filtering
- Company directory
- Community discovery

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Backend**: Firebase Firestore, Firebase Auth
- **Storage**: Firebase Cloud Storage
- **Hosting**: Vercel
- **Package Manager**: pnpm

## Quick Start

1. **Install dependencies**:
```bash
pnpm install
```

2. **Configure environment**:
```bash
cp .env.local.example .env.local
# Add your Firebase credentials
```

3. **Run dev server**:
```bash
pnpm dev
```

4. **Visit app**:
Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── components/          # UI & page components
│   ├── ui/             # Reusable components
│   ├── admin/          # Admin portal
│   ├── employer/       # Company portal
│   └── student/        # Student portal
├── lib/                # Utilities & services
│   ├── firebase-*      # Firebase setup
│   ├── auth*           # Authentication
│   └── seed-data.ts    # Mock data
└── types/              # TypeScript definitions

app/
├── admin/              # Admin routes
├── employer/           # Company routes
├── student/            # Student routes
├── login/              # Auth pages
└── blog/               # Blog pages

docs/
├── firestore-schema.md # Database structure
├── DEPLOYMENT_GUIDE.md # Deployment steps
└── TESTING_GUIDE.md    # Testing procedures
```

## Key Routes

### Public
- `/` - Landing page
- `/login` - Sign in
- `/signup` - Create account
- `/blog` - Blog articles
- `/jobs` - Public job board

### Protected (Auth Required)
- `/student/dashboard` - Student home
- `/employer/dashboard` - Company home
- `/admin/dashboard` - Admin panel
- `/admin/articles` - Article management
- `/admin/tools` - Database tools

## Database Schema

See `docs/firestore-schema.md` for complete Firestore structure with:
- Users, Students, Companies collections
- Job postings and applications
- Articles and blog content
- Communities and events
- Real-time subscription patterns

## Deployment

### Deploy to Vercel
1. Connect GitHub repository
2. Add environment variables
3. Deploy automatically

See `docs/DEPLOYMENT_GUIDE.md` for detailed instructions.

### Required Environment Variables
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
```

## Testing

See `docs/TESTING_GUIDE.md` for:
- Authentication testing
- Portal functionality checks
- Responsive design verification
- Performance benchmarks
- Security testing

### Performance Targets
- Page Load: < 2 seconds
- Lighthouse: > 85
- LCP: < 2.5s
- CLS: < 0.1

## Development

### Code Quality
- TypeScript for type safety
- shadcn/ui for consistent components
- Tailwind CSS for styling
- ESLint for code standards

### Verify Build
```bash
pnpm tsc --noEmit  # Type check
pnpm dev           # Start dev server
```

## Security Features

- Firebase security rules
- Role-based access control
- Environment variable protection
- Input validation on all forms
- SQL injection prevention
- CSRF protection

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS/Android)

## Documentation

- **Architecture**: See project structure above
- **Database**: `docs/firestore-schema.md`
- **Deployment**: `docs/DEPLOYMENT_GUIDE.md`
- **Testing**: `docs/TESTING_GUIDE.md`
- **Types**: `src/types/index.ts`

## Contributing

1. Create feature branch
2. Make changes
3. Verify build: `pnpm tsc --noEmit`
4. Push and create PR

## Status

- **Build**: Production ready
- **TypeScript**: Zero errors
- **Tests**: Ready for QA
- **Deployment**: Ready for Vercel

## Support

For issues, see `docs/DEPLOYMENT_GUIDE.md` troubleshooting section.

---

Built with Next.js, React, Firebase, and Tailwind CSS
Last Updated: July 2024 | Version: 1.0.0
