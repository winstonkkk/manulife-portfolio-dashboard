import React, { useState } from "react";
import API from "../api";

export default function LoginPage({ onLogin, addToast }) {
  const [mode,     setMode]     = useState("login");
  const [username, setUsername] = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (mode === "login") {
        const res = await API.post("/auth/login", { username, password });
        API.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
        onLogin(res.data.token, res.data.username);
        addToast(`Welcome back, ${res.data.username}!`, "success");
      } else {
        await API.post("/auth/register", { username, email, password });
        addToast("Account created! Please sign in.", "success");
        setMode("login");
      }
    } catch (err) {
      addToast(err.response?.data?.error || "Something went wrong", "error");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:"#F5F7F5" }}>
      {/* Left panel */}
      <div style={{ flex:1, background:"#00693C", display:"flex", flexDirection:"column",
                    justifyContent:"center", padding:"60px", color:"white",
                    display: window.innerWidth < 768 ? "none" : "flex" }}>
        <div style={{ fontSize:"44px", marginBottom:"16px" }}>◈</div>
        <h1 style={{ fontSize:"32px", fontWeight:"800", marginBottom:"12px",
                     lineHeight:"1.2", letterSpacing:"-0.5px" }}>
          Manage your<br/>investments<br/>with confidence.
        </h1>
        <p style={{ color:"#A7F3D0", fontSize:"16px", lineHeight:"1.6", maxWidth:"320px" }}>
          Track portfolio performance, monitor gains and losses,
          and keep a full history of your transactions — all in one place.
        </p>
        <div style={{ marginTop:"48px", display:"flex", gap:"24px" }}>
          {[["📈","Portfolio tracking"],["🔒","Secure JWT auth"],["📊","Visual analytics"]].map(([icon,label]) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:"8px",
                                      color:"#6EE7B7", fontSize:"13px" }}>
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width:"440px", display:"flex", alignItems:"center",
                    justifyContent:"center", padding:"40px", background:"white",
                    boxShadow:"-4px 0 20px rgba(0,0,0,0.06)" }}>
        <div style={{ width:"100%" }}>
          <div style={{ textAlign:"center", marginBottom:"32px" }}>
            <div style={{ width:"48px", height:"48px", background:"#00AC5B",
                          borderRadius:"12px", display:"flex", alignItems:"center",
                          justifyContent:"center", margin:"0 auto 12px",
                          fontSize:"24px", color:"white", fontWeight:"900" }}>P</div>
            <h2 style={{ color:"#1A1A2E", fontSize:"22px", fontWeight:"800" }}>
              {mode === "login" ? "Sign in to Portfolio" : "Create an account"}
            </h2>
            <p style={{ color:"#9CA3AF", fontSize:"14px", marginTop:"4px" }}>
              {mode === "login" ? "Welcome back" : "Get started for free"}
            </p>
          </div>

          {/* Mode tabs */}
          <div style={{ display:"flex", background:"#F3F4F6", borderRadius:"9px",
                        padding:"4px", marginBottom:"24px" }}>
            {["login","register"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex:1, padding:"9px", borderRadius:"7px", border:"none",
                background: mode===m ? "white" : "transparent",
                color:      mode===m ? "#1A1A2E" : "#9CA3AF",
                fontWeight: mode===m ? "600" : "400",
                cursor:"pointer", fontSize:"14px", transition:"all .18s",
                boxShadow: mode===m ? "0 1px 4px rgba(0,0,0,0.08)" : "none"
              }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div>
              <label style={FL}>Username</label>
              <input style={FI} placeholder="your_username"
                value={username} onChange={e=>setUsername(e.target.value)} required />
            </div>
            {mode==="register" && (
              <div>
                <label style={FL}>Email</label>
                <input style={FI} type="email" placeholder="you@example.com"
                  value={email} onChange={e=>setEmail(e.target.value)} required />
              </div>
            )}
            <div>
              <label style={FL}>Password</label>
              <input style={FI} type="password" placeholder="••••••••"
                value={password} onChange={e=>setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} style={{
              background:"#00AC5B", color:"white", border:"none",
              padding:"12px", borderRadius:"9px", fontWeight:"700",
              cursor: loading ? "not-allowed" : "pointer", fontSize:"15px",
              opacity: loading ? 0.7 : 1, marginTop:"4px",
              boxShadow:"0 2px 8px rgba(0,172,91,0.3)", transition:"all .18s"
            }}>
              {loading ? "Please wait…" : mode==="login" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
const FL = { color:"#374151", fontSize:"13px", display:"block",
             marginBottom:"5px", fontWeight:"500" };
const FI = { width:"100%", padding:"10px 13px", background:"#F9FAFB",
             border:"1px solid #D1D5DB", borderRadius:"8px",
             color:"#1A1A2E", fontSize:"14px", transition:"border-color .18s" };
