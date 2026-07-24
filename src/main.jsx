import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { hydrate } from './lib/bigStore'
import { preloadKatex } from './lib/renderMarkdown'

preloadKatex()

/* 启动着纸：主题与内容纸在首帧前上类。
   原先暗色偏好只在设置页挂载时应用，冷启动首帧失色（脱，记-11）。 */
{
  const saved = localStorage.getItem('mnemos-theme') || localStorage.getItem('mini-srs-theme')
  const dark = saved ? saved === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
  document.documentElement.classList.toggle('dark', !!dark)
  document.documentElement.classList.toggle(
    'content-song',
    localStorage.getItem('mnemos-content-font') === 'song'
  )
}
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import '@fontsource/noto-serif-sc/400.css'
import '@fontsource/noto-serif-sc/500.css'
import '@fontsource/noto-serif-sc/600.css'
import '@fontsource/noto-serif-sc/700.css'
import './styles/fonts.css'

const root = ReactDOM.createRoot(document.getElementById('root'))

hydrate().finally(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
