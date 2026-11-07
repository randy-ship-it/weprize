export function contestClosesAt(contest: { close_at_et?: string | null }): Date | null

export function isEligibleCurrentContest(
  contest: {
    auto_class?: string
    health?: string
    region?: string
    close_at_et?: string | null
  },
  now?: Date,
): boolean
