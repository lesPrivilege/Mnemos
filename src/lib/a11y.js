// 键盘径路（病2 修）：把 div/span 交互面纳入 Tab 序与 Enter/Space 激活。
// 语义级的 Link 归一另列 roadmap M4 无障碍批（记-14）。
export function pressable(handler) {
  return {
    role: 'button',
    tabIndex: 0,
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handler(e)
      }
    },
  }
}
