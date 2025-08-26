import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'



function ErrorBoundary({ children }) {
  const [err, setErr] = React.useState(null)
  React.useEffect(() => {
    const h = (e) => setErr(e.reason || e.error || e.message || String(e))
    window.addEventListener('error', h)
    window.addEventListener('unhandledrejection', h)
    return () => { window.removeEventListener('error', h); window.removeEventListener('unhandledrejection', h) }
  }, [])
  return err ? (
    <pre style={{whiteSpace:'pre-wrap', padding:12, background:'#1f2937', color:'#fca5a5', borderRadius:8}}>
      Runtime error:\n{String(err.stack || err)}
    </pre>
  ) : children
}

const root = document.getElementById('root')
if (!root) throw new Error("Missing <div id='root'></div> in index.html")

console.log('[main] booting')
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
