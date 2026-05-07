import React, { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import DashboardPage     from "./pages/DashboardPage";
import InvestmentsPage   from "./pages/InvestmentsPage";
import TransactionsPage  from "./pages/TransactionsPage";
import LoginPage         from "./pages/LoginPage";
import API               from "./api";

/* ─── Design Tokens: Manulife Brand ───────────────────────────
   Primary:  #00AC5B  (Manulife Jade Green)
   Dark:     #00693C  (Manulife Deep Green)
   Surface:  #FFFFFF / #F5F7F5 / #EAF3EE
   Text:     #1A1A2E  (near-black)
   Muted:    #6B7280
   Border:   #D1D5DB
   Error:    #DC2626
   ─────────────────────────────────────────────────────────── */

/* ─── Toast ─────────────────────────────────────────────────── */
function Toast({ toasts, removeToast }) {
  return (
    <div style={{ position:"fixed", bottom:"28px", right:"28px",
                  zIndex:9999, display:"flex", flexDirection:"column", gap:"10px" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type==="success" ? "#ECFDF5" : "#FEF2F2",
          border:     `1px solid ${t.type==="success" ? "#6EE7B7" : "#FECACA"}`,
          color:      t.type==="success" ? "#065F46" : "#991B1B",
          padding:"12px 20px", borderRadius:"10px", minWidth:"270px",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          boxShadow:"0 4px 20px rgba(0,0,0,0.10)", fontSize:"14px",
          animation:"fadeIn .2s ease"
        }}>
          <span>{t.type==="success" ? "✓ " : "✗ "}{t.message}</span>
          <button onClick={() => removeToast(t.id)} style={{
            background:"none", border:"none", color:"inherit",
            cursor:"pointer", marginLeft:"16px", fontSize:"18px", lineHeight:1
          }}>×</button>
        </div>
      ))}
    </div>
  );
}

/* ─── Navbar ─────────────────────────────────────────────────── */
function Navbar({ user, onLogout }) {
  const navStyle = ({ isActive }) => ({
    color:          isActive ? "#00AC5B" : "#4B5563",
    textDecoration: "none",
    fontWeight:     isActive ? "600" : "500",
    fontSize:       "14px",
    padding:        "6px 14px",
    borderRadius:   "7px",
    background:     isActive ? "#EAF3EE" : "transparent",
    transition:     "all .18s"
  });
  return (
    <nav style={{
      background:"#FFFFFF", borderBottom:"1px solid #E5E7EB",
      padding:"0 32px", display:"flex", alignItems:"center",
      height:"58px", gap:"4px", position:"sticky", top:0, zIndex:100,
      boxShadow:"0 1px 4px rgba(0,0,0,0.06)"
    }}>
      {/* Manulife-style logo */}
      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginRight:"28px" }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#00AC5B"/>
          <text x="14" y="20" textAnchor="middle" fill="white"
            style={{ fontWeight:"900", fontSize:"15px", fontFamily:"sans-serif" }}>P</text>
        </svg>
        <span style={{ color:"#1A1A2E", fontWeight:"800", fontSize:"17px",
                       letterSpacing:"-0.5px" }}>Portfolio</span>
      </div>
      <NavLink to="/dashboard"    style={navStyle}>Dashboard</NavLink>
      <NavLink to="/investments"  style={navStyle}>Investments</NavLink>
      <NavLink to="/transactions" style={navStyle}>Transactions</NavLink>
      <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"12px" }}>
        <span style={{ color:"#9CA3AF", fontSize:"13px",
                       background:"#F3F4F6", padding:"4px 10px",
                       borderRadius:"99px" }}>👤 {user}</span>
        <button onClick={onLogout} style={{
          background:"white", color:"#6B7280",
          border:"1px solid #D1D5DB", padding:"6px 16px",
          borderRadius:"7px", cursor:"pointer", fontSize:"13px",
          fontWeight:"500", transition:"all .18s"
        }}>Logout</button>
      </div>
    </nav>
  );
}

/* ─── App ────────────────────────────────────────────────────── */
export default function App() {
  const [token,    setToken]    = useState(null);
  const [username, setUsername] = useState("");
  const [toasts,   setToasts]   = useState([]);

  const addToast = useCallback((message, type="success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const removeToast = useCallback(id =>
    setToasts(prev => prev.filter(t => t.id !== id)), []);

  const handleLogin = (tok, user) => {
    setToken(tok); setUsername(user);
    API.defaults.headers.common["Authorization"] = `Bearer ${tok}`;
  };
  const handleLogout = () => {
    setToken(null); setUsername("");
    delete API.defaults.headers.common["Authorization"];
  };

  return (
    <BrowserRouter>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'Inter',sans-serif; background:#F5F7F5; color:#1A1A2E; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:#F3F4F6; }
        ::-webkit-scrollbar-thumb { background:#D1D5DB; border-radius:3px; }
        input:focus, select:focus { border-color:#00AC5B !important; outline:none; }
        button:hover { opacity:.88; }
      `}</style>

      {!token ? (
        <LoginPage onLogin={handleLogin} addToast={addToast} />
      ) : (
        <>
          <Navbar user={username} onLogout={handleLogout} />
          <Routes>
            <Route path="/dashboard"    element={<DashboardPage    addToast={addToast} />} />
            <Route path="/investments"  element={<InvestmentsPage  addToast={addToast} />} />
            <Route path="/transactions" element={<TransactionsPage addToast={addToast} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toast toasts={toasts} removeToast={removeToast} />
        </>
      )}
    </BrowserRouter>
  );
}
