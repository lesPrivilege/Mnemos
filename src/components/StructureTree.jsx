import { useState } from 'react'
import { S } from '../lib/strings'

// Tier bar — thin stacked horizontal bar showing weak/mid/solid/new distribution
function TierBar({ tiers }) {
  const total = tiers.weak + tiers.mid + tiers.solid + tiers.new
  if (total === 0) return null
  const p = (n) => `${(n / total) * 100}%`
  return (
    <div style={{
      display: 'flex', height: 3, borderRadius: 2, overflow: 'hidden',
      width: 48, flexShrink: 0, background: 'var(--bg-raised)',
    }}>
      {tiers.weak > 0 && <span style={{ width: p(tiers.weak), background: 'var(--danger)' }} />}
      {tiers.mid > 0 && <span style={{ width: p(tiers.mid), background: 'var(--accent)' }} />}
      {tiers.solid > 0 && <span style={{ width: p(tiers.solid), background: 'var(--good)' }} />}
      {tiers.new > 0 && <span style={{ width: p(tiers.new), background: 'var(--bg-raised)' }} />}
    </div>
  )
}

function TreeNode({ node, depth, onLeafTap }) {
  const [open, setOpen] = useState(depth === 0) // chapters start expanded
  const hasChildren = node.children && node.children.length > 0
  const isLeaf = !hasChildren

  return (
    <div>
      <div
        onClick={() => {
          if (isLeaf) onLeafTap?.(node)
          else setOpen(v => !v)
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', paddingLeft: `${depth * 16 + 12}px`,
          cursor: 'pointer', borderBottom: '1px solid var(--border-soft)',
          background: 'transparent',
          transition: 'background var(--motion-quick)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* Chevron */}
        {hasChildren ? (
          <span style={{
            display: 'inline-flex', width: 16, justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform var(--motion-quick)',
          }}>›</span>
        ) : (
          <span style={{ width: 16 }} />
        )}

        {/* Label */}
        <span className="font-zh text-[13px] text-ink truncate flex-1">{node.label}</span>

        {/* Count */}
        <span className="font-mono text-[10px] text-ink-3">{node.count}</span>

        {/* Tier bar */}
        {node.tiers && <TierBar tiers={node.tiers} />}
      </div>

      {/* Children */}
      {hasChildren && open && (
        <div>
          {node.children.map((child, i) => (
            <TreeNode key={child.id || i} node={child} depth={depth + 1} onLeafTap={onLeafTap} />
          ))}
        </div>
      )}
    </div>
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
    <div style={{ borderTop: '1px solid var(--border-soft)' }}>
      {nodes.map((node, i) => (
        <TreeNode key={node.id || i} node={node} depth={0} onLeafTap={onLeafTap} />
      ))}
    </div>
  )
}
