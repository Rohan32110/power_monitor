'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import type { Device, RoomId } from '@/types'
import { ROOM_LABELS } from '@/lib/config'

// ── Types ─────────────────────────────────────────────────────────────────────
interface KGNode {
  id: string
  label: string
  kind: 'office' | 'room' | 'fan' | 'light'
  status?: boolean
  wattage?: number
  room?: string
  x: number
  y: number
}
interface KGLink {
  source: KGNode
  target: KGNode
  label: string
  status?: boolean
}

// ── Fixed layout constants ─────────────────────────────────────────────────────
// We use a fixed 900×420 viewBox so positions are always deterministic
const VW = 900
const VH = 360
const CX = VW / 2        // 450
const CY = VH * 0.44     // 158 — slight upward offset to give bottom rooms room for labels

const ROOM_IDS  = ['drawing_room', 'work_room_1', 'work_room_2'] as const
// 3 rooms at top, bottom-right, bottom-left — 120° apart starting at top
const ROOM_ANGLES = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6]
const ROOM_R  = 100  // distance office→room
const DEV_R   = 72   // distance room→device

function getRoomPos(ri: number) {
  const a = ROOM_ANGLES[ri] ?? 0
  return { x: CX + ROOM_R * Math.cos(a), y: CY + ROOM_R * Math.sin(a) }
}

function getDevPos(ri: number, di: number, total: number) {
  const a = ROOM_ANGLES[ri] ?? 0
  const rx = CX + ROOM_R * Math.cos(a)
  const ry = CY + ROOM_R * Math.sin(a)
  // Fan out devices in an arc pointed away from center
  // Use 100° total spread for 5 devices → 25° step
  const totalSpread = Math.min(Math.PI * 0.72, (total - 1) * 0.36)
  const offset = total > 1 ? (di / (total - 1) - 0.5) * totalSpread : 0
  const devAngle = a + offset
  return { x: rx + DEV_R * Math.cos(devAngle), y: ry + DEV_R * Math.sin(devAngle) }
}

function buildGraph(devices: Device[]): { nodes: KGNode[]; links: KGLink[] } {
  const nodeMap = new Map<string, KGNode>()
  const links: KGLink[] = []

  // Office HQ node
  const officeNode: KGNode = { id: 'office', label: 'Office HQ', kind: 'office', x: CX, y: CY }
  nodeMap.set('office', officeNode)

  for (let ri = 0; ri < ROOM_IDS.length; ri++) {
    const room = ROOM_IDS[ri]
    const { x: rx, y: ry } = getRoomPos(ri)
    const roomNode: KGNode = { id: room, label: ROOM_LABELS[room], kind: 'room', x: rx, y: ry }
    nodeMap.set(room, roomNode)
    links.push({ source: officeNode, target: roomNode, label: 'contains' })

    const roomDevices = devices.filter((d) => d.room === room)
    roomDevices.forEach((d, di) => {
      const { x: dx, y: dy } = getDevPos(ri, di, roomDevices.length)
      const devNode: KGNode = {
        id: d.id,
        label: `${d.device_type === 'fan' ? 'Fan' : 'Light'} ${d.device_number}`,
        kind: d.device_type as 'fan' | 'light',
        status: d.status,
        wattage: d.wattage,
        room,
        x: dx, y: dy,
      }
      nodeMap.set(d.id, devNode)
      links.push({ source: roomNode, target: devNode, label: d.status ? 'ON' : 'OFF', status: d.status })
    })
  }

  return { nodes: Array.from(nodeMap.values()), links }
}

// ── Node visual helpers ───────────────────────────────────────────────────────
function nodeRadius(n: KGNode) {
  if (n.kind === 'office') return 22
  if (n.kind === 'room')   return 15
  return 9
}

function nodeColor(n: KGNode) {
  if (n.kind === 'office') return '#4F46E5'
  if (n.kind === 'room')   return '#6366F1'
  return n.status ? '#22C55E' : '#94A3B8'
}

// ── Ghost KG icon ─────────────────────────────────────────────────────────────
function GhostKG() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="h-full w-full" aria-hidden>
      <circle cx="32" cy="32" r="6" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
      {[[10,16],[54,16],[10,48],[54,48]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="4" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
      ))}
      {[[26,29,14,19],[38,29,50,19],[26,35,14,45],[38,35,50,45]].map(([x1,y1,x2,y2],i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.2" opacity="0.12" />
      ))}
    </svg>
  )
}

