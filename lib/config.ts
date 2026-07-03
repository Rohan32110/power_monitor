import type { RoomId } from '@/types'

export const WATTAGE = { fan: 60, light: 15 } as const
export const OFFICE_HOURS = { start: 9, end: 17 } as const
export const ALL_ON_ALERT_THRESHOLD_HOURS = 2

export const ROOM_LIST: RoomId[] = ['drawing_room', 'work_room_1', 'work_room_2']

export const ROOM_LABELS: Record<RoomId, string> = {
  drawing_room: 'Drawing Room',
  work_room_1: 'Work Room 1',
  work_room_2: 'Work Room 2',
}

export const ROOM_DESCRIPTIONS: Record<RoomId, string> = {
  drawing_room: 'Waiting & reception area',
  work_room_1: 'Primary employee workspace',
  work_room_2: 'Secondary employee workspace',
}

export const DEVICES_PER_ROOM = {
  fans: 2,
  lights: 3,
} as const

export function isOfficeHours(): boolean {
  const now = new Date()
  const hour = now.getHours()
  return hour >= OFFICE_HOURS.start && hour < OFFICE_HOURS.end
}
