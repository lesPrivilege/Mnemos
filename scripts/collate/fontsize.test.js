import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scanSourceSingle } from './collate.mjs'

/* 字号门之回归锁（记-19）。
   立此测因雠之实证：读规则不足以证门之效——renderDoc 之修曾「碰巧尾随分号」
   才命中，机制实未堵。故每洞、每豁免各下一断言，以执行为准。 */

const dir = mkdtempSync(join(tmpdir(), 'collate-fontsize-'))

function scan(name, source) {
  const file = join(dir, name)
  writeFileSync(file, source)
  return scanSourceSingle([file], dir).filter((v) => v.id === 'g1-fontsize')
}

describe('g1-fontsize · 应报（硬写样式字面量）', () => {
  it('CSS 裸 px', () => expect(scan('a.css', '.x { font-size: 13px; }')).toHaveLength(1))
  it('CSS 裸 rem', () => expect(scan('b.css', '.x { font-size: 1.2rem; }')).toHaveLength(1))
  it('font 简写载字号', () => expect(scan('c.css', '.x { font: 13px/1.5 serif; }')).toHaveLength(1))
  it('JSX 内联数字', () => expect(scan('d.jsx', 'const a = <i style={{ fontSize: 13 }} />')).toHaveLength(1))
  it('JSX 内联 px 串', () => expect(scan('e.jsx', "const a = <i style={{ fontSize: '13px' }} />")).toHaveLength(1))
  it('tailwind 任意值', () => expect(scan('f.jsx', 'const a = <i className="text-[13px]" />')).toHaveLength(1))
  it('tailwind 任意值·无前导零', () =>
    expect(scan('g.jsx', 'const a = <i className="text-[.8rem]" />')).toHaveLength(1))
  it('SVG 属性式（无冒号）', () =>
    expect(scan('h.jsx', 'const a = <text fontSize="38">x</text>')).toHaveLength(1))
  it('模板串内联样式·无尾分号（不得越引号吞值）', () =>
    expect(
      scan('i.jsx', 'const h = `<pre style="font-size: 14px">${x}</pre>`\nconst y = { a: 1 }')
    ).toHaveLength(1))
})

describe('g1-fontsize · 不报（门只治硬写样式，不治算出之值与用户数据）', () => {
  it('token 引用', () => expect(scan('j.css', '.x { font-size: var(--text-md); }')).toHaveLength(0))
  it('流体展示号 clamp', () =>
    expect(scan('k.css', '.x { font-size: clamp(30px, 9vw, 39px); }')).toHaveLength(0))
  it('em 相对尺', () => expect(scan('l.css', '.x { font-size: 0.95em; }')).toHaveLength(0))
  it('JSX 表达式（用户字号上下限）', () =>
    expect(
      scan('m.jsx', 'const a = <i style={{ fontSize: Math.max(14, s.fontSize - 1) }} />')
    ).toHaveLength(0))
  it('JSX 变量引用', () =>
    expect(scan('n.jsx', 'const a = <i style={{ fontSize: settings.fontSize }} />')).toHaveLength(0))
  it('.js 数据层默认值（阅读器偏好，14–24 可调）', () =>
    expect(scan('o.js', 'export const DEFAULT_SETTINGS = { fontSize: 18, lineHeight: 1.8 }')).toHaveLength(0))
  it('font: inherit 非字号', () =>
    expect(scan('p.css', 'input, textarea { font: inherit; color: inherit; }')).toHaveLength(0))
})
