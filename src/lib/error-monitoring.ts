// Error monitoring and logging utilities
// Ready for Sentry, LogRocket, or similar integration

export interface ErrorLog {
  id: string
  timestamp: number
  severity: 'error' | 'warning' | 'info'
  message: string
  stack?: string
  context?: Record<string, any>
  userId?: string
  page?: string
  userAgent?: string
}

class ErrorMonitor {
  private errors: ErrorLog[] = []
  private maxErrors: number = 100
  private sentryDSN?: string

  constructor(sentryDSN?: string) {
    this.sentryDSN = sentryDSN
    this.setupErrorHandlers()
  }

  // Log an error
  logError(error: Error, context?: Record<string, any>, userId?: string): void {
    const errorLog: ErrorLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      severity: 'error',
      message: error.message,
      stack: error.stack,
      context,
      userId,
      page: typeof window !== 'undefined' ? window.location.pathname : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    }

    this.errors.push(errorLog)
    this.maintainErrorLimit()

    // Send to external services
    this.sendToMonitoring(errorLog)

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Error Monitor]', errorLog)
    }
  }

  // Log a warning
  logWarning(message: string, context?: Record<string, any>): void {
    const errorLog: ErrorLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      severity: 'warning',
      message,
      context,
      page: typeof window !== 'undefined' ? window.location.pathname : undefined,
    }

    this.errors.push(errorLog)
    this.maintainErrorLimit()

    if (process.env.NODE_ENV === 'development') {
      console.warn('[Error Monitor]', message, context)
    }
  }

  // Log info
  logInfo(message: string, context?: Record<string, any>): void {
    const errorLog: ErrorLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      severity: 'info',
      message,
      context,
      page: typeof window !== 'undefined' ? window.location.pathname : undefined,
    }

    this.errors.push(errorLog)
    this.maintainErrorLimit()
  }

  // Get all errors
  getErrors(): ErrorLog[] {
    return [...this.errors]
  }

  // Get errors by severity
  getErrorsBySeverity(severity: string): ErrorLog[] {
    return this.errors.filter(e => e.severity === severity)
  }

  // Get recent errors
  getRecentErrors(count: number = 10): ErrorLog[] {
    return this.errors.slice(-count).reverse()
  }

  // Clear errors
  clearErrors(): void {
    this.errors = []
  }

  // Export errors for analysis
  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2)
  }

  // Get error statistics
  getStatistics(): {
    totalErrors: number
    errorCount: number
    warningCount: number
    infoCount: number
    lastError?: ErrorLog
    errorRate: number
  } {
    const total = this.errors.length
    const errors = this.errors.filter(e => e.severity === 'error').length
    const warnings = this.errors.filter(e => e.severity === 'warning').length
    const info = this.errors.filter(e => e.severity === 'info').length

    return {
      totalErrors: total,
      errorCount: errors,
      warningCount: warnings,
      infoCount: info,
      lastError: this.errors[this.errors.length - 1],
      errorRate: total > 0 ? (errors / total) * 100 : 0,
    }
  }

  // Setup global error handlers
  private setupErrorHandlers(): void {
    if (typeof window === 'undefined') return

    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      this.logError(event.error as Error, {
        type: 'uncaught_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    })

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason))

      this.logError(error, {
        type: 'unhandled_promise_rejection',
      })
    })
  }

  // Send to external monitoring service
  private sendToMonitoring(errorLog: ErrorLog): void {
    // Sentry integration example
    if (this.sentryDSN && typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(new Error(errorLog.message), {
        level: errorLog.severity,
        contexts: {
          error: errorLog,
        },
      })
    }

    // Custom API endpoint
    if (process.env.NEXT_PUBLIC_ERROR_LOG_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ERROR_LOG_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorLog),
      }).catch(e => console.error('Failed to send error log:', e))
    }
  }

  // Maintain error limit
  private maintainErrorLimit(): void {
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors)
    }
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

export const errorMonitor = new ErrorMonitor(
  process.env.NEXT_PUBLIC_SENTRY_DSN
)

// Error type helpers
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, context)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404, { resource })
    this.name = 'NotFoundError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super('AUTH_ERROR', message, 401)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super('AUTHZ_ERROR', message, 403)
    this.name = 'AuthorizationError'
  }
}

// Error handling middleware
export function handleError(error: Error, context?: Record<string, any>): void {
  if (error instanceof AppError) {
    errorMonitor.logError(error, {
      code: error.code,
      statusCode: error.statusCode,
      ...error.context,
      ...context,
    })
  } else {
    errorMonitor.logError(error, context)
  }
}

// React error boundary helper
export function useErrorBoundary() {
  return {
    handleError: (error: Error, errorInfo: React.ErrorInfo) => {
      errorMonitor.logError(error, {
        type: 'react_error_boundary',
        componentStack: errorInfo.componentStack,
      })
    },
  }
}

// API error handler
export async function handleApiError(
  error: any,
  endpoint: string,
  userId?: string
): Promise<Response> {
  errorMonitor.logError(
    error instanceof Error ? error : new Error(String(error)),
    {
      endpoint,
      type: 'api_error',
    },
    userId
  )

  if (error instanceof AppError) {
    return new Response(
      JSON.stringify({
        error: error.code,
        message: error.message,
      }),
      { status: error.statusCode }
    )
  }

  return new Response(
    JSON.stringify({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    }),
    { status: 500 }
  )
}

// Initialize error monitoring
export function initializeErrorMonitoring(): void {
  if (process.env.NODE_ENV === 'production') {
    // Initialize Sentry in production
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // Sentry would be initialized in app layout
      errorMonitor.logInfo('Error monitoring initialized', {
        service: 'sentry',
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      })
    }
  }
}

import React from 'react'
