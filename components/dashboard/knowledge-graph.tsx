'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import type { Device, KGNode, KGLink } from '@/types'
import { ROOM_LIST, ROOM_LABELS } from '@/lib/config'

interface Props {
  devices: Device[]
}

function buildGraph(devices: Device[]): { nodes: KGNode[]; links: KGLink[] } {
  const nodes: KGNode[] = []
  const links: KGLink[] = []

  nodes.push({ id: 'office', label: 'Office HQ', type: 'office' })

  for (const room of ROOM_LIST) {
    nodes.push({ id: room, label: ROOM_LABELS[room], type: 'room', room })
    links.push({ source: 'office', target: room, label: 'contains' })

    for (const d of devices.filter((dev) => dev.room === room)) {
      nodes.push({
        id: d.id,
        label: `${d.device_type === 'fan' ? 'Fan' : 'Light'} ${d.device_number}`,
        type: d.device_type,
        status: d.status,
        wattage: d.wattage,
        room,
      })
      links.push({ source: room, target: d.id, label: d.status ? 'ON' : 'OFF' })
    }
  }
  return { nodes, links }
}

const NODE_R: Record<string, number> = { office: 26, room: 18, fan: 12, light: 12 }

function nodeColors(n: KGNode) {
  if (n.type === 'office') return { fill: 'rgba(79,70,229,0.12)', stroke: '#4F46E5' }
  if (n.type === 'room')   return { fill: 'rgba(99,102,241,0.08)', stroke: '#818CF8' }
  if (n.type === 'fan')    return n.status
    ? { fill: 'rgba(79,70,229,0.1)', stroke: '#4F46E5' }
    : { fill: 'rgba(0,0,0,0)',       stroke: '#D4D4D8' }
  // light
  return n.status
    ? { fill: 'rgba(245,158,11,0.12)', stroke: '#F59E0B' }
    : { fill: 'rgba(0,0,0,0)',         stroke: '#D4D4D8' }
}

function nodeTextColor(n: KGNode) {
  if (n.type === 'office') return '#4F46E5'
  if (n.type === 'room')   return '#818CF8'
  if (n.type === 'fan')    return n.status ? '#4F46E5' : '#A1A1AA'
  return n.status ? '#F59E0B' : '#A1A1AA'
}

function linkColor(tgt: KGNode) {
  if (tgt.type === 'room') return '#818CF8'
  return tgt.status ? '#22C55E' : '#D4D4D8'
}

