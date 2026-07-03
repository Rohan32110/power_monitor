'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import type { Device, KGNode, KGLink, KGGraph } from '@/types'
import { ROOM_LIST, ROOM_LABELS } from '@/lib/config'

interface KnowledgeGraphProps {
  devices: Device[]
}

function buildGraph(devices: Device[]): KGGraph {
  const nodes: KGNode[] = []
  const links: KGLink[] = []

  // Office root
  nodes.push({ id: 'office', label: 'Office HQ', type: 'office' })

  for (const room of ROOM_LIST) {
    nodes.push({ id: room, label: ROOM_LABELS[room], type: 'room', room })
    links.push({ source: 'office', target: room, label: 'contains' })

    const roomDevices = devices.filter((d) => d.room === room)
    for (const device of roomDevices) {
      const type = device.device_type === 'fan' ? 'fan' : 'light'
      nodes.push({
        id: device.id,
        label: `${device.device_type === 'fan' ? 'Fan' : 'Light'} ${device.device_number}`,
        type,
        status: device.status,
        wattage: device.wattage,
        room,
      })
      links.push({ source: room, target: device.id, label: device.status ? 'ON' : 'OFF' })
    }
  }

  return { nodes, links }
}

const NODE_COLORS: Record<string, string> = {
  office: '#3B82F6',
  room: '#8B5CF6',
  fan_on: '#3B82F6',
  fan_off: '#374151',
  light_on: '#F5A623',
  light_off: '#374151',
}

const NODE_RADIUS: Record<string, number> = {
  office: 28,
  room: 20,
  fan: 14,
  light: 14,
}

interface TooltipInfo {
  x: number
  y: number
  node: KGNode
}

