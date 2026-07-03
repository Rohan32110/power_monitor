'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import type { Device, RoomId } from '@/types'
import { ROOM_LABELS } from '@/lib/config'

// ── Types ─────────────────────────────────────────────────────────────────────
interface KGNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  kind: 'office' | 'room' | 'fan' | 'light'
  status?: boolean
  wattage?: number
  room?: string
}
interface KGLink extends d3.SimulationLinkDatum<KGNode> {
  label: string
  status?: boolean
}

// ── Graph builder ─────────────────────────────────────────────────────────────
function buildGraph(devices: Device[]): { nodes: KGNode[]; links: KGLink[] } {
  const nodes: KGNode[] = [{ id: 'office', label: 'Office HQ', kind: 'office' }]
  const links: KGLink[] = []
  const ROOMS: RoomId[] = ['drawing_room', 'work_room_1', 'work_room_2']

  for (const room of ROOMS) {
    nodes.push({ id: room, label: ROOM_LABELS[room], kind: 'room' })
    links.push({ source: 'office', target: room, label: 'contains' })
    const roomDevices = devices.filter((d) => d.room === room)
    for (const d of roomDevices) {
      nodes.push({
        id: d.id,
        label: `${d.device_type === 'fan' ? 'Fan' : 'Light'} ${d.device_number}`,
        kind: d.device_type as 'fan' | 'light',
        status: d.status,
        wattage: d.wattage,
        room,
      })
      links.push({ source: room, target: d.id, label: d.status ? 'ON' : 'OFF', status: d.status })
    }
  }
  return { nodes, links }
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function GhostKG() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="h-full w-full" aria-hidden>
      <circle cx="32" cy="32" r="6" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
      <circle cx="10" cy="16" r="4" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
      <circle cx="54" cy="16" r="4" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
      <circle cx="10" cy="48" r="4" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
      <circle cx="54" cy="48" r="4" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
      <line x1="26" y1="29" x2="14" y2="19" stroke="currentColor" strokeWidth="1.2" opacity="0.12" />
      <line x1="38" y1="29" x2="50" y2="19" stroke="currentColor" strokeWidth="1.2" opacity="0.12" />
      <line x1="26" y1="35" x2="14" y2="45" stroke="currentColor" strokeWidth="1.2" opacity="0.12" />
      <line x1="38" y1="35" x2="50" y2="45" stroke="currentColor" strokeWidth="1.2" opacity="0.12" />
    </svg>
  )
}

function HeroCard({ devices }: { devices: Device[] }) {
  const totalOn    = devices.filter((d) => d.status).length
  const totalNodes = 1 + 3 + devices.length
  const totalLinks = 3 + devices.length

  return (
    <div className="hero-glow relative overflow-hidden rounded-xl border border-border bg-card p-6 mb-5">
      <div className="pointer-events-none absolute -right-2 -top-2 h-36 w-36 text-primary">
        <GhostKG />
      </div>
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Interactive knowledge graph
          </p>
          <h1 className="text-2xl font-bold text-foreground">Office entity map</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drag nodes to rearrange · Scroll to zoom · Click a node for details
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Total nodes', value: String(totalNodes) },
            { label: 'Edges',       value: String(totalLinks) },
            { label: 'Devices ON',  value: `${totalOn}/15` },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center rounded-lg border border-border bg-surface px-4 py-2.5 min-w-[72px]">
              <span className="text-base font-bold tabular-nums text-foreground leading-none">{value}</span>
              <span className="text-[11px] text-muted-foreground mt-1 whitespace-nowrap">{label}</span>
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
    { color: '#4F46E5', label: 'Office HQ',  shape: 'circle' },
    { color: '#6366F1', label: 'Room',        shape: 'rect' },
    { color: '#22C55E', label: 'Device ON',   shape: 'circle' },
    { color: '#64748B', label: 'Device OFF',  shape: 'circle' },
  ]
  return (
    <div className="flex items-center gap-4 px-1 mb-4 flex-wrap">
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
          {label}
        </div>
      ))}
      <span className="ml-auto text-xs text-muted-foreground">Dashed edge = device OFF</span>
    </div>
  )
}

// ── D3 graph ──────────────────────────────────────────────────────────────────
interface GraphProps {
  devices: Device[]
  onNodeClick: (node: KGNode | null) => void
}