export function KnowledgeGraph({ devices }: Props) {
  const svgRef       = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const simRef       = useRef<d3.Simulation<KGNode, KGLink> | null>(null)
  // Stable positions persist across device updates
  const posRef       = useRef<Map<string, { x: number; y: number; fx?: number | null; fy?: number | null }>>(new Map())
  const mountedRef   = useRef(false)

  const [selectedNode, setSelectedNode] = useState<KGNode | null>(null)

  // ── Build the D3 graph (called ONCE after the container has real dimensions) ──
  const initGraph = useCallback((W: number, H: number) => {
    const svg = svgRef.current
    if (!svg) return

    const graph = buildGraph(devices)

    // Restore saved positions into nodes
    const nodes: KGNode[] = graph.nodes.map((n) => {
      const s = posRef.current.get(n.id)
      return { ...n, x: s?.x, y: s?.y, fx: s?.fx ?? null, fy: s?.fy ?? null }
    })
    const links: KGLink[] = graph.links.map((l) => ({ ...l }))

    d3.select(svg).selectAll('*').remove()

    const svgEl = d3.select(svg)
      .attr('width', W)
      .attr('height', H)
      .attr('viewBox', `0 0 ${W} ${H}`)

    // Arrow marker
    const defs = svgEl.append('defs')
    defs.append('marker')
      .attr('id', 'kg-arrow')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#A1A1AA')
      .attr('fill-opacity', '0.45')

    // Zoom group
    const g = svgEl.append('g')
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 3])
      .on('zoom', (ev) => g.attr('transform', ev.transform))
    svgEl.call(zoom)
    // Default scale so graph is centred
    svgEl.call(zoom.transform, d3.zoomIdentity.translate(W * 0.05, H * 0.05).scale(0.9))

    svgEl.on('click', () => setSelectedNode(null))

    // ── Simulation ────────────────────────────────────────────────────────────
    // alphaDecay 0.035 → settles in ~70 ticks (~2s). Never restarted externally.
    const sim = d3.forceSimulation<KGNode>(nodes)
      .alphaDecay(0.035)
      .force('link',
        d3.forceLink<KGNode, KGLink>(links)
          .id((d) => d.id)
          .distance((l) => (l.source as KGNode).type === 'office' ? 140 : 80)
          .strength(0.55)
      )
      .force('charge', d3.forceManyBody().strength(-280))
      .force('center', d3.forceCenter(W / 2, H / 2).strength(0.06))
      .force('collide', d3.forceCollide<KGNode>((d) => NODE_R[d.type] + 18))

    simRef.current = sim

    // ── Links ─────────────────────────────────────────────────────────────────
    const linkG = g.append('g')
    const linkEl = linkG.selectAll<SVGLineElement, KGLink>('line')
      .data(links, (l) => `${(l.source as KGNode).id ?? l.source}-${(l.target as KGNode).id ?? l.target}`)
      .join('line')
      .attr('stroke', (l) => linkColor(l.target as KGNode))
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.4)
      .attr('stroke-dasharray', (l) => {
        const t = l.target as KGNode
        return (t.type === 'fan' || t.type === 'light') && !t.status ? '4,3' : 'none'
      })
      .attr('marker-end', 'url(#kg-arrow)')

    const linkLabelEl = linkG.selectAll<SVGTextElement, KGLink>('text')
      .data(links)
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('dy', -5)
      .attr('font-size', 8)
      .attr('font-family', 'ui-monospace, monospace')
      .attr('fill', '#A1A1AA')
      .attr('fill-opacity', 0.55)
      .attr('pointer-events', 'none')
      .text((l) => l.label)

    // ── Nodes ─────────────────────────────────────────────────────────────────
    const nodeG = g.append('g')
    const nodeEl = nodeG.selectAll<SVGGElement, KGNode>('g.node')
      .data(nodes, (d) => d.id)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'grab')

    // Glow halo for ON devices
    nodeEl.filter((d) => (d.type === 'fan' || d.type === 'light') && !!d.status)
      .append('circle')
      .attr('r', (d) => NODE_R[d.type] + 8)
      .attr('fill', 'none')
      .attr('stroke', (d) => d.type === 'light' ? '#F59E0B' : '#4F46E5')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.18)

    // Main circle
    nodeEl.append('circle')
      .attr('r', (d) => NODE_R[d.type])
      .attr('fill', (d) => nodeColors(d).fill)
      .attr('stroke', (d) => nodeColors(d).stroke)
      .attr('stroke-width', (d) => d.type === 'office' || d.type === 'room' ? 1.5 : 1)

    // Icon / abbreviation
    nodeEl.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', (d) => d.type === 'office' ? 11 : d.type === 'room' ? 9 : 8)
      .attr('font-weight', 600)
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .attr('fill', (d) => nodeTextColor(d))
      .attr('pointer-events', 'none')
      .text((d) => {
        if (d.type === 'office') return 'HQ'
        if (d.type === 'room')   return d.label.split(' ')[0].slice(0, 4)
        return d.type === 'fan' ? 'F' : 'L'
      })

    // Label below node
    nodeEl.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => NODE_R[d.type] + 14)
      .attr('font-size', (d) => d.type === 'office' ? 10 : 9)
      .attr('font-weight', (d) => d.type === 'office' || d.type === 'room' ? 600 : 400)
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .attr('fill', (d) => nodeTextColor(d))
      .attr('pointer-events', 'none')
      .text((d) => d.label)

    // Wattage above ON devices
    nodeEl.filter((d) => (d.type === 'fan' || d.type === 'light') && !!d.status)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => -NODE_R[d.type] - 5)
      .attr('font-size', 7)
      .attr('font-family', 'ui-monospace, monospace')
      .attr('fill', '#22C55E')
      .attr('pointer-events', 'none')
      .text((d) => `${d.wattage}W`)

    // ── Drag ─────────────────────────────────────────────────────────────────
    // Key fix: only set alphaTarget during drag, reset to 0 on end.
    // Nodes stay fixed (fx/fy set on drag end) so they don't drift after release.
    const drag = d3.drag<SVGGElement, KGNode>()
      .on('start', (event, d) => {
        if (!event.active) sim.alphaTarget(0.15).restart()
        d.fx = d.x
        d.fy = d.y
        d3.select<SVGGElement, KGNode>(event.currentTarget).style('cursor', 'grabbing')
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        // Immediately cool — prevents continued floating after drop
        if (!event.active) sim.alphaTarget(0)
        // Pin to where user dropped it
        d.fx = event.x
        d.fy = event.y
        posRef.current.set(d.id, { x: d.x ?? 0, y: d.y ?? 0, fx: d.fx, fy: d.fy })
        d3.select<SVGGElement, KGNode>(event.currentTarget).style('cursor', 'grab')
      })

    nodeEl.call(drag as never)

    // Click to select
    nodeEl.on('click', (event, d) => {
      event.stopPropagation()
      setSelectedNode((prev) => (prev?.id === d.id ? null : { ...d }))
    })

    // ── Tick ─────────────────────────────────────────────────────────────────
    sim.on('tick', () => {
      linkEl
        .attr('x1', (l) => (l.source as KGNode).x ?? 0)
        .attr('y1', (l) => (l.source as KGNode).y ?? 0)
        .attr('x2', (l) => (l.target as KGNode).x ?? 0)
        .attr('y2', (l) => (l.target as KGNode).y ?? 0)
      linkLabelEl
        .attr('x', (l) => (((l.source as KGNode).x ?? 0) + ((l.target as KGNode).x ?? 0)) / 2)
        .attr('y', (l) => (((l.source as KGNode).y ?? 0) + ((l.target as KGNode).y ?? 0)) / 2)
      nodeEl.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
      // Persist positions continuously for when devices update
      nodes.forEach((n) => {
        if (n.x !== undefined) posRef.current.set(n.id, { x: n.x, y: n.y ?? 0, fx: n.fx, fy: n.fy })
      })
    })

    return () => sim.stop()
  }, [devices]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mount: wait for real container width, then init ONCE ─────────────────
  useEffect(() => {
    if (mountedRef.current) return
    const container = containerRef.current
    if (!container) return

    // Use ResizeObserver to catch when the container first gets painted width
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 10 && !mountedRef.current) {
        mountedRef.current = true
        ro.disconnect()
        const cleanup = initGraph(Math.floor(width), Math.max(480, Math.floor(height)))
        return cleanup
      }
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      simRef.current?.stop()
    }
  }, [initGraph])

  // ── Device status updates: patch in-place WITHOUT re-running simulation ──
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)

    // Patch node visual attributes
    svg.selectAll<SVGGElement, KGNode>('g.node').each(function (d) {
      if (!d) return
      const match = devices.find((dev) => dev.id === d.id)
      if (!match) return
      d.status = match.status
      const sel = d3.select(this)
      const c = nodeColors(d)
      // Update main circle (second child — first may be the glow halo)
      sel.selectAll('circle').each(function (_, i) {
        const el = d3.select(this)
        const r = parseFloat(el.attr('r') ?? '0')
        // Main circle has r === NODE_R[d.type]
        if (r === NODE_R[d.type]) {
          el.attr('fill', c.fill).attr('stroke', c.stroke)
        }
      })
    })

    // Patch link colours
    svg.selectAll<SVGLineElement, KGLink>('line').each(function (l) {
      if (!l) return
      const tgt = l.target as KGNode
      const match = devices.find((dev) => dev.id === tgt.id)
      if (!match) return
      tgt.status = match.status
      d3.select(this)
        .attr('stroke', linkColor(tgt))
        .attr('stroke-dasharray', !tgt.status && (tgt.type === 'fan' || tgt.type === 'light') ? '4,3' : 'none')
    })

    // Update selected node panel if its device changed
    setSelectedNode((prev) => {
      if (!prev) return null
      const match = devices.find((dev) => dev.id === prev.id)
      return match ? { ...prev, status: match.status } : prev
    })
  }, [devices])

  const onCount    = devices.filter((d) => d.status).length
  const totalWatts = devices.reduce((s, d) => s + (d.status ? d.wattage : 0), 0)

  return (
    <div className="rounded-lg border border-border bg-card flex flex-col gap-4 p-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Knowledge Graph</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Interactive network — Office HQ → Rooms → Devices
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-on" />
            <span className="text-[11px] text-muted-foreground">{onCount} on</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-border" />
            <span className="text-[11px] text-muted-foreground">{devices.length - onCount} off</span>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">{totalWatts}W</span>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative rounded-md bg-surface overflow-hidden border border-border w-full"
        style={{ height: 500 }}
      >
        <svg ref={svgRef} className="block w-full h-full" />
        <p className="absolute bottom-2 right-3 text-[10px] text-muted-foreground pointer-events-none select-none">
          Scroll to zoom · drag nodes · click for details
        </p>
      </div>

      {/* Selected node detail */}
      {selectedNode && (
        <div className="rounded-md border border-border bg-surface px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">{selectedNode.label}</p>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
            <span className="text-[11px] text-muted-foreground">Type</span>
            <span className="text-[11px] text-foreground capitalize">{selectedNode.type}</span>
            {selectedNode.room && (
              <>
                <span className="text-[11px] text-muted-foreground">Room</span>
                <span className="text-[11px] text-foreground">{ROOM_LABELS[selectedNode.room]}</span>
              </>
            )}
            {selectedNode.status !== undefined && (
              <>
                <span className="text-[11px] text-muted-foreground">Status</span>
                <span className={`text-[11px] font-medium ${selectedNode.status ? 'text-on' : 'text-muted-foreground'}`}>
                  {selectedNode.status ? 'ON' : 'OFF'}
                </span>
              </>
            )}
            {selectedNode.wattage !== undefined && (
              <>
                <span className="text-[11px] text-muted-foreground">Power draw</span>
                <span className="text-[11px] font-mono text-foreground">
                  {selectedNode.status ? `${selectedNode.wattage}W` : '0W (idle)'}
                </span>
              </>
            )}
            {selectedNode.type === 'office' && (
              <>
                <span className="text-[11px] text-muted-foreground">Rooms</span>
                <span className="text-[11px] text-foreground">3</span>
                <span className="text-[11px] text-muted-foreground">Devices</span>
                <span className="text-[11px] text-foreground">15</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 flex-wrap border-t border-border pt-4">
        {[
          { stroke: '#4F46E5', fill: 'rgba(79,70,229,0.1)',  label: 'Office / Room' },
          { stroke: '#4F46E5', fill: 'rgba(79,70,229,0.08)', label: 'Fan ON' },
          { stroke: '#F59E0B', fill: 'rgba(245,158,11,0.1)', label: 'Light ON' },
          { stroke: '#D4D4D8', fill: 'transparent',          label: 'Device OFF', dashed: true },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <circle cx="7" cy="7" r="5.5"
                fill={l.fill}
                stroke={l.stroke}
                strokeWidth="1.2"
                strokeDasharray={l.dashed ? '3,2' : 'none'}
              />
            </svg>
            <span className="text-[11px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