// ── Hero card ─────────────────────────────────────────────────────────────────
function HeroCard({ devices }: { devices: Device[] }) {
  const totalOn    = devices.filter((d) => d.status).length
  const totalNodes = 1 + 3 + devices.length
  const totalLinks = 3 + devices.length

  return (
    <div className="hero-glow relative overflow-hidden rounded-xl border border-border bg-card px-5 py-4 mb-4">
      <div className="pointer-events-none absolute -right-2 -top-2 h-28 w-28 text-primary">
        <GhostKG />
      </div>
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
            Interactive knowledge graph
          </p>
          <h1 className="text-xl font-bold text-foreground leading-snug">Office entity map</h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {[
            { label: 'Nodes', value: String(totalNodes) },
            { label: 'Edges', value: String(totalLinks) },
            { label: 'ON',    value: `${totalOn}/15` },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center rounded-lg border border-border bg-surface px-3 py-2 min-w-[58px]">
              <span className="text-sm font-bold tabular-nums text-foreground leading-none">{value}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { color: '#4F46E5', label: 'Office HQ' },
    { color: '#6366F1', label: 'Room' },
    { color: '#22C55E', label: 'Device ON' },
    { color: '#94A3B8', label: 'Device OFF' },
  ]
  return (
    <div className="flex items-center gap-4 px-1 mb-3 flex-wrap">
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
          {label}
        </div>
      ))}
      <span className="ml-auto text-xs text-muted-foreground hidden sm:block">
        Drag to move · Scroll to zoom · Click for info
      </span>
    </div>
  )
}

// ── D3 graph — fixed viewBox, drag + zoom only ────────────────────────────────
interface GraphProps {
  devices: Device[]
  onNodeClick: (node: KGNode | null) => void
}

