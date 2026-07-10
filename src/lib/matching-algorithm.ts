import type { Student, JobPosting, Company } from '@/types'

export interface MatchScore {
  studentId: string;
  jobId: string;
  score: number;
  breakDown: {
    skillsMatch: number;
    experienceMatch: number;
    locationMatch: number;
    availabilityMatch: number;
    salaryMatch: number;
  };
  summary: string;
}

export interface JobMatch {
  jobId: string;
  jobTitle: string;
  company: string;
  matchScore: number;
  summary: string;
}

export interface StudentMatch {
  studentId: string;
  name: string;
  matchScore: number;
  summary: string;
}

// Advanced talent matching algorithm
export function calculateTalentMatch(
  student: Student,
  job: JobPosting,
  company?: Company
): MatchScore {
  const breakDown = {
    skillsMatch: calculateSkillsMatch(student, job),
    experienceMatch: calculateExperienceMatch(student, job),
    locationMatch: calculateLocationMatch(student, job),
    availabilityMatch: calculateAvailabilityMatch(student, job),
    salaryMatch: calculateSalaryMatch(student, job),
  }

  // Weighted scoring
  const weights = {
    skillsMatch: 0.35,
    experienceMatch: 0.25,
    locationMatch: 0.15,
    availabilityMatch: 0.15,
    salaryMatch: 0.10,
  }

  const score = Math.round(
    Object.entries(breakDown).reduce((total, [key, value]) => {
      const weight = weights[key as keyof typeof weights]
      return total + value * weight
    }, 0)
  )

  const summary = generateMatchSummary(breakDown, score)

  return {
    studentId: student.id,
    jobId: job.id,
    score,
    breakDown,
    summary,
  }
}

// Calculate skills match percentage
function calculateSkillsMatch(student: Student, job: JobPosting): number {
  if (!student.skills || !job.requirements) {
    return 0
  }

  const studentSkillsSet = new Set(
    student.skills.map((s: string) => s.toLowerCase())
  )
  const jobRequirementsSet = new Set(
    job.requirements.map((r: string) => r.toLowerCase())
  )

  // Check exact matches
  let matches = 0
  jobRequirementsSet.forEach((requirement) => {
    if (studentSkillsSet.has(requirement)) {
      matches++
    }
  })

  // Also check for similar skills (fuzzy matching)
  const additionalMatches = calculateSimilarSkills(
    Array.from(studentSkillsSet),
    Array.from(jobRequirementsSet),
    matches
  )

  const totalMatches = matches + additionalMatches
  const percentage = Math.min(
    100,
    (totalMatches / jobRequirementsSet.size) * 100
  )

  return Math.round(percentage)
}

// Fuzzy skill matching for similar technologies
function calculateSimilarSkills(
  studentSkills: string[],
  jobRequirements: string[],
  exactMatches: number
): number {
  const skillGroups: Record<string, string[]> = {
    'frontend': ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt'],
    'backend': ['nodejs', 'python', 'java', 'go', 'rust', 'dotnet'],
    'database': ['sql', 'postgresql', 'mysql', 'mongodb', 'firebase', 'dynamodb'],
    'devops': ['docker', 'kubernetes', 'aws', 'gcp', 'azure', 'terraform'],
  }

  let additionalMatches = 0

  for (const requirement of jobRequirements) {
    const foundGroup = Object.entries(skillGroups).find(([_, skills]) =>
      skills.some((skill) =>
        requirement.toLowerCase().includes(skill) ||
        skill.includes(requirement.toLowerCase())
      )
    )

    if (foundGroup) {
      const [_, groupSkills] = foundGroup
      const hasRelatedSkill = studentSkills.some((skill) =>
        groupSkills.some(
          (groupSkill) =>
            skill.toLowerCase().includes(groupSkill) ||
            groupSkill.includes(skill.toLowerCase())
        )
      )

      if (hasRelatedSkill) {
        additionalMatches += 0.5 // Half credit for related skills
      }
    }
  }

  return Math.round(additionalMatches)
}

// Calculate experience level match
function calculateExperienceMatch(student: Student, job: JobPosting): number {
  const seniorityMap: Record<string, number> = {
    'entry_level': 1,
    'junior': 2,
    'mid': 3,
    'mid_level': 3,
    'senior': 4,
    'lead': 5,
  }

  const studentLevel = seniorityMap[student.seniority?.toLowerCase() || ''] || 0
  const jobLevel = seniorityMap[job.level?.toLowerCase() || ''] || 0

  if (jobLevel === 0) return 100 // No requirement specified

  // Calculate how well student matches job level
  const difference = Math.abs(studentLevel - jobLevel)

  // Perfect match: 100%, one level off: 85%, two levels: 60%, etc
  const matchPercentage = Math.max(0, 100 - difference * 25)

  return Math.round(matchPercentage)
}

