import React, { useEffect, useState } from "react";
import API from "../api";

const GREEN = "#00AC5B";
const RED   = "#DC2626";
const ASSET_CLASSES = ["Equity","Bond","Cash","REIT","Commodity","Other"];

export default function InvestmentsPage({ addToast }) {
  const [investments, setInvestments] = useState([]);
  const [showForm,    setShowForm]    = useState(false);
  const [editId,      setEditId]      = useState(null);
  const [priceLoading,setPriceLoading]= useState({});
  const [form, setForm] = useState({
    name:"", ticker:"", quantity:"", purchase_price:"",
    current_price:"", asset_class:"Equity", target_weight:"0"
  });
  const [sortKey, setSortKey] = useState("value");
  const [sortDir, setSortDir] = useState("desc");

  const refresh = () =>
    API.get("/portfolio").then(r => setInvestments(r.data.investments));

  useEffect(() => { refresh(); }, []);

  const resetForm = () => {
    setForm({ name:"", ticker:"", quantity:"", purchase_price:"",
              current_price:"", asset_class:"Equity", target_weight:"0" });
    setEditId(null); setShowForm(false);
  };

  // fetch live price for a single ticker
  const fetchLivePrice = async (ticker) => {
    if (!ticker) return;
    setPriceLoading(p => ({ ...p, [ticker]: true }));
    try {
      const res = await API.get(`/price/${ticker}`);
      setForm(f => ({ ...f, current_price: String(res.data.price) }));
      addToast(`Live price fetched: $${res.data.price}`, "success");
    } catch {
      addToast(`Could not fetch price for ${ticker}`, "error");
    } finally {
      setPriceLoading(p => ({ ...p, [ticker]: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      quantity:       Number(form.quantity),
      purchase_price: Number(form.purchase_price),
      current_price:  Number(form.current_price),
      target_weight:  Number(form.target_weight),
    };
    try {
      if (editId) {
        await API.put(`/portfolio/${editId}`, payload);
        addToast("Investment updated", "success");
      } else {
        await API.post("/portfolio", payload);
        addToast("Investment added", "success");
      }
      resetForm(); refresh();
    } catch (err) {
      addToast(err.response?.data?.detail || "Error saving investment", "error");
    }
  };

  const handleEdit = (inv) => {
    setForm({
      name:          inv.name,
      ticker:        inv.ticker,
      quantity:      String(inv.quantity),
      purchase_price:String(inv.purchase_price),
      current_price: String(inv.current_price),
      asset_class:   inv.asset_class || "Equity",
      target_weight: String(inv.target_weight || 0),
    });
    setEditId(inv.id); setShowForm(true);
    window.scrollTo({ top: 0, behavior:"smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this investment?")) return;
    await API.delete(`/portfolio/${id}`);
    addToast("Investment deleted", "success");
    refresh();
  };

  const sorted = [...investments].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    return (a[sortKey] > b[sortKey] ? 1 : -1) * dir;
  });

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const totalVal   = investments.reduce((s, i) => s + i.value, 0);
  const totalGain  = investments.reduce((s, i) => s + i.gain_loss, 0);
  const isGain     = totalGain >= 0;

  const SortTh = ({ label, k }) => (
    <th onClick={() => toggleSort(k)} style={{
      color:"#9CA3AF", padding:"10px 16px", textAlign:"left",
      fontSize:"11px", fontWeight:"600", textTransform:"uppercase",
      letterSpacing:"0.07em", background:"#F9FAFB",
      borderBottom:"1px solid #F3F4F6", cursor:"pointer",
      userSelect:"none", whiteSpace:"nowrap" }}>
      {label} {sortKey===k ? (sortDir==="asc" ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div style={{ padding:"32px", maxWidth:"1200px", margin:"0 auto" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"flex-start", marginBottom:"24px",
                    flexWrap:"wrap", gap:"12px" }}>
        <div>
          <h2 style={{ color:"#1A1A2E", fontSize:"24px", fontWeight:"800",
                       letterSpacing:"-0.4px" }}>Investments</h2>
          <p style={{ color:"#9CA3AF", fontSize:"13px", marginTop:"2px" }}>
            Manage your positions · Set target weights for rebalancing
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={{
          background:GREEN, color:"white", border:"none",
          padding:"10px 22px", borderRadius:"8px", fontWeight:"700",
          cursor:"pointer", fontSize:"13px",
          boxShadow:"0 2px 8px rgba(0,172,91,0.3)" }}>
          + Add Investment
        </button>
      </div>

      {/* Summary */}
      <div style={{ display:"flex", gap:"14px", marginBottom:"22px", flexWrap:"wrap" }}>
        {[
          { label:"Total Value",   value:`$${totalVal.toLocaleString()}`,  color:"#1A1A2E" },
          { label:"Total Gain/Loss",value:`${isGain?"+":""}$${totalGain.toLocaleString()}`,
            color: isGain ? GREEN : RED },
          { label:"# Positions",   value: investments.length, color:"#1A1A2E" },
        ].map(c => (
          <div key={c.label} style={{
            background:"white", borderRadius:"12px", padding:"18px 22px",
            border:"1px solid #E5E7EB", flex:1, minWidth:"150px",
            boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <p style={{ color:"#9CA3AF", fontSize:"11px", fontWeight:"600",
              textTransform:"uppercase", letterSpacing:"0.06em",
              marginBottom:"8px" }}>{c.label}</p>
            <p style={{ color:c.color, fontSize:"22px", fontWeight:"800" }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background:"white", borderRadius:"12px", padding:"28px",
                      marginBottom:"22px", border:"1px solid #E5E7EB",
                      borderLeft:`4px solid ${GREEN}`,
                      boxShadow:`0 2px 12px rgba(0,172,91,0.08)` }}>
          <h3 style={{ color:"#1A1A2E", marginBottom:"20px",
                       fontWeight:"700", fontSize:"16px" }}>
            {editId ? "✏️ Edit Investment" : "➕ Add Investment"}
          </h3>
          <form onSubmit={handleSubmit} style={{
            display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",
            gap:"16px" }}>
            <div>
              <label style={S.label}>Name</label>
              <input style={S.input} placeholder="Apple Inc."
                value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required/>
            </div>
            {/* Ticker + live price button */}
            <div>
              <label style={S.label}>Ticker</label>
              <div style={{ display:"flex", gap:"6px" }}>
                <input style={{ ...S.input, flex:1 }} placeholder="AAPL"
                  value={form.ticker}
                  onChange={e=>setForm(p=>({...p,ticker:e.target.value.toUpperCase()}))}
                  required />
                <button type="button"
                  disabled={!form.ticker || priceLoading[form.ticker]}
                  onClick={() => fetchLivePrice(form.ticker)}
                  style={{ background: GREEN, color:"white", border:"none",
                           padding:"0 10px", borderRadius:"8px", cursor:"pointer",
                           fontSize:"12px", fontWeight:"700", whiteSpace:"nowrap" }}>
                  {priceLoading[form.ticker] ? "…" : "⟳"}
                </button>
              </div>
            </div>
            <div>
              <label style={S.label}>Asset Class</label>
              <select style={S.input} value={form.asset_class}
                onChange={e=>setForm(p=>({...p,asset_class:e.target.value}))}>
                {ASSET_CLASSES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Quantity</label>
              <input style={S.input} type="number" step="any" placeholder="10"
                value={form.quantity}
                onChange={e=>setForm(p=>({...p,quantity:e.target.value}))} required />
            </div>
            <div>
              <label style={S.label}>Avg Cost ($)</label>
              <input style={S.input} type="number" step="any" placeholder="150.00"
                value={form.purchase_price}
                onChange={e=>setForm(p=>({...p,purchase_price:e.target.value}))} required />
            </div>
            <div>
              <label style={S.label}>
                Current Price ($)
                <span style={{ color:"#9CA3AF", marginLeft:"4px", fontWeight:"400" }}>
                  (use ⟳ to auto-fill)
                </span>
              </label>
              <input style={S.input} type="number" step="any" placeholder="180.00"
                value={form.current_price}
                onChange={e=>setForm(p=>({...p,current_price:e.target.value}))} required />
            </div>
            <div>
              <label style={S.label}>
                Target Weight (%)
                <span style={{ color:"#9CA3AF", marginLeft:"4px", fontWeight:"400" }}>
                  for rebalancing
                </span>
              </label>
              <input style={S.input} type="number" step="any" placeholder="30"
                value={form.target_weight}
                onChange={e=>setForm(p=>({...p,target_weight:e.target.value}))} />
            </div>
            <div style={{ gridColumn:"1/-1", display:"flex", gap:"10px", paddingTop:"4px" }}>
              <button type="submit" style={{ background:GREEN, color:"white", border:"none",
                padding:"9px 22px", borderRadius:"8px", fontWeight:"700",
                cursor:"pointer", fontSize:"13px" }}>
                {editId ? "Save Changes" : "Add Investment"}
              </button>
              <button type="button" onClick={resetForm}
                style={{ background:"#F3F4F6", color:"#6B7280", border:"none",
                  padding:"9px 18px", borderRadius:"8px", cursor:"pointer", fontSize:"13px" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={{ background:"white", borderRadius:"12px",
                    border:"1px solid #E5E7EB", overflow:"hidden",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:"750px" }}>
            <thead>
              <tr>
                <SortTh label="Ticker"  k="ticker" />
                <SortTh label="Name"    k="name" />
                <th style={S.th}>Class</th>
                <SortTh label="Qty"     k="quantity" />
                <SortTh label="Avg Cost" k="purchase_price" />
                <SortTh label="Live Price" k="current_price" />
                <SortTh label="Value"   k="value" />
                <SortTh label="P&L"     k="gain_loss" />
                <th style={S.th}>Target %</th>
                <th style={S.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length===0 ? (
                <tr><td colSpan={10} style={{ padding:"56px", textAlign:"center",
                  color:"#9CA3AF", fontSize:"14px" }}>
                  No investments yet. Click "Add Investment" to begin.
                </td></tr>
              ) : sorted.map(inv => (
                <tr key={inv.id}
                  style={{ borderBottom:"1px solid #F9FAFB", transition:"background .12s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"12px 16px" }}>
                    <span style={{ background:"#EAF3EE", color:"#00693C",
                      fontWeight:"700", padding:"3px 9px",
                      borderRadius:"6px", fontSize:"13px" }}>
                      {inv.ticker}
                    </span>
                  </td>
                  <td style={{ padding:"12px 16px", color:"#374151", fontSize:"14px" }}>{inv.name}</td>
                  <td style={{ padding:"12px 16px" }}>
                    <span style={{ background:"#EEF2FF", color:"#3730A3",
                      fontSize:"11px", fontWeight:"600",
                      padding:"2px 8px", borderRadius:"99px" }}>
                      {inv.asset_class}
                    </span>
                  </td>
                  <td style={{ padding:"12px 16px", color:"#374151" }}>{inv.quantity}</td>
                  <td style={{ padding:"12px 16px", color:"#9CA3AF" }}>${inv.purchase_price}</td>
                  <td style={{ padding:"12px 16px", color:"#1A1A2E", fontWeight:"700" }}>
                    ${inv.current_price}
                  </td>
                  <td style={{ padding:"12px 16px", color:"#1A1A2E", fontWeight:"700" }}>
                    ${inv.value.toLocaleString()}
                  </td>
                  <td style={{ padding:"12px 16px",
                    color: inv.gain_loss >= 0 ? GREEN : RED, fontWeight:"700" }}>
                    {inv.gain_loss >= 0 ? "+" : ""}${inv.gain_loss.toLocaleString()}
                    <span style={{ fontSize:"11px", marginLeft:"4px",
                                   color: inv.gain_loss >= 0 ? "#059669":"#DC2626" }}>
                      ({inv.gain_loss >= 0 ? "+" : ""}{inv.gain_loss_pct.toFixed(2)}%)
                    </span>
                  </td>
                  <td style={{ padding:"12px 16px", color:"#6B7280", fontSize:"13px" }}>
                    {inv.target_weight > 0 ? `${inv.target_weight}%` : "—"}
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex", gap:"6px" }}>
                      <button onClick={() => handleEdit(inv)} style={{
                        background:"#F3F4F6", color:"#374151", border:"none",
                        padding:"5px 12px", borderRadius:"6px",
                        cursor:"pointer", fontSize:"12px" }}>Edit</button>
                      <button onClick={() => handleDelete(inv.id)} style={{
                        background:"#FEF2F2", color:"#DC2626", border:"none",
                        padding:"5px 12px", borderRadius:"6px",
                        cursor:"pointer", fontSize:"12px" }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const S = {
  label: { color:"#374151", fontSize:"12px", display:"block",
           marginBottom:"5px", fontWeight:"500" },
  input: { padding:"9px 13px", background:"#F9FAFB",
           border:"1px solid #D1D5DB", borderRadius:"8px",
           color:"#1A1A2E", fontSize:"14px", width:"100%" },
  th:    { color:"#9CA3AF", padding:"10px 16px", textAlign:"left",
           fontSize:"11px", fontWeight:"600", textTransform:"uppercase",
           letterSpacing:"0.07em", background:"#F9FAFB",
           borderBottom:"1px solid #F3F4F6" },
};