function D3Graph({ devices, onNodeClick }: GraphProps) {
  const svgRef     = useRef<SVGSVGElement>(null)
  const gRef       = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const nodeSelRef = useRef<d3.Selection<SVGGElement, KGNode, SVGGElement, unknown> | null>(null)
  const linkSelRef = useRef<d3.Selection<SVGLineElement, KGLink, SVGGElement, unknown> | null>(null)
  const lblSelRef  = useRef<d3.Selection<SVGTextElement, KGLink, SVGGElement, unknown> | null>(null)

  // Keep a ref to devices so onNodeClick callbacks stay fresh
  const onNodeClickRef = useRef(onNodeClick)
  onNodeClickRef.current = onNodeClick

  // ── Build + draw ─────────────────────────────────────────────────────────
  const draw = useCallback((devs: Device[]) => {
    const svg = svgRef.current
    if (!svg) return

    const { nodes, links } = buildGraph(devs)

    d3.select(svg).selectAll('*').remove()
    gRef.current = null; nodeSelRef.current = null
    linkSelRef.current = null; lblSelRef.current = null

    const sel = d3.select(svg)

    // Defs — arrow markers
    const defs = sel.append('defs')
    const mkMarker = (id: string, color: string) =>
      defs.append('marker')
        .attr('id', id)
        .attr('refX', 14).attr('refY', 3)
        .attr('markerWidth', 5).attr('markerHeight', 6)
        .attr('orient', 'auto-start-reverse')
        .append('path').attr('d', 'M0,0 L0,6 L6,3 z').attr('fill', color)
    mkMarker('a-room', '#6366F1')
    mkMarker('a-on',   '#22C55E')
    mkMarker('a-off',  '#94A3B8')

    // Zoom group
    const g = sel.append('g')
    gRef.current = g

    // Zoom behaviour
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on('zoom', (e) => g.attr('transform', e.transform))
    sel.call(zoom)

    // Edges
    const linkSel = g.append('g').attr('class', 'links')
      .selectAll<SVGLineElement, KGLink>('line')
      .data(links).join('line')
      .attr('stroke', (l) => l.source.kind === 'office' ? '#6366F1' : l.status ? '#22C55E' : '#94A3B8')
      .attr('stroke-width', (l) => l.source.kind === 'office' ? 1.8 : 1.2)
      .attr('stroke-dasharray', (l) => (l.source.kind !== 'office' && !l.status) ? '4 3' : null)
      .attr('stroke-opacity', 0.65)
      .attr('marker-end', (l) => {
        if (l.source.kind === 'office') return 'url(#a-room)'
        return l.status ? 'url(#a-on)' : 'url(#a-off)'
      })
    linkSelRef.current = linkSel

    // Edge labels (hidden at default scale — visible when zoomed in)
    const lblSel = g.append('g').attr('class', 'edge-labels')
      .selectAll<SVGTextElement, KGLink>('text')
      .data(links).join('text')
      .attr('font-size', 7)
      .attr('fill', '#94A3B8')
      .attr('fill-opacity', 0)   // hidden by default — show on zoom via CSS
      .attr('text-anchor', 'middle')
      .attr('dy', -3)
      .text((l) => l.label)
    lblSelRef.current = lblSel

    // Node groups
    const nodeSel = g.append('g').attr('class', 'nodes')
      .selectAll<SVGGElement, KGNode>('g')
      .data(nodes, (d) => d.id)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (_e, d) => onNodeClickRef.current(d))
    nodeSelRef.current = nodeSel

    // Node: glow ring for ON devices
    nodeSel.filter((d) => d.status === true)
      .append('circle')
      .attr('r', (d) => nodeRadius(d) + 5)
      .attr('fill', 'none')
      .attr('stroke', '#22C55E')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.3)
      .attr('stroke-dasharray', '3 2')

    // Node: circles
    nodeSel.append('circle')
      .attr('r', (d) => nodeRadius(d))
      .attr('fill', (d) => nodeColor(d))
      .attr('fill-opacity', (d) => d.kind === 'room' ? 0.15 : 0.9)
      .attr('stroke', (d) => nodeColor(d))
      .attr('stroke-width', (d) => d.kind === 'office' ? 2.5 : 1.5)

    // Node: icon text (fan = ⊕, light = ◉, room = ▣)
    nodeSel.filter((d) => d.kind !== 'room').append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', (d) => d.kind === 'office' ? 11 : 8)
      .attr('fill', (d) => d.kind === 'office' ? '#fff' : d.status ? '#fff' : '#64748B')
      .text((d) => {
        if (d.kind === 'office') return 'HQ'
        if (d.kind === 'fan')    return 'F'
        return 'L'
      })

    // Node: labels below
    nodeSel.append('text')
      .attr('dy', (d) => nodeRadius(d) + 11)
      .attr('text-anchor', 'middle')
      .attr('font-size', (d) => d.kind === 'office' ? 10 : d.kind === 'room' ? 9.5 : 8)
      .attr('font-weight', (d) => (d.kind === 'office' || d.kind === 'room') ? 600 : 400)
      .attr('fill', 'currentColor')
      .attr('fill-opacity', (d) => (d.kind !== 'office' && d.kind !== 'room' && !d.status) ? 0.4 : 1)
      .text((d) => d.label)

    // Drag — updates node positions and redraws edges
    nodeSel.call(
      d3.drag<SVGGElement, KGNode>()
        .on('start', (_e, d) => { d.x = d.x; d.y = d.y })
        .on('drag', (e, d) => {
          d.x = e.x; d.y = e.y
          applyPositions()
        })
    )

    // Apply all positions
    applyPositions()

    function applyPositions() {
      linkSel
        .attr('x1', (l) => l.source.x)
        .attr('y1', (l) => l.source.y)
        .attr('x2', (l) => l.target.x)
        .attr('y2', (l) => l.target.y)
      lblSel
        .attr('x', (l) => (l.source.x + l.target.x) / 2)
        .attr('y', (l) => (l.source.y + l.target.y) / 2)
      nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`)
    }
  }, [])

  // Draw once on mount and re-draw when devices change (only device statuses)
  const devicesRef = useRef(devices)
  useEffect(() => {
    devicesRef.current = devices
    draw(devices)
  }, [devices, draw])

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full"
      style={{ display: 'block' }}
      aria-label="Office knowledge graph"
    />
  )
}

// ── KnowledgeGraphTab ─────────────────────────────────────────────────────────
export function KnowledgeGraphTab({ devices }: { devices: Device[] }) {
  const [selectedNode, setSelectedNode] = useState<KGNode | null>(null)

  return (
    <div className="flex flex-col gap-0">
      <HeroCard devices={devices} />
      <Legend />

      <div
        className="rounded-xl border border-border bg-card overflow-hidden"
        style={{ height: 360 }}
      >
        <D3Graph devices={devices} onNodeClick={(n) => setSelectedNode(n)} />
      </div>

      {/* Node detail panel */}
      {selectedNode && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ background: selectedNode.status ? '#22C55E' : '#94A3B8' }}
                />
                <h3 className="text-sm font-semibold text-foreground">{selectedNode.label}</h3>
                {selectedNode.status !== undefined && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded
                    ${selectedNode.status ? 'bg-on/10 text-on' : 'bg-muted text-muted-foreground'}`}>
                    {selectedNode.status ? 'ON' : 'OFF'}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>Type: <span className="text-foreground capitalize">{selectedNode.kind}</span></span>
                {selectedNode.room && (
                  <span>Room: <span className="text-foreground">{ROOM_LABELS[selectedNode.room as RoomId] ?? selectedNode.room}</span></span>
                )}
                {selectedNode.wattage != null && selectedNode.status && (
                  <span>Draw: <span className="text-foreground font-mono tabular-nums">{selectedNode.wattage}W</span></span>
                )}
                <span>ID: <span className="text-foreground font-mono">{selectedNode.id}</span></span>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
