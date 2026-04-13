import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import 'react-toastify/dist/ReactToastify.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)

const markAppReady = () => {
  document.documentElement.classList.add('app-ready')
  window.setTimeout(() => {
    document.getElementById('boot-loader')?.remove()
  }, 320)
}

window.requestAnimationFrame(() => {
  window.requestAnimationFrame(markAppReady)
})
