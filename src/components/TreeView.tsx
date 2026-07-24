import { TreeNode } from '../lang/types'
import { layoutTree } from '../python/tree'

interface Props {
  nodes: TreeNode[]
  currentIndex: number
  activeId: number
}

const COLW = 66
const ROW = 64
const NODE_H = 26

// Draws the recursion call tree as it grows and collapses over the run.
export default function TreeView({ nodes, currentIndex, activeId }: Props) {
  const layout = layoutTree(nodes, currentIndex, activeId)
  if (layout.nodes.length === 0) return null

  const width = layout.cols * COLW + 24
  const height = layout.rows * ROW + 8
  const byId = new Map(layout.nodes.map((n) => [n.id, n]))

  const cx = (x: number) => x * COLW + COLW / 2 + 12
  const cy = (depth: number) => depth * ROW + NODE_H / 2 + 12

  return (
    <div className="tree-card">
      <div className="var-name">recursion tree</div>
      <div className="tree-scroll">
        <svg width={width} height={height} className="tree-svg">
          {/* edges */}
          {layout.nodes.map((n) => {
            const parent = n.parent !== -1 ? byId.get(n.parent) : undefined
            if (!parent) return null
            return (
              <line
                key={`e-${n.id}`}
                x1={cx(parent.x)}
                y1={cy(parent.depth) + NODE_H / 2}
                x2={cx(n.x)}
                y2={cy(n.depth) - NODE_H / 2}
                className="tree-edge"
              />
            )
          })}
          {/* nodes */}
          {layout.nodes.map((n) => {
            const w = Math.min(Math.max(n.label.length * 7.1 + 16, 40), 132)
            const x = cx(n.x)
            const y = cy(n.depth)
            const cls = n.active ? 'active' : n.returned ? 'returned' : 'live'
            return (
              <g key={`n-${n.id}`} className={`tree-node ${cls}`}>
                <rect x={x - w / 2} y={y - NODE_H / 2} width={w} height={NODE_H} rx={8} />
                <text x={x} y={y + 4} textAnchor="middle">
                  {n.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
