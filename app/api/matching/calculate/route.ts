import { NextRequest, NextResponse } from 'next/server'
import {
  calculateTalentMatch,
  findBestJobMatches,
  findBestStudentCandidates,
  batchCalculateMatches,
  getMatchStatistics,
} from '@/lib/matching-algorithm'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'
import type { Student, JobPosting } from '@/types'

// POST /api/matching/calculate
// Calculate matches for a student-job pairing or batch operations
export async function POST(request: NextRequest) {
  try {
    const { action, studentId, jobId, students: studentIds, jobs: jobIds } = await request.json()

    // Single match calculation
    if (action === 'single' && studentId && jobId) {
      const studentRef = doc(db, 'students', studentId)
      const jobRef = doc(db, 'jobPostings', jobId)

      const [studentSnap, jobSnap] = await Promise.all([
        getDoc(studentRef),
        getDoc(jobRef),
      ])

      if (!studentSnap.exists() || !jobSnap.exists()) {
        return NextResponse.json(
          { error: 'Student or job not found' },
          { status: 404 }
        )
      }

      const student = { id: studentId, ...studentSnap.data() } as Student
      const job = { id: jobId, ...jobSnap.data() } as JobPosting

      const match = calculateTalentMatch(student, job)

      return NextResponse.json({ match })
    }

    // Find best job matches for a student
    if (action === 'student-jobs' && studentId) {
      const studentRef = doc(db, 'students', studentId)
      const studentSnap = await getDoc(studentRef)

      if (!studentSnap.exists()) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        )
      }

      const student = { id: studentId, ...studentSnap.data() } as Student

      // Fetch active job postings
      const jobsRef = collection(db, 'jobPostings')
      const jobsSnap = await getDocs(jobsRef)
      const jobs = jobsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as JobPosting[]

      const matches = findBestJobMatches(student, jobs)

      return NextResponse.json({
        studentId,
        totalJobs: jobs.length,
        matches,
        matchCount: matches.length,
      })
    }

    // Find best candidates for a job
    if (action === 'job-students' && jobId) {
      const jobRef = doc(db, 'jobPostings', jobId)
      const jobSnap = await getDoc(jobRef)

      if (!jobSnap.exists()) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }

      const job = { id: jobId, ...jobSnap.data() } as JobPosting

      // Fetch all active students
      const studentsRef = collection(db, 'students')
      const studentsSnap = await getDocs(studentsRef)
      const students = studentsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Student[]

      const candidates = findBestStudentCandidates(job, students)

      return NextResponse.json({
        jobId,
        jobTitle: job.title,
        totalStudents: students.length,
        candidates,
        candidateCount: candidates.length,
      })
    }

    // Batch calculate for multiple students
    if (action === 'batch-students' && jobId && studentIds) {
      const jobRef = doc(db, 'jobPostings', jobId)
      const jobSnap = await getDoc(jobRef)

      if (!jobSnap.exists()) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }

      const job = { id: jobId, ...jobSnap.data() } as JobPosting

      // Fetch student documents
      const studentDocs = await Promise.all(
        studentIds.map((id: string) => getDoc(doc(db, 'students', id)))
      )

      const students = studentDocs
        .filter((snap) => snap.exists())
        .map((snap) => ({
          id: snap.id,
          ...snap.data(),
        })) as Student[]

      const matches = batchCalculateMatches(students, job)
      const stats = getMatchStatistics(matches)

      return NextResponse.json({
        jobId,
        matches,
        statistics: stats,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action or missing parameters' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[Matching API Error]', error)
    return NextResponse.json(
      { error: 'Failed to calculate matches' },
      { status: 500 }
    )
  }
}
