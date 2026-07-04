export type RoomId = 'drawing_room' | 'work_room_1' | 'work_room_2'
export type DeviceType = 'fan' | 'light'

export interface Device {
  id: string
  room: RoomId
  device_type: DeviceType
  device_number: number
  label: string
  status: boolean
  wattage: number
  last_changed: string // ISO timestamp
  updated_at: string
}

export interface RoomWatts {
  drawing_room: number
  work_room_1: number
  work_room_2: number
}

export interface EnergyLog {
  total_watts: number
  room_watts: RoomWatts
  recorded_at: string
  today_kwh: number
}

export type AlertType = 'after_hours' | 'all_on_2hr'
export type AlertSeverity = 'warning' | 'critical'

export interface Alert {
  id: string
  type: AlertType
  room: RoomId
  device_ids: string[]
  message: string
  severity: AlertSeverity
  triggered_at: string
  resolved_at: string | null
}

export interface OfficeState {
  devices: Device[]
  energy: EnergyLog
  alerts: Alert[]
}

// Knowledge Graph types
export type KGNodeType = 'office' | 'room' | 'fan' | 'light'

export interface KGNode {
  id: string
  label: string
  type: KGNodeType
  status?: boolean
  wattage?: number
  room?: RoomId
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

export interface KGLink {
  source: string
  target: string
  label: string
}

export interface KGGraph {
  nodes: KGNode[]
  links: KGLink[]
}
