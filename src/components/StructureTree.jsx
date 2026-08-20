import { useId, useState } from 'react'
import { S } from '../lib/strings'
import { MasteryMeter } from './MasteryMeter'

function TierMeter({ tiers }) {
  const total = tiers.weak + tiers.mid + tiers.solid + tiers.new
  if (total === 0) return null
  return <MasteryMeter ratio={tiers.solid / total} width={48} />
}

function TreeNode({ node, depth, onLeafTap }) {
  const [open, setOpen] = useState(depth === 0) // chapters start expanded
  const disclosureId = useId().replaceAll(':', '')
  const hasChildren = node.children && node.children.length > 0
  const isLeaf = !hasChildren
  const groupId = hasChildren ? `structure-tree-group-${disclosureId}` : undefined

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          if (isLeaf) onLeafTap?.(node)
          else setOpen(v => !v)
        }}
        aria-expanded={hasChildren ? open : undefined}
        aria-controls={groupId}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', paddingLeft: `${depth * 16 + 12}px`,
          width: '100%', textAlign: 'left', cursor: 'pointer',
          border: 0, borderBottom: '1px solid var(--border-soft)',
          background: 'transparent',
          color: 'inherit', font: 'inherit',
          transition: 'background var(--motion-quick)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* Chevron */}
        {hasChildren ? (
          <span style={{
            display: 'inline-flex', width: 16, justifyContent: 'center',
            fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', color: 'var(--ink-3)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform var(--motion-quick)',
        }} aria-hidden="true">›</span>
        ) : (
          <span style={{ width: 16 }} />
        )}

        {/* Label */}
        <span className="font-zh text-md text-ink truncate flex-1">{node.label}</span>

        {/* Count */}
        <span className="font-mono text-2xs text-ink-3">{node.count}</span>

        {/* Tier bar */}
        {node.tiers && <TierMeter tiers={node.tiers} />}
      </button>

      {/* Children */}
      {hasChildren && (
        <ul id={groupId} hidden={!open} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {node.children.map((child, i) => (
            <TreeNode key={child.id || i} node={child} depth={depth + 1} onLeafTap={onLeafTap} />
          ))}
        </ul>
      )}
    </li>
  )
}

/**
 * StructureTree — module-agnostic collapsible tree.
 *
 * @param {{ nodes: Array, onLeafTap: (node) => void }} props
 *
 * Node shape:
 *   { id, label, count, tiers: { weak, mid, solid, new }, children?: [...] }
 */
export default function StructureTree({ nodes, onLeafTap }) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="text-center py-6 text-ink-3 font-zh text-xs">{S.structure.empty}</div>
    )
  }

  return (
    <ul style={{ borderTop: '1px solid var(--border-soft)', listStyle: 'none', margin: 0, padding: 0 }}>
      {nodes.map((node, i) => (
        <TreeNode key={node.id || i} node={node} depth={0} onLeafTap={onLeafTap} />
      ))}
    </ul>
  )
}
