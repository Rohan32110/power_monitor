import type { Device, Alert, OfficeState, RoomId } from '@/types'
import {
  WATTAGE,
  OFFICE_HOURS,
  ALL_ON_ALERT_THRESHOLD_HOURS,
  ROOM_LIST,
  ROOM_LABELS,
  isOfficeHours,
} from './config'

// ─── Seed the 15 fixed devices ───────────────────────────────────────────────

function seedDevices(): Device[] {
  const devices: Device[] = []
  const now = new Date().toISOString()

  for (const room of ROOM_LIST) {
    for (let i = 1; i <= 2; i++) {
      devices.push({
        id: `${room}-fan-${i}`,
        room,
        device_type: 'fan',
        device_number: i,
        label: `${ROOM_LABELS[room]} — Fan ${i}`,
        status: false,
        wattage: WATTAGE.fan,
        last_changed: now,
        updated_at: now,
      })
    }
    for (let i = 1; i <= 3; i++) {
      devices.push({
        id: `${room}-light-${i}`,
        room,
        device_type: 'light',
        device_number: i,
        label: `${ROOM_LABELS[room]} — Light ${i}`,
        status: false,
        wattage: WATTAGE.light,
        last_changed: now,
        updated_at: now,
      })
    }
  }

  // Demo: turn on a few devices at start to make it interesting
  const initialOn = [
    'drawing_room-fan-1',
    'drawing_room-light-1',
    'drawing_room-light-2',
    'work_room_1-fan-1',
    'work_room_1-fan-2',
    'work_room_1-light-1',
    'work_room_1-light-2',
    'work_room_1-light-3',
    'work_room_2-fan-2',
    'work_room_2-light-1',
  ]

  for (const d of devices) {
    if (initialOn.includes(d.id)) {
      // Set last_changed to 2.5 hours ago to trigger all-on-2hr alert for work_room_1
      const pastTime = new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString()
      d.status = true
      d.last_changed = pastTime
    }
  }

  return devices
}

// ─── Simulator state (module-level singleton) ─────────────────────────────────

let _devices: Device[] = seedDevices()
let _alerts: Alert[] = []
let _energyLog: number[] = [] // watts per tick
let _alertIdCounter = 1

// ─── Tick logic ───────────────────────────────────────────────────────────────

export function simulateTick(): void {
  const now = new Date()
  const hour = now.getHours()
  const duringOfficeHours = isOfficeHours()
  const nowISO = now.toISOString()

  _devices = _devices.map((device) => {
    // Toggle probability based on time-of-day
    // Office hours: 5% chance, biased toward ON
    // After hours: 1% chance, biased toward OFF
    const toggleChance = duringOfficeHours ? 0.05 : 0.01
    const roll = Math.random()

    if (roll < toggleChance) {
      const newStatus = duringOfficeHours
        ? Math.random() > 0.35 // 65% toward ON during hours
        : Math.random() > 0.8  // 20% toward ON after hours (leaves some on)

      if (newStatus !== device.status) {
        return {
          ...device,
          status: newStatus,
          last_changed: nowISO,
          updated_at: nowISO,
        }
      }
    }
    return { ...device, updated_at: nowISO }
  })

  // Log energy
  const totalWatts = _devices.reduce((sum, d) => sum + (d.status ? d.wattage : 0), 0)
  _energyLog.push(totalWatts)
  // Keep max 24 * 60 ticks (24h at 1/min)
  if (_energyLog.length > 1440) _energyLog.shift()

  // Run alert check
  _checkAlerts(now)
}

// ─── Alert evaluation ─────────────────────────────────────────────────────────

function _checkAlerts(now: Date): void {
  const hour = now.getHours()
  const afterHours = hour < OFFICE_HOURS.start || hour >= OFFICE_HOURS.end

  for (const room of ROOM_LIST) {
    const roomDevices = _devices.filter((d) => d.room === room)

    // Rule 1: after_hours — any device ON outside office hours
    if (afterHours) {
      const onDevices = roomDevices.filter((d) => d.status)
      if (onDevices.length > 0) {
        _insertAlertIfNew('after_hours', room, onDevices.map((d) => d.id), 'warning',
          `${ROOM_LABELS[room]}: ${onDevices.length} device${onDevices.length > 1 ? 's' : ''} left on after office hours.`)
      } else {
        _resolveAlert('after_hours', room)
      }
    } else {
      _resolveAlert('after_hours', room)
    }

    // Rule 2: all_on_2hr — all 5 devices ON continuously for 2+ hours
    const allOn = roomDevices.every((d) => d.status)
    if (allOn) {
      const oldestChange = Math.min(...roomDevices.map((d) => new Date(d.last_changed).getTime()))
      const hoursOn = (Date.now() - oldestChange) / (1000 * 60 * 60)
      if (hoursOn >= ALL_ON_ALERT_THRESHOLD_HOURS) {
        _insertAlertIfNew('all_on_2hr', room, roomDevices.map((d) => d.id), 'critical',
          `${ROOM_LABELS[room]}: All devices have been ON continuously for ${hoursOn.toFixed(1)} hours.`)
      } else {
        _resolveAlert('all_on_2hr', room)
      }
    } else {
      _resolveAlert('all_on_2hr', room)
    }
  }
}

function _insertAlertIfNew(
  type: Alert['type'],
  room: RoomId,
  device_ids: string[],
  severity: Alert['severity'],
  message: string
): void {
  const existing = _alerts.find(
    (a) => a.type === type && a.room === room && !a.resolved_at
  )
  if (!existing) {
    _alerts.push({
      id: String(_alertIdCounter++),
      type,
      room,
      device_ids,
      message,
      severity,
      triggered_at: new Date().toISOString(),
      resolved_at: null,
    })
  }
}

function _resolveAlert(type: Alert['type'], room: RoomId): void {
  _alerts = _alerts.map((a) => {
    if (a.type === type && a.room === room && !a.resolved_at) {
      return { ...a, resolved_at: new Date().toISOString() }
    }
    return a
  })
}

// ─── Public read accessors ────────────────────────────────────────────────────

export function getDevices(): Device[] {
  return _devices
}

export function getActiveAlerts(): Alert[] {
  return _alerts.filter((a) => !a.resolved_at)
}

export function getEnergyData() {
  const totalWatts = _devices.reduce((sum, d) => sum + (d.status ? d.wattage : 0), 0)

  const roomWatts = {
    drawing_room: 0,
    work_room_1: 0,
    work_room_2: 0,
  }
  for (const d of _devices) {
    if (d.status) roomWatts[d.room] += d.wattage
  }

  // kWh: sum of all ticks × (1 min / 60) / 1000
  const todayKwh = _energyLog.reduce((sum, w) => sum + w * (1 / 60) / 1000, 0)

  return {
    total_watts: totalWatts,
    room_watts: roomWatts,
    today_kwh: Number(todayKwh.toFixed(3)),
    recorded_at: new Date().toISOString(),
  }
}

export function getOfficeState(): OfficeState {
  return {
    devices: getDevices(),
    energy: { ...getEnergyData(), today_kwh: getEnergyData().today_kwh },
    alerts: getActiveAlerts(),
  }
}

// ─── Initialize alerts on load ────────────────────────────────────────────────
// Run one tick on module load so alerts are populated immediately
_checkAlerts(new Date())
