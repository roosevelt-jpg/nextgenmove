import { Timestamp } from 'firebase/firestore';

// Auth & Users
export type UserRole = 'admin' | 'company' | 'student';
export type UserStatus = 'active' | 'suspended';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  photoUrl?: string;
  createdAt: Timestamp;
  lastLoginAt?: Timestamp;
  status: UserStatus;
}

// Companies
export type SubscriptionStatus = 'active' | 'inactive' | 'pending';
export type PlanType = 'track_a' | 'track_b' | null;

export interface FileMetadata {
  url: string;
  path: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: Timestamp;
}

export interface Requirement extends FileMetadata {
  id: string;
  title: string;
}

export interface Company {
  id: string;
  userId: string;
  name: string;
  contactEmail: string;
  logoUrl?: string;
  industry?: string;
  website?: string;
  plan: PlanType;
  subscriptionStatus: SubscriptionStatus;
  requirements?: Requirement[];
  createdAt: Timestamp;
}

// Students
export type StudentStatus = 'active' | 'placed' | 'inactive';

export interface Student {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  photoUrl?: string;
  sector?: string;
  seniority?: string;
  currentCity?: string;
  targetCities?: string[];
  cvUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  bio?: string;
  experience?: string;
  skills?: string[];
  availability?: string;
  resume?: string;
  credits: number;
  status: StudentStatus;
  createdAt: Timestamp;
}

// Matches & Pipeline
export type MatchSource = 'admin_curated' | 'company_browsed' | 'role_interest_promoted';

export interface MatchNote {
  authorId: string;
  text: string;
  createdAt: Timestamp;
}

export interface Match {
  id: string;
  companyId: string;
  studentId: string;
  stageId: string;
  shortlisted: boolean;
  source: MatchSource;
  notes?: MatchNote[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
  isTerminal: boolean;
}

// Requests
export type RequestType = 'sourcing_request' | 'plan_request' | 'other';
export type RequestStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

export interface Request {
  id: string;
  type: RequestType;
  companyId?: string;
  payload: Record<string, any>;
  status: RequestStatus;
  createdAt: Timestamp;
}

// Job Postings
export type JobStatus = 'open' | 'closed';
export type ApplicationStatus = 'new' | 'reviewed' | 'rejected' | 'hired';

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  description: string;
  status: JobStatus;
  createdAt: Timestamp;
}

export interface JobApplication {
  id: string;
  jobPostingId: string;
  fullName: string;
  email: string;
  linkedinUrl?: string;
  cvUrl?: string;
  coverNote: string;
  status: ApplicationStatus;
  createdAt: Timestamp;
}

// Articles & Content
export type ArticleStatus = 'draft' | 'published';
export type ContentType = 'video' | 'pdf' | 'course' | 'download';
export type ContentStatus = 'draft' | 'live';

export interface Article {
  id: string;
  title: string;
  slug: string;
  coverImageUrl?: string;
  excerpt: string;
  body: string;
  author: string;
  category: string;
  publishedDate: Timestamp;
  tags: string[];
  status: ArticleStatus;
  createdAt: Timestamp;
}

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  description: string;
  thumbnailUrl?: string;
  fileUrl?: string;
  costCredits: number;
  category: string;
  status: ContentStatus;
  createdAt: Timestamp;
}

// Public Roles & Interest
export type RoleStatus = 'open' | 'filled';
export type InterestStatus = 'new' | 'promoted' | 'dismissed';

export interface PublicRole {
  id: string;
  title: string;
  employerLabel: string;
  sector: string;
  location: string;
  seniority: string;
  relocationSupport: boolean;
  description: string;
  status: RoleStatus;
  createdAt: Timestamp;
}

export interface RoleInterestSubmission {
  id: string;
  publicRoleId: string;
  fullName: string;
  email: string;
  currentCity: string;
  cvUrl?: string;
  whyThisRole: string;
  status: InterestStatus;
  createdAt: Timestamp;
}

// Newsletter & Integrations
export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribedAt: Timestamp;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  status: 'connected' | 'not_connected';
  connectedAt?: Timestamp;
  config?: Record<string, any>;
}

// Program & Pricing
export interface WayToEarn {
  id: string;
  action: string;
  credits: number;
  description: string;
}

export interface ProgramLevers {
  id: 'default';
  trackAMonthly: number;
  trackAMatchFee: number;
  trackBMonthly: number;
  waysToEarn: WayToEarn[];
  updatedAt: Timestamp;
}

// CMS Pages (Singletons)
export interface OriginCity {
  code: string;
  label: string;
  x: number;
  y: number;
}

export interface PageHome {
  id: 'default';
  headline: string;
  headline_emphasis: string;
  subtext: string;
  cta_primary_label: string;
  cta_primary_href: string;
  cta_secondary_label: string;
  cta_secondary_href: string;
  origin_cities: OriginCity[];
}

export interface StatBlock {
  label: string;
  value: string;
}

export interface TeamMember {
  name: string;
  role: string;
  photoUrl?: string;
}

export interface PageAbout {
  id: 'default';
  hero_headline: string;
  hero_subtext: string;
  mission_body: string;
  stat_blocks: StatBlock[];
  team_members: TeamMember[];
  founding_story: string;
}

export interface Step {
  leg_number: number;
  title: string;
  description: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface PageHowItWorks {
  id: 'default';
  steps: Step[];
  faq_items: FAQItem[];
}

export interface PagePricing {
  id: 'default';
  track_a_headline: string;
  track_a_features: string[];
  track_b_headline: string;
  track_b_features: string[];
  faq_items: FAQItem[];
}

export interface ComparisonRow {
  label: string;
  track_a_value: string;
  track_b_value: string;
}

export interface PageTracks {
  id: 'default';
  track_a_body: string;
  track_b_body: string;
  comparison_rows: ComparisonRow[];
  case_study_quote?: string;
}

// Site Settings
export interface SocialLinks {
  [platform: string]: string;
}

export interface NavLabels {
  [section: string]: string;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterSection {
  section: string;
  links: FooterLink[];
}

export interface SiteSettings {
  id: 'default';
  siteName: string;
  tagline: string;
  logoUrl?: string;
  contactEmail: string;
  socialLinks: SocialLinks;
  navLabels: NavLabels;
  footerLinks: FooterSection[];
}

// Articles & Blog
export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags?: string[];
  authorId: string;
  authorName: string;
  imageUrl?: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  viewCount: number;
}

// Activity Log
export interface ActivityLog {
  id: string;
  actorId: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
}
