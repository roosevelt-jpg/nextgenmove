// Performance monitoring and optimization utilities

export interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private marks: Map<string, number> = new Map()

  // Start measuring a metric
  startMeasure(markName: string): void {
    this.marks.set(markName, performance.now())
  }

  // End measuring and record metric
  endMeasure(markName: string, metadata?: Record<string, any>): number {
    const startTime = this.marks.get(markName)
    if (!startTime) {
      console.warn(`[Performance] No start mark found for ${markName}`)
      return 0
    }

    const duration = performance.now() - startTime
    this.metrics.push({
      name: markName,
      duration,
      timestamp: Date.now(),
      metadata,
    })

    this.marks.delete(markName)

    // Log slow operations
    if (duration > 1000) {
      console.warn(`[Performance] Slow operation detected: ${markName} took ${duration.toFixed(2)}ms`)
    }

    return duration
  }

  // Get all metrics
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  // Get metrics for specific operation
  getMetricsFor(name: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.name === name)
  }

  // Get average duration for operation
  getAverageDuration(name: string): number {
    const metrics = this.getMetricsFor(name)
    if (metrics.length === 0) return 0
    return metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
  }

  // Clear metrics
  clear(): void {
    this.metrics = []
    this.marks.clear()
  }

  // Export metrics for analysis
  export(): PerformanceMetric[] {
    return this.metrics
  }
}

export const monitor = new PerformanceMonitor()

// Measure function execution time
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  monitor.startMeasure(name)
  try {
    const result = await fn()
    monitor.endMeasure(name, metadata)
    return result
  } catch (error) {
    monitor.endMeasure(name, { ...metadata, error: true })
    throw error
  }
}

// Synchronous version
export function measureSync<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  monitor.startMeasure(name)
  try {
    const result = fn()
    monitor.endMeasure(name, metadata)
    return result
  } catch (error) {
    monitor.endMeasure(name, { ...metadata, error: true })
    throw error
  }
}

// Performance optimization tips reporter
export function generatePerformanceReport(): string {
  const metrics = monitor.export()
  const slowOps = metrics.filter((m) => m.duration > 500)
  const averages = new Map<string, number>()

  // Calculate averages
  const opNames = new Set(metrics.map((m) => m.name))
  opNames.forEach((name) => {
    averages.set(name, monitor.getAverageDuration(name))
  })

  let report = '=== Performance Report ===\n\n'

  report += `Total Metrics: ${metrics.length}\n`
  report += `Slow Operations (>500ms): ${slowOps.length}\n\n`

  report += 'Operation Averages:\n'
  averages.forEach((avg, name) => {
    const count = metrics.filter((m) => m.name === name).length
    report += `  ${name}: ${avg.toFixed(2)}ms (${count} samples)\n`
  })

  if (slowOps.length > 0) {
    report += '\nSlow Operations:\n'
    slowOps.forEach((m) => {
      report += `  ${m.name}: ${m.duration.toFixed(2)}ms\n`
    })
  }

  return report
}

// React performance optimization hooks

export function useMemo<T>(factory: () => T, deps: React.DependencyList): T {
  return React.useMemo(factory, deps)
}

export function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return React.useCallback(callback, deps)
}

// Check if component rendered (for debugging)
let renderCount = 0

export function useRenderCount(componentName: string = 'Component'): void {
  if (typeof window === 'undefined') return

  React.useEffect(() => {
    renderCount++
    if (renderCount % 10 === 0) {
      console.log(`[Render Count] ${componentName}: ${renderCount}`)
    }
  })
}

// Image optimization helper
export function getOptimizedImageUrl(
  url: string,
  options?: {
    width?: number
    height?: number
    quality?: 'low' | 'medium' | 'high'
  }
): string {
  if (!url) return ''

  // For Firebase Storage URLs
  if (url.includes('firebasestorage.googleapis.com')) {
    let optimized = url

    if (options?.width && options?.height) {
      optimized += `?width=${options.width}&height=${options.height}`
    }

    if (options?.quality) {
      const qualityMap = { low: 40, medium: 70, high: 90 }
      optimized += `&quality=${qualityMap[options.quality]}`
    }

    return optimized
  }

  return url
}

// Import React if needed
import React from 'react'

// Bundle size optimization suggestions
export const bundleOptimizations = {
  dynamicImports: [
    'Use dynamic() for heavy components',
    'Code split by route',
    'Lazy load below-the-fold content',
  ],
  treeShaking: [
    'Use named exports',
    'Avoid default exports in utilities',
    'Mark side effects in package.json',
  ],
  minification: [
    'Enable production builds',
    'Compress CSS and JS',
    'Remove console logs in production',
  ],
  caching: [
    'Set Cache-Control headers',
    'Implement service workers',
    'Cache API responses',
  ],
}

// Core Web Vitals monitoring
export interface WebVitals {
  LCP?: number // Largest Contentful Paint
  FID?: number // First Input Delay
  CLS?: number // Cumulative Layout Shift
  FCP?: number // First Contentful Paint
  TTFB?: number // Time to First Byte
}

export function captureWebVitals(callback: (vitals: WebVitals) => void): void {
  if (typeof window === 'undefined') return

  const vitals: WebVitals = {}

  // LCP - Largest Contentful Paint
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        vitals.LCP = lastEntry.renderTime || lastEntry.loadTime
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

      // FCP - First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        vitals.FCP = entries[0].startTime
      })
      fcpObserver.observe({ entryTypes: ['paint'] })

      // CLS - Cumulative Layout Shift
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
            vitals.CLS = clsValue
          }
        }
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })

      // Report vitals after page load
      setTimeout(() => {
        callback(vitals)
        lcpObserver.disconnect()
        fcpObserver.disconnect()
        clsObserver.disconnect()
      }, 5000)
    } catch (error) {
      console.error('[Web Vitals]', error)
    }
  }
}

// Memory usage monitoring (client-side)
export function checkMemoryUsage(): {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  percentage: number
} | null {
  if (typeof window === 'undefined') return null
  if (!('memory' in performance)) return null

  const memory = (performance as any).memory
  const percentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    percentage,
  }
}
