import type { TripStatus } from '@/types'

const KEY = 'cya-attendance-status'

type StatusMap = Record<string, { june4_status: TripStatus; june7_status: TripStatus }>

export function loadStatusMap(): StatusMap {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch { return {} }
}

export function saveStatus(name: string, trip: 'june4_status' | 'june7_status', value: TripStatus) {
  if (typeof window === 'undefined') return
  try {
    const map = loadStatusMap()
    if (!map[name]) map[name] = { june4_status: 'not_going', june7_status: 'not_going' }
    map[name][trip] = value
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {}
}

export function saveStatusMapFromMembers(members: { name: string; june4_status: TripStatus; june7_status: TripStatus }[]) {
  if (typeof window === 'undefined') return
  try {
    const map: StatusMap = {}
    for (const m of members) {
      map[m.name] = { june4_status: m.june4_status, june7_status: m.june7_status }
    }
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {}
}
