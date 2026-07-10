// Rate limiting helper using in-memory store
// For production, consider using Redis or a dedicated service

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const key = identifier

  if (!store[key]) {
    store[key] = { count: 1, resetTime: now + windowMs }
    return true
  }

  const record = store[key]

  if (now > record.resetTime) {
    // Reset window
    record.count = 1
    record.resetTime = now + windowMs
    return true
  }

  if (record.count < limit) {
    record.count++
    return true
  }

  return false
}

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  }
}, 5 * 60 * 1000)

// Rate limit configurations
export const rateLimitConfigs = {
  login: {
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many login attempts, please try again later',
  },
  signup: {
    limit: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many signup attempts, please try again later',
  },
  passwordReset: {
    limit: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many password reset attempts, please try again later',
  },
  api: {
    limit: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many requests, please try again later',
  },
}