export function KnowledgeGraph({ devices }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const simulationRef = useRef<d3.Simulation<KGNode, KGLink> | null>(null)
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)
  const [selectedNode, setSelectedNode] = useState<KGNode | null>(null)
  const [graphStats, setGraphStats] = useState({ onCount: 0, offCount: 0, totalWatts: 0 })

  // Compute stats
  useEffect(() => {
    const onCount = devices.filter((d) => d.status).length
    const offCount = devices.length - onCount
    const totalWatts = devices.reduce((s, d) => s + (d.status ? d.wattage : 0), 0)
    setGraphStats({ onCount, offCount, totalWatts })
  }, [devices])

  const initGraph = useCallback(() => {
    const svg = svgRef.current
    const container = containerRef.current
    if (!svg || !container) return

    const width = container.clientWidth || 700
    const height = 460

    // Clear previous
    d3.select(svg).selectAll('*').remove()

    const graph = buildGraph(devices)

    // Deep-copy nodes to let D3 mutate them with x/y
    const nodes: KGNode[] = graph.nodes.map((n) => ({ ...n }))
    const links: KGLink[] = graph.links.map((l) => ({ ...l }))

    // Set up SVG
    const svgEl = d3.select(svg)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)

    // Arrow markers
    const defs = svgEl.append('defs')
    ;(['on', 'off', 'room']).forEach((type) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 22)
        .attr('refY', 0)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', type === 'on' ? '#22D3A6' : type === 'room' ? '#8B5CF6' : '#374151')
    })

    // Background
    svgEl.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#0D1117')
      .attr('rx', 12)

    // Grid pattern
    const gridSize = 30
    for (let x = 0; x < width; x += gridSize) {
      svgEl.append('line').attr('x1', x).attr('y1', 0).attr('x2', x).attr('y2', height)
        .attr('stroke', '#1C2230').attr('stroke-width', 0.5)
    }
    for (let y = 0; y < height; y += gridSize) {
      svgEl.append('line').attr('x1', 0).attr('y1', y).attr('x2', width).attr('y2', y)
        .attr('stroke', '#1C2230').attr('stroke-width', 0.5)
    }

    // Zoom & pan
    const g = svgEl.append('g').attr('class', 'zoom-group')
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })
    svgEl.call(zoom)

    // Force simulation
    const simulation = d3.forceSimulation<KGNode>(nodes)
      .force('link', d3.forceLink<KGNode, KGLink>(links)
        .id((d) => d.id)
        .distance((l) => {
          const src = l.source as KGNode
          const tgt = l.target as KGNode
          if (src.type === 'office') return 160
          if (src.type === 'room') return 100
          return 70
        })
        .strength(0.8)
      )
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<KGNode>((d) => NODE_RADIUS[d.type] + 18))

    simulationRef.current = simulation

    // Link lines
    const linkG = g.append('g').attr('class', 'links')
    const linkEl = linkG.selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (l) => {
        const tgt = l.target as KGNode
        if (tgt.type === 'room') return '#8B5CF6'
        return tgt.status ? '#22D3A6' : '#252B37'
      })
      .attr('stroke-width', (l) => {
        const tgt = l.target as KGNode
        return tgt.type === 'room' ? 1.5 : 1
      })
      .attr('stroke-opacity', 0.6)
      .attr('stroke-dasharray', (l) => {
        const tgt = l.target as KGNode
        return (tgt.type === 'fan' || tgt.type === 'light') && !tgt.status ? '4,4' : 'none'
      })
      .attr('marker-end', (l) => {
        const tgt = l.target as KGNode
        if (tgt.type === 'room') return 'url(#arrow-room)'
        return tgt.status ? 'url(#arrow-on)' : 'url(#arrow-off)'
      })

    // Link labels
    const linkLabelEl = linkG.selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', -4)
      .attr('font-size', 8)
      .attr('font-family', 'monospace')
      .attr('fill', (l) => {
        const tgt = l.target as KGNode
        if (tgt.type === 'room') return '#6D28D9'
        return tgt.status ? '#22D3A6' : '#4B5563'
      })
      .attr('opacity', 0.8)
      .text((l) => l.label)

    // Node groups
    const nodeG = g.append('g').attr('class', 'nodes')
    const nodeEl = nodeG.selectAll('g.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')

    // Node circle (outer glow for ON devices)
    nodeEl.filter((d) => (d.type === 'fan' || d.type === 'light') && !!d.status)
      .append('circle')
      .attr('r', (d) => NODE_RADIUS[d.type] + 6)
      .attr('fill', 'none')
      .attr('stroke', (d) => d.type === 'fan' ? '#3B82F6' : '#F5A623')
      .attr('stroke-width', 1)
      .attr('opacity', 0.25)
      .attr('class', 'glow-on')

    // Main circle
    nodeEl.append('circle')
      .attr('r', (d) => NODE_RADIUS[d.type])
      .attr('fill', (d) => {
        if (d.type === 'office') return '#1E3A5F'
        if (d.type === 'room') return '#2E1065'
        if (d.type === 'fan') return d.status ? '#1E3A5F' : '#1a1f2e'
        return d.status ? '#3d2600' : '#1a1f2e'
      })
      .attr('stroke', (d) => {
        if (d.type === 'office') return '#3B82F6'
        if (d.type === 'room') return '#8B5CF6'
        if (d.type === 'fan') return d.status ? '#3B82F6' : '#374151'
        return d.status ? '#F5A623' : '#374151'
      })
      .attr('stroke-width', (d) => d.type === 'office' || d.type === 'room' ? 2 : 1.5)

    // Node icons (text symbols)
    nodeEl.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', (d) => d.type === 'office' ? 14 : d.type === 'room' ? 11 : 9)
      .attr('fill', (d) => {
        if (d.type === 'office') return '#3B82F6'
        if (d.type === 'room') return '#8B5CF6'
        if (d.type === 'fan') return d.status ? '#3B82F6' : '#4B5563'
        return d.status ? '#F5A623' : '#4B5563'
      })
      .text((d) => {
        if (d.type === 'office') return '\u2302'
        if (d.type === 'room') return '\u25A1'
        if (d.type === 'fan') return '\u25CB'
        return '\u2605'
      })

    // Labels below nodes
    nodeEl.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => NODE_RADIUS[d.type] + 12)
      .attr('font-size', (d) => d.type === 'office' ? 11 : d.type === 'room' ? 10 : 8)
      .attr('font-weight', (d) => d.type === 'office' || d.type === 'room' ? 700 : 400)
      .attr('font-family', 'system-ui, sans-serif')
      .attr('fill', (d) => d.type === 'office' ? '#3B82F6' : d.type === 'room' ? '#C4B5FD' : '#8A93A3')
      .text((d) => d.label)

    // Wattage badge for ON devices
    nodeEl.filter((d) => (d.type === 'fan' || d.type === 'light') && !!d.status)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => -NODE_RADIUS[d.type] - 5)
      .attr('font-size', 7)
      .attr('font-family', 'monospace')
      .attr('fill', '#22D3A6')
      .text((d) => `${d.wattage}W`)

    // Drag behavior
    const drag = d3.drag<SVGGElement, KGNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    nodeEl.call(drag as any)

    // Click to select
    nodeEl.on('click', (event, d) => {
      event.stopPropagation()
      setSelectedNode((prev) => (prev?.id === d.id ? null : d))
    })

    // Hover tooltip
    nodeEl.on('mouseenter', (event, d) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      setTooltip({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        node: d,
      })
    }).on('mousemove', (event) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      setTooltip((prev) => prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : null)
    }).on('mouseleave', () => {
      setTooltip(null)
    })

    // Click on background to deselect
    svgEl.on('click', () => setSelectedNode(null))

    // Simulation tick
    simulation.on('tick', () => {
      linkEl
        .attr('x1', (l) => (l.source as KGNode).x ?? 0)
        .attr('y1', (l) => (l.source as KGNode).y ?? 0)
        .attr('x2', (l) => (l.target as KGNode).x ?? 0)
        .attr('y2', (l) => (l.target as KGNode).y ?? 0)

      linkLabelEl
        .attr('x', (l) => (((l.source as KGNode).x ?? 0) + ((l.target as KGNode).x ?? 0)) / 2)
        .attr('y', (l) => (((l.source as KGNode).y ?? 0) + ((l.target as KGNode).y ?? 0)) / 2)

      nodeEl.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => {
      simulation.stop()
    }
  }, [devices])

  useEffect(() => {
    const cleanup = initGraph()
    return cleanup
  }, [initGraph])

  return (
    <div
      className="rounded-2xl flex flex-col gap-4 p-4"
      style={{ background: '#151A23', border: '1px solid #252B37' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: '#EAEDF2' }}>Knowledge Graph</h2>
          <p className="text-xs mt-0.5" style={{ color: '#8A93A3' }}>
            Interactive network · Office → Rooms → Devices
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: '#22D3A6' }} />
            <span className="text-xs" style={{ color: '#8A93A3' }}>ON: {graphStats.onCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: '#374151' }} />
            <span className="text-xs" style={{ color: '#8A93A3' }}>OFF: {graphStats.offCount}</span>
          </div>
          <div
            className="px-2 py-0.5 rounded-full text-xs font-mono font-bold"
            style={{ background: 'rgba(245,166,35,0.1)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.25)' }}
          >
            {graphStats.totalWatts}W live
          </div>
        </div>
      </div>

      {/* Graph canvas */}
      <div className="relative w-full" ref={containerRef} style={{ borderRadius: 12, overflow: 'hidden' }}>
        <svg ref={svgRef} className="w-full block" style={{ height: 460 }} />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded-xl px-3 py-2 shadow-xl"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y - 40,
              background: '#1C2230',
              border: '1px solid #252B37',
              maxWidth: 200,
            }}
          >
            <p className="text-xs font-bold" style={{ color: '#EAEDF2' }}>{tooltip.node.label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: '#8A93A3' }}>
              Type: <span style={{ color: '#22D3A6', textTransform: 'capitalize' }}>{tooltip.node.type}</span>
            </p>
            {tooltip.node.status !== undefined && (
              <p className="text-[10px]" style={{ color: tooltip.node.status ? '#22D3A6' : '#8A93A3' }}>
                Status: {tooltip.node.status ? 'ON' : 'OFF'}
              </p>
            )}
            {tooltip.node.wattage && (
              <p className="text-[10px]" style={{ color: '#F5A623' }}>
                {tooltip.node.status ? `Drawing ${tooltip.node.wattage}W` : 'Idle (0W)'}
              </p>
            )}
            {tooltip.node.room && (
              <p className="text-[10px]" style={{ color: '#8B5CF6' }}>
                {ROOM_LABELS[tooltip.node.room]}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Selected node detail */}
      {selectedNode && (
        <div
          className="rounded-xl p-4 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ background: '#0D1117', border: '1px solid #252B37' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: '#EAEDF2' }}>{selectedNode.label}</p>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ color: '#8A93A3', border: '1px solid #252B37' }}
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-[10px]" style={{ color: '#4B5563' }}>Node Type</span>
            <span className="text-[10px] capitalize font-semibold" style={{ color: '#22D3A6' }}>{selectedNode.type}</span>
            {selectedNode.room && (
              <>
                <span className="text-[10px]" style={{ color: '#4B5563' }}>Room</span>
                <span className="text-[10px] font-semibold" style={{ color: '#C4B5FD' }}>{ROOM_LABELS[selectedNode.room]}</span>
              </>
            )}
            {selectedNode.status !== undefined && (
              <>
                <span className="text-[10px]" style={{ color: '#4B5563' }}>Status</span>
                <span className="text-[10px] font-bold" style={{ color: selectedNode.status ? '#22D3A6' : '#8A93A3' }}>
                  {selectedNode.status ? 'ON' : 'OFF'}
                </span>
              </>
            )}
            {selectedNode.wattage !== undefined && (
              <>
                <span className="text-[10px]" style={{ color: '#4B5563' }}>Power Draw</span>
                <span className="text-[10px] font-mono font-bold" style={{ color: '#F5A623' }}>
                  {selectedNode.status ? `${selectedNode.wattage}W` : '0W (idle)'}
                </span>
              </>
            )}
            {selectedNode.type === 'office' && (
              <>
                <span className="text-[10px]" style={{ color: '#4B5563' }}>Total Rooms</span>
                <span className="text-[10px] font-semibold" style={{ color: '#3B82F6' }}>3</span>
                <span className="text-[10px]" style={{ color: '#4B5563' }}>Total Devices</span>
                <span className="text-[10px] font-semibold" style={{ color: '#3B82F6' }}>15</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Controls hint */}
      <div className="flex items-center gap-4 flex-wrap" style={{ borderTop: '1px solid #1C2230', paddingTop: 10 }}>
        {[
          { icon: '⊕', label: 'Scroll to zoom' },
          { icon: '↔', label: 'Drag to pan' },
          { icon: '◉', label: 'Click node for details' },
          { icon: '⊙', label: 'Drag nodes to rearrange' },
        ].map((c) => (
          <span key={c.label} className="flex items-center gap-1 text-[10px]" style={{ color: '#4B5563' }}>
            <span style={{ color: '#8A93A3' }}>{c.icon}</span> {c.label}
          </span>
        ))}
      </div>

      {/* Node type legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {[
          { color: '#3B82F6', label: 'Office HQ' },
          { color: '#8B5CF6', label: 'Room' },
          { color: '#3B82F6', label: 'Fan (ON)', dash: false, bg: '#1E3A5F' },
          { color: '#F5A623', label: 'Light (ON)', dash: false, bg: '#3d2600' },
          { color: '#374151', label: 'Device (OFF)', dash: true },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-full"
              style={{
                background: l.bg ?? 'transparent',
                border: `${l.dash ? '1.5px dashed' : '1.5px solid'} ${l.color}`,
              }}
            />
            <span className="text-[10px]" style={{ color: '#8A93A3' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
