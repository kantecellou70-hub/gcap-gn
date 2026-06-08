const THRESHOLDS = {
  LCP:  2500,  // Largest Contentful Paint < 2.5s (3G: 3s)
  FID:  100,   // First Input Delay < 100ms
  CLS:  0.1,   // Cumulative Layout Shift < 0.1
  TTFB: 800,   // Time to First Byte < 800ms
  INP:  200,   // Interaction to Next Paint < 200ms
} as const

function logMetric(name: string, value: number, threshold: number) {
  const status = value <= threshold ? '✓' : '✗'
  const rounded = Math.round(value)
  console.info(`[WebVitals] ${status} ${name}: ${rounded}ms (seuil: ${threshold}ms)`)

  if (value > threshold * 2 && import.meta.env.PROD) {
    console.warn(`[WebVitals] ${name} dépasse 2× le seuil sur connexion terrain`)
  }
}

export function initWebVitals(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

  // LCP — Largest Contentful Paint
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number }
      if (last) logMetric('LCP', last.startTime, THRESHOLDS.LCP)
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  } catch { /* non supporté */ }

  // FID — First Input Delay
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { processingStart: number; startTime: number }
        logMetric('FID', e.processingStart - e.startTime, THRESHOLDS.FID)
      }
    }).observe({ type: 'first-input', buffered: true })
  } catch { /* non supporté */ }

  // CLS — Cumulative Layout Shift
  try {
    let clsValue = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }
        if (!e.hadRecentInput) {
          clsValue += e.value
          logMetric('CLS (cumulé)', clsValue * 1000, THRESHOLDS.CLS * 1000)
        }
      }
    }).observe({ type: 'layout-shift', buffered: true })
  } catch { /* non supporté */ }

  // TTFB — Time to First Byte
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const nav = entry as PerformanceNavigationTiming
        if (nav.responseStart) logMetric('TTFB', nav.responseStart, THRESHOLDS.TTFB)
      }
    }).observe({ type: 'navigation', buffered: true })
  } catch { /* non supporté */ }

  // INP — Interaction to Next Paint
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { duration: number }
        logMetric('INP', e.duration, THRESHOLDS.INP)
      }
    }).observe({ type: 'event', durationThreshold: 16, buffered: true })
  } catch { /* non supporté */ }
}

export function measurePageLoad(pageName: string): void {
  if (typeof window === 'undefined' || !window.performance) return

  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  if (!nav) return

  const loadTime = nav.loadEventEnd - nav.fetchStart
  const SLOW_3G_THRESHOLD = 3000

  if (loadTime > SLOW_3G_THRESHOLD) {
    console.warn(`[WebVitals] ${pageName} chargement lent: ${Math.round(loadTime)}ms (> ${SLOW_3G_THRESHOLD}ms — seuil 3G)`)
  } else if (import.meta.env.DEV) {
    console.info(`[WebVitals] ${pageName}: ${Math.round(loadTime)}ms`)
  }
}
