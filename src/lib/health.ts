/** Day 2 hook: dead-link cron will write health + last_ok_at. Day 1 uses seed fields. */
export type HealthStatus = 'live' | 'dead' | 'unknown'
