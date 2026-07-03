/**
 * Supabase persistor — writes simulator state to the database.
 * Called from API routes (server-side only).
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Device, Alert } from '@/types'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function persistDeviceStates(devices: Device[]) {
  const supabase = getAdminClient()
  const rows = devices.map((d) => ({
    id: d.id,
    room: d.room,
    device_type: d.device_type,
    device_number: d.device_number,
    label: d.label,
    status: d.status,
    wattage: d.wattage,
    last_changed: d.last_changed,
    updated_at: d.updated_at,
  }))
  const { error } = await supabase
    .from('device_states')
    .upsert(rows, { onConflict: 'id' })
  if (error) console.error('[persistor] device_states upsert error:', error.message)
}

export async function persistEnergyLog(
  totalWatts: number,
  roomWatts: Record<string, number>,
  todayKwh: number
) {
  const supabase = getAdminClient()
  const { error } = await supabase.from('energy_logs').insert({
    total_watts: totalWatts,
    room_watts: roomWatts,
    today_kwh: todayKwh,
    recorded_at: new Date().toISOString(),
  })
  if (error) console.error('[persistor] energy_logs insert error:', error.message)
}

export async function persistAlert(alert: Alert) {
  const supabase = getAdminClient()
  const { error } = await supabase
    .from('alerts')
    .upsert({
      id: alert.id,
      type: alert.type,
      room: alert.room,
      device_ids: alert.device_ids,
      message: alert.message,
      severity: alert.severity,
      triggered_at: alert.triggered_at,
      resolved_at: alert.resolved_at,
    }, { onConflict: 'id' })
  if (error) console.error('[persistor] alerts upsert error:', error.message)
}

export async function getEnergyHistory(hours = 24) {
  const supabase = getAdminClient()
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('energy_logs')
    .select('total_watts, room_watts, today_kwh, recorded_at')
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true })
    .limit(300)
  if (error) console.error('[persistor] energy_logs select error:', error.message)
  return data ?? []
}
