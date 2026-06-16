import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// React Error Boundary
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e, info) { console.error('ClientFlow Error:', e, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#f0f2f5',fontFamily:'sans-serif',padding:24}}>
          <div style={{background:'#fff',borderRadius:16,padding:32,maxWidth:480,width:'100%',boxShadow:'0 4px 24px rgba(0,0,0,.1)',textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:16}}>⚡</div>
            <h2 style={{color:'#1e293b',marginBottom:8}}>ClientFlow AI</h2>
            <p style={{color:'#ef4444',fontWeight:600,marginBottom:8}}>Something went wrong</p>
            <p style={{color:'#64748b',fontSize:13,marginBottom:16}}>{this.state.error?.message}</p>
            <button onClick={()=>window.location.reload()}
              style={{background:'#6366f1',color:'#fff',border:'none',borderRadius:8,padding:'10px 24px',fontSize:14,fontWeight:600,cursor:'pointer'}}>
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
