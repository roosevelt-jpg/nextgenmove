import type { Article, Company, Student, JobPosting } from '@/types'

export const seedArticles: Omit<Article, 'id'>[] = [
  {
    title: 'Getting Started with NextGenMove',
    slug: 'getting-started',
    excerpt: 'Learn how to set up your profile and start matching with opportunities.',
    body: 'Complete guide to getting started...',
    category: 'Getting Started',
    tags: ['tutorial', 'setup'],
    author: 'Admin',
    status: 'published',
    publishedDate: new Date() as any,
    createdAt: new Date() as any,
  },
  {
    title: 'Top 5 Skills Employers Are Looking For',
    slug: 'top-skills',
    excerpt: 'Discover the most in-demand skills in 2024.',
    body: 'Comprehensive guide to in-demand skills...',
    category: 'Tips',
    tags: ['skills', 'career'],
    author: 'Admin',
    status: 'published',
    publishedDate: new Date() as any,
    createdAt: new Date() as any,
  },
]

export const seedCompanies: Omit<Company, 'id' | 'userId'>[] = [
  {
    name: 'Tech Innovations Inc',
    contactEmail: 'contact@techinnovations.com',
    industry: 'Technology',
    website: 'https://techinnovations.com',
    plan: 'track_a',
    subscriptionStatus: 'active',
    createdAt: new Date() as any,
  },
  {
    name: 'Creative Agency Pro',
    contactEmail: 'hello@creativeagency.com',
    industry: 'Marketing',
    website: 'https://creativeagency.com',
    plan: 'track_b',
    subscriptionStatus: 'active',
    createdAt: new Date() as any,
  },
]

export const seedStudents: Omit<Student, 'id' | 'userId'>[] = [
  {
    fullName: 'Alex Johnson',
    email: 'alex@example.com',
    sector: 'Technology',
    seniority: 'entry_level',
    currentCity: 'San Francisco',
    targetCities: ['San Francisco', 'Los Angeles'],
    bio: 'Passionate about software development',
    skills: ['JavaScript', 'React', 'Node.js'],
    availability: 'immediately',
    credits: 0,
    status: 'active',
    createdAt: new Date() as any,
  },
  {
    fullName: 'Sarah Chen',
    email: 'sarah@example.com',
    sector: 'Design',
    seniority: 'mid_level',
    currentCity: 'New York',
    targetCities: ['New York', 'Boston'],
    bio: 'UX/UI designer with 3 years experience',
    skills: ['Figma', 'Design Systems', 'Prototyping'],
    availability: '2-weeks',
    credits: 0,
    status: 'active',
    createdAt: new Date() as any,
  },
]

export const seedJobs: Omit<JobPosting, 'id'>[] = [
  {
    title: 'Senior React Developer',
    department: 'Engineering',
    description: 'Join our team as a Senior React Developer and help build the future.',
    location: 'San Francisco, CA',
    employmentType: 'full_time',
    status: 'open',
    createdAt: new Date() as any,
  },
  {
    title: 'UX Designer',
    department: 'Design',
    description: 'Design beautiful user experiences for our platform.',
    location: 'New York, NY',
    employmentType: 'full_time',
    status: 'open',
    createdAt: new Date() as any,
  },
]
