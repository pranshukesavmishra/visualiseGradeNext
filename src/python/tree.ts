// Lays out the recursion tree for a given playback step. Pure and testable.

import { TreeNode } from '../lang/types'

export interface LaidOutNode {
  id: number
  parent: number
  label: string
  x: number // column position (0-based, may be fractional)
  depth: number
  active: boolean // this call is the one currently running
  returned: boolean // this call has already returned by now
}

export interface TreeLayout {
  nodes: LaidOutNode[]
  cols: number // total columns (tree width)
  rows: number // total depth + 1
}

// Build positions for every node that has been "born" by `currentIndex`.
// Leaves get sequential columns; parents centre over their children.
export function layoutTree(all: TreeNode[], currentIndex: number, activeId: number): TreeLayout {
  const visible = all.filter((n) => n.born <= currentIndex)
  const byId = new Map(visible.map((n) => [n.id, n]))
  const children = new Map<number, number[]>()
  const roots: number[] = []

  for (const n of visible) {
    if (n.parent !== -1 && byId.has(n.parent)) {
      const list = children.get(n.parent) ?? []
      list.push(n.id)
      children.set(n.parent, list)
    } else {
      roots.push(n.id)
    }
  }

  const pos = new Map<number, number>()
  let leaf = 0

  function place(id: number): number {
    const kids = children.get(id) ?? []
    if (kids.length === 0) {
      const x = leaf
      leaf += 1
      pos.set(id, x)
      return x
    }
    const xs = kids.map(place)
    const x = (xs[0] + xs[xs.length - 1]) / 2
    pos.set(id, x)
    return x
  }
  roots.forEach(place)

  const nodes: LaidOutNode[] = visible.map((n) => ({
    id: n.id,
    parent: n.parent,
    label: n.label,
    x: pos.get(n.id) ?? 0,
    depth: n.depth,
    active: n.id === activeId,
    returned: n.dead !== -1 && n.dead <= currentIndex,
  }))

  const rows = visible.reduce((mx, n) => Math.max(mx, n.depth), 0) + 1
  return { nodes, cols: Math.max(leaf, 1), rows }
}