function D3Graph({ devices, onNodeClick }: GraphProps) {
  const svgRef    = useRef<SVGSVGElement>(null)
  const simRef    = useRef<d3.Simulation<KGNode, KGLink> | null>(null)
  const initedRef = useRef(false)

  // Node style helpers
  const nodeRadius = (n: KGNode) =>
    n.kind === 'office' ? 20 : n.kind === 'room' ? 14 : 9

  const nodeColor = (n: KGNode) => {
    if (n.kind === 'office') return '#4F46E5'
    if (n.kind === 'room')   return '#6366F1'
    return n.status ? '#22C55E' : '#94A3B8'
  }

  const initGraph = useCallback((width: number, height: number) => {
    if (!svgRef.current) return
    const { nodes, links } = buildGraph(devices)
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    svg.attr('viewBox', `0 0 ${width} ${height}`)

    // Arrow markers
    const defs = svg.append('defs')
    const markerBase = {
      refX: 18, refY: 3, markerWidth: 6, markerHeight: 6,
      orient: 'auto-start-reverse',
    }
    defs.append('marker').attr('id', 'arrow-on')
      .attr('refX', markerBase.refX).attr('refY', markerBase.refY)
      .attr('markerWidth', markerBase.markerWidth).attr('markerHeight', markerBase.markerHeight)
      .attr('orient', markerBase.orient)
      .append('path').attr('d', 'M0,0 L0,6 L6,3 z').attr('fill', '#22C55E')

    defs.append('marker').attr('id', 'arrow-off')
      .attr('refX', markerBase.refX).attr('refY', markerBase.refY)
      .attr('markerWidth', markerBase.markerWidth).attr('markerHeight', markerBase.markerHeight)
      .attr('orient', markerBase.orient)
      .append('path').attr('d', 'M0,0 L0,6 L6,3 z').attr('fill', '#94A3B8')

    defs.append('marker').attr('id', 'arrow-room')
      .attr('refX', markerBase.refX).attr('refY', markerBase.refY)
      .attr('markerWidth', markerBase.markerWidth).attr('markerHeight', markerBase.markerHeight)
      .attr('orient', markerBase.orient)
      .append('path').attr('d', 'M0,0 L0,6 L6,3 z').attr('fill', '#6366F1')

    // Zoom group
    const g = svg.append('g')
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on('zoom', (event) => g.attr('transform', event.transform))
    )

    // Simulation — run to alpha 0 then stop completely
    const sim = d3.forceSimulation<KGNode>(nodes)
      .force('link', d3.forceLink<KGNode, KGLink>(links).id((d) => d.id).distance((l) => {
        const s = l.source as KGNode
        return s.kind === 'office' ? 160 : 80
      }).strength(0.9))
      .force('charge', d3.forceManyBody().strength(-260))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d) => nodeRadius(d as KGNode) + 18))
      .alphaDecay(0.04)
      .velocityDecay(0.45)

    simRef.current = sim

    // Edges
    const link = g.append('g').attr('class', 'links')
      .selectAll<SVGLineElement, KGLink>('line')
      .data(links).join('line')
      .attr('stroke', (l) => {
        const s = l.source as KGNode
        if (s.kind === 'office') return '#6366F1'
        return l.status ? '#22C55E' : '#94A3B8'
      })
      .attr('stroke-width', (l) => {
        const s = l.source as KGNode
        return s.kind === 'office' ? 1.5 : 1
      })
      .attr('stroke-dasharray', (l) => {
        const s = l.source as KGNode
        return (s.kind !== 'office' && !l.status) ? '4 3' : null
      })
      .attr('stroke-opacity', 0.7)
      .attr('marker-end', (l) => {
        const s = l.source as KGNode
        if (s.kind === 'office') return 'url(#arrow-room)'
        return l.status ? 'url(#arrow-on)' : 'url(#arrow-off)'
      })

    // Edge labels
    const edgeLabel = g.append('g').attr('class', 'edge-labels')
      .selectAll<SVGTextElement, KGLink>('text')
      .data(links).join('text')
      .attr('font-size', 8)
      .attr('fill', 'var(--muted-foreground)')
      .attr('text-anchor', 'middle')
      .attr('dy', -4)
      .text((l) => l.label)

    // Node groups
    const node = g.append('g').attr('class', 'nodes')
      .selectAll<SVGGElement, KGNode>('g')
      .data(nodes).join('g')
      .attr('cursor', 'pointer')
      .on('click', (_evt, d) => onNodeClick(d))
      .call(
        d3.drag<SVGGElement, KGNode>()
          .on('start', (_evt, d) => {
            // Briefly reheat only for this drag
            sim.alphaTarget(0.15).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (evt, d) => { d.fx = evt.x; d.fy = evt.y })
          .on('end', (_evt, d) => {
            // Stop reheating immediately; pin node in place
            sim.alphaTarget(0)
            d.fx = d.x; d.fy = d.y
          })
      )

    // Circle
    node.append('circle')
      .attr('r', (d) => nodeRadius(d))
      .attr('fill', (d) => nodeColor(d))
      .attr('fill-opacity', (d) => d.kind === 'room' ? 0.15 : 0.9)
      .attr('stroke', (d) => nodeColor(d))
      .attr('stroke-width', (d) => d.kind === 'office' ? 2.5 : 1.5)

    // Glow ring for ON devices
    node.filter((d) => d.status === true)
      .append('circle')
      .attr('r', (d) => nodeRadius(d) + 4)
      .attr('fill', 'none')
      .attr('stroke', '#22C55E')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.35)
      .attr('stroke-dasharray', '3 2')

    // Labels
    node.append('text')
      .attr('dy', (d) => nodeRadius(d) + 11)
      .attr('text-anchor', 'middle')
      .attr('font-size', (d) => d.kind === 'office' ? 11 : d.kind === 'room' ? 10 : 9)
      .attr('font-weight', (d) => d.kind === 'office' ? 700 : d.kind === 'room' ? 600 : 400)
      .attr('fill', 'var(--foreground)')
      .attr('fill-opacity', (d) => !d.status && d.kind === 'light' || !d.status && d.kind === 'fan' ? 0.45 : 1)
      .text((d) => d.label)

    // Tick
    sim.on('tick', () => {
      link
        .attr('x1', (l) => (l.source as KGNode).x!)
        .attr('y1', (l) => (l.source as KGNode).y!)
        .attr('x2', (l) => (l.target as KGNode).x!)
        .attr('y2', (l) => (l.target as KGNode).y!)

      edgeLabel
        .attr('x', (l) => ((l.source as KGNode).x! + (l.target as KGNode).x!) / 2)
        .attr('y', (l) => ((l.source as KGNode).y! + (l.target as KGNode).y!) / 2)

      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    // Stop simulation once settled (alpha < threshold)
    sim.on('end', () => {
      // Pin all nodes once settled to prevent any future drift
      for (const n of nodes) {
        n.fx = n.x
        n.fy = n.y
      }
    })
  }, [devices, onNodeClick])

  useEffect(() => {
    const container = svgRef.current?.parentElement
    if (!container) return

    // Use ResizeObserver to wait for a painted size
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width < 10 || height < 10) return
      if (initedRef.current) {
        // Re-init if size changes significantly (tab switch)
        observer.disconnect()
        initedRef.current = false
      }
      if (!initedRef.current) {
        initedRef.current = true
        // On tab switch the container may briefly report old size; schedule microtask
        requestAnimationFrame(() => initGraph(width, height))
      }
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      simRef.current?.stop()
      initedRef.current = false
    }
  }, [initGraph])

  return (
    <svg
      ref={svgRef}
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

      <div className="rounded-xl border border-border bg-card overflow-hidden" style={{ height: 520 }}>
        <D3Graph devices={devices} onNodeClick={(n) => setSelectedNode(n)} />
      </div>

      {/* Node detail panel */}
      {selectedNode && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ background: selectedNode.status ? '#22C55E' : '#94A3B8' }}
                />
                <h3 className="text-sm font-semibold text-foreground">{selectedNode.label}</h3>
                {selectedNode.status !== undefined && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${selectedNode.status ? 'bg-on/10 text-on' : 'bg-muted text-muted-foreground'}`}>
                    {selectedNode.status ? 'ON' : 'OFF'}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>Type: <span className="text-foreground capitalize">{selectedNode.kind}</span></span>
                {selectedNode.room && (
                  <span>Room: <span className="text-foreground">{ROOM_LABELS[selectedNode.room as RoomId] ?? selectedNode.room}</span></span>
                )}
                {selectedNode.wattage && selectedNode.status && (
                  <span>Draw: <span className="text-foreground font-mono tabular-nums">{selectedNode.wattage}W</span></span>
                )}
                <span>ID: <span className="text-foreground font-mono">{selectedNode.id}</span></span>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-4"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
