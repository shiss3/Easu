export const GUEST_SELECTION_STORAGE_KEY = "guest_selection" as const

export type ChildAge = number // 0 表示 1岁以下；1-17 表示对应岁数

export type GuestSelection = {
  rooms: number
  adults: number
  children: number
  childAges: Array<ChildAge | null>
}

export const GUEST_LIMITS = {
  rooms: { min: 1, max: 10 },
  adults: { min: 1, max: 300 },
  children: { min: 0, max: 4 },
} as const

export const DEFAULT_GUEST_SELECTION: GuestSelection = {
  rooms: 1,
  adults: 1,
  children: 0,
  childAges: [],
}

export const AGE_OPTIONS: Array<{ value: ChildAge; label: string }> = [
  { value: 0, label: "1岁以下" },
  ...Array.from({ length: 17 }, (_, i) => {
    const age = i + 1
    return { value: age, label: `${age}岁` }
  }),
]

export function formatChildAge(age: ChildAge | null): string {
  if (age == null) return "请选择"
  if (age === 0) return "1岁以下"
  return `${age}岁`
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function normalizeGuestSelection(input: Partial<GuestSelection> | null | undefined): GuestSelection {
  const rooms = clamp(Number(input?.rooms ?? DEFAULT_GUEST_SELECTION.rooms), GUEST_LIMITS.rooms.min, GUEST_LIMITS.rooms.max)
  const adults = clamp(Number(input?.adults ?? DEFAULT_GUEST_SELECTION.adults), GUEST_LIMITS.adults.min, GUEST_LIMITS.adults.max)
  const children = clamp(
    Number(input?.children ?? DEFAULT_GUEST_SELECTION.children),
    GUEST_LIMITS.children.min,
    GUEST_LIMITS.children.max
  )

  const rawAges = Array.isArray(input?.childAges) ? input!.childAges : []
  const normalizedAges: Array<ChildAge | null> = rawAges
    .slice(0, children)
    .map((v) => {
      if (v == null) return null
      const num = Number(v)
      if (!Number.isFinite(num)) return null
      return clamp(num, 0, 17)
    })

  while (normalizedAges.length < children) normalizedAges.push(null)

  return { rooms, adults, children, childAges: normalizedAges }
}

