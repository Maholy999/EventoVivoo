export interface RateLimiterOptions {
  maxAttempts: number;
  windowMs: number;
}

export interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
}

export class LoginRateLimiter {
  private attempts = new Map<string, AttemptRecord>();

  constructor(
    private options: RateLimiterOptions = { maxAttempts: 5, windowMs: 15 * 60 * 1000 }
  ) {}

  isLimited(key: string, now: number = Date.now()): boolean {
    const record = this.attempts.get(key);
    if (!record) return false;

    if (now - record.firstAttemptAt > this.options.windowMs) {
      this.attempts.delete(key);
      return false;
    }

    return record.count >= this.options.maxAttempts;
  }

  recordFailedAttempt(key: string, now: number = Date.now()): void {
    const record = this.attempts.get(key);
    if (!record || now - record.firstAttemptAt > this.options.windowMs) {
      this.attempts.set(key, { count: 1, firstAttemptAt: now });
    } else {
      record.count += 1;
    }
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}
