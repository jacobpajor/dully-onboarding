/** API shape returned to the frontend (matches onboarding/BACKEND_SPEC.md). */
export type OnboardingRecord = {
  id: string
  customerName: string
  createdAt: string
  completedAt: string | null
  sections: Record<string, unknown>
}

/** Raw DB row (snake_case columns). */
export type OnboardingRow = {
  id: string
  customer_name: string
  created_at: string
  completed_at: string | null
  sections: Record<string, unknown> | null
}

/** Map a DB row to the API shape the frontend expects. */
export function toApi(row: OnboardingRow): OnboardingRecord {
  return {
    id: row.id,
    customerName: row.customer_name,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    sections: row.sections ?? {},
  }
}
