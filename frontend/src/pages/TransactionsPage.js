import React, { useEffect, useState } from "react";
import API from "../api";

function exportCSV(list) {
  const headers = ["Date","Investment","Ticker","Type","Qty","Price","Total"];
  const rows = list.map(t => [
    new Date(t.timestamp).toLocaleDateString(),
    `"${t.investment_name||""}"`, t.ticker||"",
    t.transaction_type, t.quantity, t.price, t.total
  ]);
  const csv = [headers,...rows].map(r=>r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download = "transactions.csv"; a.click();
}

export default function TransactionsPage({ addToast }) {
  const [transactions, setTransactions] = useState([]);
  const [investments,  setInvestments]  = useState([]);
  const [showForm,     setShowForm]     = useState(false);
  const [form, setForm] = useState({ investment_id:"", transaction_type:"buy",
                                      quantity:"", price:"" });
  const [filterType, setFilterType] = useState("all");
  const [sortDate,   setSortDate]   = useState("desc");
  const [search,     setSearch]     = useState("");

  const refresh = () => {
    API.get("/transactions").then(res => setTransactions(res.data));
    API.get("/portfolio").then(res => setInvestments(res.data.investments));
  };
  useEffect(() => { refresh(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/transactions", {
        ...form,
        investment_id: Number(form.investment_id),
        quantity:      Number(form.quantity),
        price:         Number(form.price),
      });
      addToast(`${form.transaction_type.toUpperCase()} transaction recorded`,"success");
      setShowForm(false);
      setForm({ investment_id:"", transaction_type:"buy", quantity:"", price:"" });
      refresh();
    } catch (err) {
      addToast(err.response?.data?.error||"Error recording transaction","error");
    }
  };

  const displayed = transactions
    .filter(t => filterType==="all" || t.transaction_type===filterType)
    .filter(t =>
      !search ||
      (t.ticker||"").toLowerCase().includes(search.toLowerCase()) ||
      (t.investment_name||"").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a,b) => sortDate==="desc"
      ? new Date(b.timestamp) - new Date(a.timestamp)
      : new Date(a.timestamp) - new Date(b.timestamp)
    );

  const totalBuy  = transactions.filter(t=>t.transaction_type==="buy")
    .reduce((s,t)=>s+Number(t.total),0);
  const totalSell = transactions.filter(t=>t.transaction_type==="sell")
    .reduce((s,t)=>s+Number(t.total),0);

  return (
    <div style={{ padding:"32px", maxWidth:"1100px", margin:"0 auto" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"flex-start", marginBottom:"24px",
                    flexWrap:"wrap", gap:"12px" }}>
        <div>
          <h2 style={{ color:"#1A1A2E", fontSize:"24px", fontWeight:"800",
                       letterSpacing:"-0.4px" }}>Transactions</h2>
          <p style={{ color:"#9CA3AF", fontSize:"14px", marginTop:"3px" }}>
            Complete history of all buy & sell activity
          </p>
        </div>
        <div style={{ display:"flex", gap:"10px" }}>
          <button onClick={() => exportCSV(displayed)} style={S.outlineBtn}>
            ↓ Export CSV
          </button>
          <button onClick={() => setShowForm(true)} style={S.primaryBtn}>
            + New Transaction
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:"flex", gap:"14px", marginBottom:"22px", flexWrap:"wrap" }}>
        {[
          { label:"Total Transactions", value: transactions.length, color:"#1A1A2E",  icon:"🧾" },
          { label:"Total Invested",     value: `$${totalBuy.toLocaleString()}`,  color:"#00AC5B", icon:"📥" },
          { label:"Total Divested",     value: `$${totalSell.toLocaleString()}`, color:"#DC2626", icon:"📤" },
        ].map(c => (
          <div key={c.label} style={{
            background:"white", borderRadius:"12px", padding:"18px 22px",
            border:"1px solid #E5E7EB", flex:1, minWidth:"155px",
            boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <p style={{ color:"#9CA3AF", fontSize:"12px", fontWeight:"500",
                textTransform:"uppercase", letterSpacing:"0.06em",
                marginBottom:"8px" }}>{c.label}</p>
              <span>{c.icon}</span>
            </div>
            <p style={{ color:c.color, fontSize:"22px", fontWeight:"800" }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ background:"white", borderRadius:"12px", padding:"14px 20px",
                    border:"1px solid #E5E7EB", marginBottom:"20px",
                    display:"flex", gap:"12px", flexWrap:"wrap", alignItems:"center",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ position:"relative", flex:"1", minWidth:"180px" }}>
          <span style={{ position:"absolute", left:"12px", top:"50%",
                         transform:"translateY(-50%)", color:"#9CA3AF" }}>🔍</span>
          <input style={{ ...S.input, paddingLeft:"36px", width:"100%" }}
            placeholder="Search ticker or name…"
            value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select style={S.input} value={filterType}
          onChange={e=>setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="buy">Buy Only</option>
          <option value="sell">Sell Only</option>
        </select>
        <select style={S.input} value={sortDate}
          onChange={e=>setSortDate(e.target.value)}>
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
        <span style={{ color:"#9CA3AF", fontSize:"13px", whiteSpace:"nowrap" }}>
          {displayed.length} record{displayed.length!==1?"s":""}
        </span>
      </div>

      {/* New transaction form */}
      {showForm && (
        <div style={{ background:"white", borderRadius:"12px", padding:"28px",
                      marginBottom:"22px", border:"1px solid #E5E7EB",
                      borderLeft:"4px solid #00AC5B",
                      boxShadow:"0 2px 12px rgba(0,172,91,0.08)",
                      animation:"fadeIn .2s ease" }}>
          <h3 style={{ color:"#1A1A2E", marginBottom:"20px",
                       fontWeight:"700", fontSize:"16px" }}>
            📝 Record Transaction
          </h3>
          <form onSubmit={handleSubmit} style={{
            display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",
            gap:"16px" }}>
            <div>
              <label style={S.label}>Investment</label>
              <select style={S.input} value={form.investment_id}
                onChange={e=>setForm(p=>({...p,investment_id:e.target.value}))} required>
                <option value="">Select position…</option>
                {investments.map(i => (
                  <option key={i.id} value={i.id}>{i.ticker} — {i.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>Transaction Type</label>
              <select style={S.input} value={form.transaction_type}
                onChange={e=>setForm(p=>({...p,transaction_type:e.target.value}))}>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Quantity</label>
              <input style={S.input} type="number" step="any" placeholder="5"
                value={form.quantity}
                onChange={e=>setForm(p=>({...p,quantity:e.target.value}))} required />
            </div>
            <div>
              <label style={S.label}>Price per Unit ($)</label>
              <input style={S.input} type="number" step="any" placeholder="180.00"
                value={form.price}
                onChange={e=>setForm(p=>({...p,price:e.target.value}))} required />
            </div>
            <div style={{ gridColumn:"1/-1", display:"flex", gap:"10px", paddingTop:"4px" }}>
              <button type="submit" style={S.primaryBtn}>Record Transaction</button>
              <button type="button" style={S.ghostBtn}
                onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={{ background:"white", borderRadius:"12px",
                    border:"1px solid #E5E7EB", overflow:"hidden",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:"640px" }}>
            <thead>
              <tr>
                {["Date","Investment","Ticker","Type","Qty","Price","Total"].map(h => (
                  <th key={h} style={{
                    color:"#9CA3AF", textAlign:"left",
                    padding:"10px 18px", fontSize:"11px", fontWeight:"600",
                    textTransform:"uppercase", letterSpacing:"0.07em",
                    background:"#F9FAFB", borderBottom:"1px solid #F3F4F6"
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.length===0 ? (
                <tr><td colSpan={7} style={{ padding:"56px", textAlign:"center",
                  color:"#9CA3AF", fontSize:"14px" }}>
                  {transactions.length===0
                    ? "No transactions yet."
                    : "No results match your filters."}
                </td></tr>
              ) : displayed.map(t => (
                <tr key={t.id}
                  style={{ borderBottom:"1px solid #F9FAFB", transition:"background .12s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"13px 18px" }}>
                    <span style={{ color:"#374151", fontSize:"14px", display:"block" }}>
                      {new Date(t.timestamp).toLocaleDateString("en-HK")}
                    </span>
                    <span style={{ color:"#9CA3AF", fontSize:"11px" }}>
                      {new Date(t.timestamp).toLocaleTimeString([],
                        {hour:"2-digit",minute:"2-digit"})}
                    </span>
                  </td>
                  <td style={{ padding:"13px 18px", color:"#374151", fontSize:"14px" }}>
                    {t.investment_name||"—"}
                  </td>
                  <td style={{ padding:"13px 18px" }}>
                    <span style={{ background:"#EAF3EE", color:"#00693C",
                      fontWeight:"700", padding:"3px 9px",
                      borderRadius:"6px", fontSize:"13px" }}>
                      {t.ticker||"—"}
                    </span>
                  </td>
                  <td style={{ padding:"13px 18px" }}>
                    <span style={{
                      background: t.transaction_type==="buy" ? "#ECFDF5" : "#FEF2F2",
                      color:      t.transaction_type==="buy" ? "#065F46" : "#991B1B",
                      padding:"3px 10px", borderRadius:"99px",
                      fontSize:"12px", fontWeight:"700",
                      border: `1px solid ${t.transaction_type==="buy"?"#A7F3D0":"#FECACA"}`
                    }}>
                      {t.transaction_type.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding:"13px 18px", color:"#374151" }}>{t.quantity}</td>
                  <td style={{ padding:"13px 18px", color:"#9CA3AF" }}>${t.price}</td>
                  <td style={{ padding:"13px 18px", color:"#1A1A2E", fontWeight:"700" }}>
                    ${Number(t.total).toLocaleString()}
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
  primaryBtn: { background:"#00AC5B", color:"white", border:"none",
                padding:"9px 20px", borderRadius:"8px", fontWeight:"700",
                cursor:"pointer", fontSize:"13px",
                boxShadow:"0 2px 8px rgba(0,172,91,0.25)" },
  outlineBtn: { background:"white", color:"#374151", border:"1px solid #D1D5DB",
                padding:"9px 20px", borderRadius:"8px", cursor:"pointer",
                fontSize:"13px", fontWeight:"500" },
  ghostBtn:   { background:"#F3F4F6", color:"#6B7280", border:"none",
                padding:"9px 18px", borderRadius:"8px", cursor:"pointer", fontSize:"13px" },
  label:      { color:"#374151", fontSize:"12px", display:"block",
                marginBottom:"5px", fontWeight:"500" },
  input:      { padding:"9px 13px", background:"#F9FAFB",
                border:"1px solid #D1D5DB", borderRadius:"8px",
                color:"#1A1A2E", fontSize:"14px", transition:"border-color .18s" },
};
