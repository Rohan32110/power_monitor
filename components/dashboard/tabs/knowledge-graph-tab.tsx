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
const VW = 900
const VH = 360
const CX = VW / 2
const CY = VH * 0.44

const ROOM_IDS    = ['drawing_room', 'work_room_1', 'work_room_2'] as const
const ROOM_ANGLES = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6]
const ROOM_R      = 100
const DEV_R       = 72

function getRoomPos(ri: number) {
  const a = ROOM_ANGLES[ri] ?? 0
  return { x: CX + ROOM_R * Math.cos(a), y: CY + ROOM_R * Math.sin(a) }
}

function getDevPos(ri: number, di: number, total: number) {
  const a  = ROOM_ANGLES[ri] ?? 0
  const rx = CX + ROOM_R * Math.cos(a)
  const ry = CY + ROOM_R * Math.sin(a)
  const totalSpread = Math.min(Math.PI * 0.72, (total - 1) * 0.36)
  const offset = total > 1 ? (di / (total - 1) - 0.5) * totalSpread : 0
  return { x: rx + DEV_R * Math.cos(a + offset), y: ry + DEV_R * Math.sin(a + offset) }
}

function buildGraph(devices: Device[]): { nodes: KGNode[]; links: KGLink[] } {
  const nodeMap = new Map<string, KGNode>()
  const links: KGLink[] = []

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
      {([[10,16],[54,16],[10,48],[54,48]] as [number,number][]).map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="4" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
      ))}
      {([[26,29,14,19],[38,29,50,19],[26,35,14,45],[38,35,50,45]] as [number,number,number,number][]).map(([x1,y1,x2,y2],i) => (
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
        Hover a node · Drag to move · Scroll to zoom
      </span>
    </div>
  )
}

// ── Hover tooltip card — positioned in React outside the SVG ──────────────────
interface TooltipState {
  node: KGNode
  /** Screen-space coordinates (px) relative to the SVG element's bounding box */
  screenX: number
  screenY: number
}

interface TooltipProps {
  tooltip: TooltipState
  containerRef: React.RefObject<HTMLDivElement | null>
}

function NodeTooltip({ tooltip, containerRef }: TooltipProps) {
  const { node, screenX, screenY } = tooltip
  const cardW = 176
  const containerW = containerRef.current?.offsetWidth  ?? VW
  const containerH = containerRef.current?.offsetHeight ?? VH

  // Flip to left if near right edge, flip above if near bottom
  const isRight  = screenX + cardW + 16 > containerW
  const isBottom = screenY + 120 > containerH
  const left = isRight ? screenX - cardW - 12 : screenX + 14
  const top  = isBottom ? screenY - 100 : screenY - 12

  const dotColor =
    node.kind === 'office' ? '#4F46E5' :
    node.kind === 'room'   ? '#6366F1' :
    node.status            ? '#22C55E' : '#94A3B8'

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: cardW,
        zIndex: 50,
        pointerEvents: 'none',
      }}
      className="rounded-xl border border-border bg-card shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-border">
        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: dotColor }} />
        <span className="text-xs font-semibold text-foreground truncate">{node.label}</span>
        {node.status !== undefined && (
          <span
            className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
            style={{
              background: node.status ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.1)',
              color: node.status ? '#22C55E' : '#94A3B8',
            }}
          >
            {node.status ? 'ON' : 'OFF'}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 flex flex-col gap-1.5">
        <Row label="Type" value={node.kind.charAt(0).toUpperCase() + node.kind.slice(1)} />
        {node.room && (
          <Row label="Room" value={ROOM_LABELS[node.room as RoomId] ?? node.room} />
        )}
        {node.wattage != null && node.status && (
          <Row label="Draw" value={`${node.wattage}W`} mono />
        )}
        {node.kind === 'office' && (
          <Row label="Contains" value="3 rooms · 15 devices" />
        )}
        {node.kind === 'room' && (
          <Row label="Devices" value="5 devices" />
        )}
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`text-[11px] text-foreground ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</span>
    </div>
  )
}

// ── D3 graph ──────────────────────────────────────────────────────────────────
interface GraphProps {
  devices: Device[]
}

function D3Graph({ devices }: GraphProps) {
  const svgRef       = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const gRef         = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const nodeSelRef   = useRef<d3.Selection<SVGGElement, KGNode, SVGGElement, unknown> | null>(null)
  const linkSelRef   = useRef<d3.Selection<SVGLineElement, KGLink, SVGGElement, unknown> | null>(null)
  const lblSelRef    = useRef<d3.Selection<SVGTextElement, KGLink, SVGGElement, unknown> | null>(null)

  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  // Convert a node's viewBox coords → container screen-space px using current zoom transform
  function toScreen(node: KGNode): { screenX: number; screenY: number } {
    const svg  = svgRef.current
    const cont = containerRef.current
    if (!svg || !cont) return { screenX: 0, screenY: 0 }

    const transform  = d3.zoomTransform(svg)
    const svgRect    = svg.getBoundingClientRect()
    const contRect   = cont.getBoundingClientRect()

    // Node in viewBox space → screen space via zoom transform
    const vx = transform.applyX(node.x)
    const vy = transform.applyY(node.y)

    // Scale from viewBox to SVG pixel dimensions
    const scaleX = svgRect.width  / VW
    const scaleY = svgRect.height / VH

    const screenX = vx * scaleX + (svgRect.left - contRect.left)
    const screenY = vy * scaleY + (svgRect.top  - contRect.top)
    return { screenX, screenY }
  }

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
        .attr('id', id).attr('refX', 14).attr('refY', 3)
        .attr('markerWidth', 5).attr('markerHeight', 6)
        .attr('orient', 'auto-start-reverse')
        .append('path').attr('d', 'M0,0 L0,6 L6,3 z').attr('fill', color)
    mkMarker('a-room', '#6366F1')
    mkMarker('a-on',   '#22C55E')
    mkMarker('a-off',  '#94A3B8')

    const g = sel.append('g')
    gRef.current = g

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on('zoom', (e) => { g.attr('transform', e.transform); setTooltip(null) })
    sel.call(zoom)
    // Dismiss tooltip on background click
    sel.on('click', (e) => {
      if ((e.target as SVGElement).tagName === 'svg') setTooltip(null)
    })

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

    // Edge labels (hidden until zoomed)
    const lblSel = g.append('g').attr('class', 'edge-labels')
      .selectAll<SVGTextElement, KGLink>('text')
      .data(links).join('text')
      .attr('font-size', 7)
      .attr('fill', '#94A3B8')
      .attr('fill-opacity', 0)
      .attr('text-anchor', 'middle')
      .attr('dy', -3)
      .text((l) => l.label)
    lblSelRef.current = lblSel

    // Node groups
    const nodeSel = g.append('g').attr('class', 'nodes')
      .selectAll<SVGGElement, KGNode>('g')
      .data(nodes, (d) => d.id)
      .join('g')
      .attr('cursor', 'default')
      // ── Hover: show tooltip ───────────────────────────────────────────────
      .on('mouseenter', (_e, d) => {
        const { screenX, screenY } = toScreen(d)
        setTooltip({ node: d, screenX, screenY })
      })
      .on('mouseleave', () => setTooltip(null))
    nodeSelRef.current = nodeSel

    // Glow ring for ON devices
    nodeSel.filter((d) => d.status === true)
      .append('circle')
      .attr('r', (d) => nodeRadius(d) + 5)
      .attr('fill', 'none')
      .attr('stroke', '#22C55E')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.3)
      .attr('stroke-dasharray', '3 2')

    // Circles
    nodeSel.append('circle')
      .attr('r', (d) => nodeRadius(d))
      .attr('fill', (d) => nodeColor(d))
      .attr('fill-opacity', (d) => d.kind === 'room' ? 0.15 : 0.9)
      .attr('stroke', (d) => nodeColor(d))
      .attr('stroke-width', (d) => d.kind === 'office' ? 2.5 : 1.5)

    // Icon text inside nodes
    nodeSel.filter((d) => d.kind !== 'room').append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', (d) => d.kind === 'office' ? 11 : 8)
      .attr('fill', (d) => d.kind === 'office' ? '#fff' : d.status ? '#fff' : '#64748B')
      .attr('pointer-events', 'none')
      .text((d) => d.kind === 'office' ? 'HQ' : d.kind === 'fan' ? 'F' : 'L')

    // Labels below nodes
    nodeSel.append('text')
      .attr('dy', (d) => nodeRadius(d) + 11)
      .attr('text-anchor', 'middle')
      .attr('font-size', (d) => d.kind === 'office' ? 10 : d.kind === 'room' ? 9.5 : 8)
      .attr('font-weight', (d) => (d.kind === 'office' || d.kind === 'room') ? 600 : 400)
      .attr('fill', 'currentColor')
      .attr('fill-opacity', (d) => (d.kind !== 'office' && d.kind !== 'room' && !d.status) ? 0.4 : 1)
      .attr('pointer-events', 'none')
      .text((d) => d.label)

    // Drag
    nodeSel.call(
      d3.drag<SVGGElement, KGNode>()
        .on('start', () => setTooltip(null))
        .on('drag', (e, d) => {
          d.x = e.x; d.y = e.y
          applyPositions()
        })
    )

    applyPositions()

    function applyPositions() {
      linkSel
        .attr('x1', (l) => l.source.x).attr('y1', (l) => l.source.y)
        .attr('x2', (l) => l.target.x).attr('y2', (l) => l.target.y)
      lblSel
        .attr('x', (l) => (l.source.x + l.target.x) / 2)
        .attr('y', (l) => (l.source.y + l.target.y) / 2)
      nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    draw(devices)
  }, [devices, draw])

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        style={{ display: 'block' }}
        aria-label="Office knowledge graph"
      />
      {tooltip && (
        <NodeTooltip tooltip={tooltip} containerRef={containerRef} />
      )}
    </div>
  )
}

// ── KnowledgeGraphTab ─────────────────────────────────────────────────────────
export function KnowledgeGraphTab({ devices }: { devices: Device[] }) {
  return (
    <div className="flex flex-col gap-0">
      <HeroCard devices={devices} />
      <Legend />
      <div
        className="rounded-xl border border-border bg-card overflow-hidden"
        style={{ height: 360 }}
      >
        <D3Graph devices={devices} />
      </div>
    </div>
  )
}