// Calculate location match
function calculateLocationMatch(student: Student, job: JobPosting): number {
  if (!student.currentCity || !job.location) {
    return 75 // Neutral if info not provided
  }

  const studentCity = student.currentCity.toLowerCase()
  const jobCity = job.location.toLowerCase()

  // Exact match
  if (studentCity === jobCity) {
    return 100
  }

  // Check if student wants to relocate to this location
  if (
    student.targetCities &&
    student.targetCities.some(
      (city: string) => city.toLowerCase() === jobCity
    )
  ) {
    return 90
  }

  // Same region (approximate - would need geocoding for production)
  if (
    studentCity.includes(jobCity.split(',')[0]) ||
    jobCity.includes(studentCity.split(',')[0])
  ) {
    return 70
  }

  // Different location but willing to relocate
  if (student.targetCities && student.targetCities.length > 0) {
    return 50
  }

  return 30 // Different location, no relocation interest
}

// Calculate availability match
function calculateAvailabilityMatch(student: Student, job: JobPosting): number {
  const availabilityMap: Record<string, number> = {
    'immediately': 100,
    '1-week': 90,
    '2-weeks': 80,
    '1-month': 70,
    'later': 50,
  }

  const score = availabilityMap[student.availability?.toLowerCase() || ''] || 50

  // Bonus for full-time if job requires it
  if (job.employmentType === 'full_time') {
    return score // Already accounted for
  }

  return score
}

// Calculate salary match
function calculateSalaryMatch(student: Student, job: JobPosting): number {
  // If no salary info, neutral match
  if (!job.salaryMin || !job.salaryMax) {
    return 75
  }

  // If student has salary expectations
  if (student.expectedSalary) {
    const salaryMin = job.salaryMin
    const salaryMax = job.salaryMax
    const studentExpectation = student.expectedSalary

    // Check if salary is in acceptable range
    if (studentExpectation >= salaryMin && studentExpectation <= salaryMax) {
      return 100
    }

    // Calculate how close they are
    const gap = Math.abs(
      studentExpectation - (salaryMin + salaryMax) / 2
    )
    const rangeSize = salaryMax - salaryMin
    const matchPercentage = Math.max(0, 100 - (gap / rangeSize) * 100)

    return Math.round(matchPercentage)
  }

  // If no salary expectation, assume flexible (good match)
  return 85
}

// Generate human-readable summary
function generateMatchSummary(
  breakDown: Record<string, number>,
  score: number
): string {
  const { skillsMatch, experienceMatch, locationMatch } = breakDown

  if (score >= 85) {
    return 'Excellent match - Strong candidate'
  } else if (score >= 70) {
    return 'Good match - Consider reaching out'
  } else if (score >= 50) {
    return 'Fair match - Potential opportunity'
  } else {
    return 'Low match - May not be suitable'
  }
}

// Find best job matches for a student
export function findBestJobMatches(
  student: Student,
  jobs: JobPosting[]
): JobMatch[] {
  const matches = jobs
    .map((job) => {
      const score = calculateTalentMatch(student, job)
      return {
        jobId: job.id,
        jobTitle: job.title,
        company: job.companyName || 'Unknown',
        matchScore: score.score,
        summary: score.summary,
      }
    })
    .filter((match) => match.matchScore >= 40)
    .sort((a, b) => b.matchScore - a.matchScore)

  return matches.slice(0, 10) // Top 10 matches
}

// Find best student candidates for a job
export function findBestStudentCandidates(
  job: JobPosting,
  students: Student[]
): StudentMatch[] {
  const matches = students
    .map((student) => {
      const score = calculateTalentMatch(student, job)
      return {
        studentId: student.id,
        name: student.fullName,
        matchScore: score.score,
        summary: score.summary,
      }
    })
    .filter((match) => match.matchScore >= 40)
    .sort((a, b) => b.matchScore - a.matchScore)

  return matches.slice(0, 20) // Top 20 candidates
}

// Batch calculate matches for multiple students
export function batchCalculateMatches(
  students: Student[],
  job: JobPosting
): MatchScore[] {
  return students.map((student) => calculateTalentMatch(student, job))
}

// Get match statistics
export function getMatchStatistics(matches: MatchScore[]): {
  averageScore: number
  highMatches: number
  mediumMatches: number
  lowMatches: number
  distribution: Record<string, number>
} {
  if (matches.length === 0) {
    return {
      averageScore: 0,
      highMatches: 0,
      mediumMatches: 0,
      lowMatches: 0,
      distribution: {},
    }
  }

  const averageScore =
    Math.round(
      matches.reduce((sum, m) => sum + m.score, 0) / matches.length
    ) || 0

  const highMatches = matches.filter((m) => m.score >= 75).length
  const mediumMatches = matches.filter((m) => m.score >= 50 && m.score < 75)
    .length
  const lowMatches = matches.filter((m) => m.score < 50).length

  // Distribution by 10-point brackets
  const distribution: Record<string, number> = {}
  for (let i = 0; i <= 100; i += 10) {
    const bracket = `${i}-${i + 10}`
    distribution[bracket] = matches.filter(
      (m) => m.score >= i && m.score < i + 10
    ).length
  }

  return {
    averageScore,
    highMatches,
    mediumMatches,
    lowMatches,
    distribution,
  }
}
