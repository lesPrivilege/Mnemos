import { useState } from 'react'
import { S } from '../lib/strings'

/* 熟练度计（记-25）——一记一义：已稳固之比例。
   旧为 weak/mid/solid/new 四色堆叠条，两处越界：mid 占 accent（判例四所禁，
   accent 不入语义场景），weak 占 danger（弱是熟练度末档，非错、非重来、非
   destructive）。四色堆叠在 3px 上亦不可辨——暗纸相邻两档实测 2.99 与 1.21。
   今收为墨阶两段，充填对轨 7:1；「弱」之提示改由行内文字与图标承载。 */
function MasteryMeter({ tiers }) {
  const total = tiers.weak + tiers.mid + tiers.solid + tiers.new
  if (total === 0) return null
  return (
    <div style={{
      height: 3, borderRadius: 'var(--r-sm)', overflow: 'hidden',
      width: 48, flexShrink: 0, background: 'var(--ink-4)',
    }}>
      <span style={{
        display: 'block', height: '100%',
        width: `${(tiers.solid / total) * 100}%`, background: 'var(--ink)',
      }} />
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
            fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', color: 'var(--ink-3)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform var(--motion-quick)',
          }}>›</span>
        ) : (
          <span style={{ width: 16 }} />
        )}

        {/* Label */}
        <span className="font-zh text-md text-ink truncate flex-1">{node.label}</span>

        {/* Count */}
        <span className="font-mono text-2xs text-ink-3">{node.count}</span>

        {/* Tier bar */}
        {node.tiers && <MasteryMeter tiers={node.tiers} />}
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
