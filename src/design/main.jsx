import React from 'react'
import { createRoot } from 'react-dom/client'
import Showroom from './Showroom'
import '../styles/index.css'
import '../styles/markdown.css'
import '../reading/styles/reader.css'
import '../styles/fonts.css'
import '@fontsource/noto-serif-sc/400.css'
import '@fontsource/noto-serif-sc/600.css'
import '@fontsource/jetbrains-mono/400.css'
import './showroom.css'

createRoot(document.getElementById('design-root')).render(<React.StrictMode><Showroom /></React.StrictMode>)
