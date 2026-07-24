import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { hydrate } from './lib/bigStore'
import { preloadKatex } from './lib/renderMarkdown'

preloadKatex()
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
