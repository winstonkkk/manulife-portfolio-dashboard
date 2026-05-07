import React, { useEffect, useState } from "react";
import API from "../api";

const EMPTY = { name:"", ticker:"", asset_type:"stock",
                quantity:"", purchase_price:"", current_price:"" };

function exportCSV(list) {
  const headers = ["Name","Ticker","Type","Qty","Buy Price","Current Price",
                   "Total Value","P&L","P&L %"];
  const rows = list.map(i => [
    `"${i.name}"`, i.ticker, i.asset_type, i.quantity,
    i.purchase_price, i.current_price,
    i.total_value, i.gain_loss, `${i.gain_loss_pct}%`
  ]);
  const csv = [headers, ...rows].map(r=>r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download = "investments.csv"; a.click();
}

export default function InvestmentsPage({ addToast }) {
  const [investments, setInvestments] = useState([]);
  const [showForm,    setShowForm]    = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [form,        setForm]        = useState(EMPTY);
  const [search,      setSearch]      = useState("");
  const [filterType,  setFilterType]  = useState("all");
  const [sortBy,      setSortBy]      = useState("value_desc");

  const refresh = () =>
    API.get("/portfolio")
      .then(res => setInvestments(res.data.investments))
      .catch(() => addToast("Failed to load investments","error"));

  useEffect(() => { refresh(); }, []);

  const displayed = investments
    .filter(i => filterType==="all" || i.asset_type===filterType)
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()) ||
                 i.ticker.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      if (sortBy==="value_desc") return b.total_value     - a.total_value;
      if (sortBy==="value_asc")  return a.total_value     - b.total_value;
      if (sortBy==="pnl_desc")   return b.gain_loss       - a.gain_loss;
      if (sortBy==="pnl_asc")    return a.gain_loss       - b.gain_loss;
      if (sortBy==="pct_desc")   return b.gain_loss_pct   - a.gain_loss_pct;
      if (sortBy==="ticker_asc") return a.ticker.localeCompare(b.ticker);
      return 0;
    });

  const openAdd  = () => { setEditTarget(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = inv => {
    setEditTarget(inv);
    setForm({ name:inv.name, ticker:inv.ticker, asset_type:inv.asset_type,
              quantity:inv.quantity, purchase_price:inv.purchase_price,
              current_price:inv.current_price });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form,
        quantity:       Number(form.quantity),
        purchase_price: Number(form.purchase_price),
        current_price:  Number(form.current_price) };
      if (editTarget) {
        await API.put(`/portfolio/${editTarget.id}`, payload);
        addToast(`${form.ticker} updated successfully`,"success");
      } else {
        await API.post("/portfolio", payload);
        addToast(`${form.ticker} added to portfolio`,"success");
      }
      setShowForm(false); refresh();
    } catch (err) {
      addToast(err.response?.data?.error||"Error saving investment","error");
    }
  };

  const handleDelete = async inv => {
    if (!window.confirm(`Remove ${inv.ticker} from portfolio?`)) return;
    try {
      await API.delete(`/portfolio/${inv.id}`);
      addToast(`${inv.ticker} removed`,"success"); refresh();
    } catch { addToast("Failed to delete","error"); }
  };

  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  return (
    <div style={{ padding:"32px", maxWidth:"1200px", margin:"0 auto" }}>
      {/* Page header */}
      <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"flex-start", marginBottom:"24px",
                    flexWrap:"wrap", gap:"12px" }}>
        <div>
          <h2 style={{ color:"#1A1A2E", fontSize:"24px", fontWeight:"800",
                       letterSpacing:"-0.4px" }}>Investments</h2>
          <p style={{ color:"#9CA3AF", fontSize:"14px", marginTop:"3px" }}>
            {investments.length} positions in portfolio
          </p>
        </div>
        <div style={{ display:"flex", gap:"10px" }}>
          <button onClick={() => exportCSV(investments)} style={S.outlineBtn}>
            ↓ Export CSV
          </button>
          <button onClick={openAdd} style={S.primaryBtn}>
            + Add Investment
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background:"white", borderRadius:"12px", padding:"16px 20px",
                    border:"1px solid #E5E7EB", marginBottom:"20px",
                    display:"flex", gap:"12px", flexWrap:"wrap", alignItems:"center",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ position:"relative", flex:"1", minWidth:"200px" }}>
          <span style={{ position:"absolute", left:"12px", top:"50%",
                         transform:"translateY(-50%)", color:"#9CA3AF", fontSize:"14px" }}>
            🔍
          </span>
          <input style={{ ...S.input, paddingLeft:"36px", width:"100%" }}
            placeholder="Search by name or ticker…"
            value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select style={S.input} value={filterType}
          onChange={e=>setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="stock">Stocks</option>
          <option value="bond">Bonds</option>
          <option value="mutual_fund">Mutual Funds</option>
        </select>
        <select style={S.input} value={sortBy}
          onChange={e=>setSortBy(e.target.value)}>
          <option value="value_desc">Value ↓</option>
          <option value="value_asc">Value ↑</option>
          <option value="pnl_desc">P&L ↓</option>
          <option value="pnl_asc">P&L ↑</option>
          <option value="pct_desc">Return % ↓</option>
          <option value="ticker_asc">Ticker A→Z</option>
        </select>
        <span style={{ color:"#9CA3AF", fontSize:"13px", whiteSpace:"nowrap" }}>
          {displayed.length} / {investments.length}
        </span>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div style={{ background:"white", borderRadius:"12px", padding:"28px",
                      marginBottom:"24px", border:"1px solid #E5E7EB",
                      boxShadow:"0 2px 12px rgba(0,172,91,0.08)",
                      animation:"fadeIn .2s ease",
                      borderLeft:"4px solid #00AC5B" }}>
          <h3 style={{ color:"#1A1A2E", marginBottom:"20px",
                       fontWeight:"700", fontSize:"16px" }}>
            {editTarget ? "✏️  Edit Investment" : "➕  New Investment"}
          </h3>
          <form onSubmit={handleSubmit} style={{
            display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",
            gap:"16px" }}>
            <div>
              <label style={S.label}>Company Name</label>
              <input style={S.input} placeholder="Apple Inc."
                value={form.name} onChange={e=>f("name",e.target.value)} required />
            </div>
            <div>
              <label style={S.label}>Ticker</label>
              <input style={S.input} placeholder="AAPL"
                value={form.ticker}
                onChange={e=>f("ticker",e.target.value.toUpperCase())} required />
            </div>
            <div>
              <label style={S.label}>Asset Type</label>
              <select style={S.input} value={form.asset_type}
                onChange={e=>f("asset_type",e.target.value)}
                disabled={!!editTarget}>
                <option value="stock">Stock</option>
                <option value="bond">Bond</option>
                <option value="mutual_fund">Mutual Fund</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Quantity</label>
              <input style={S.input} type="number" step="any" placeholder="10"
                value={form.quantity} onChange={e=>f("quantity",e.target.value)} required />
            </div>
            <div>
              <label style={S.label}>Purchase Price ($)</label>
              <input style={S.input} type="number" step="any" placeholder="150.00"
                value={form.purchase_price}
                onChange={e=>f("purchase_price",e.target.value)}
                disabled={!!editTarget} required />
            </div>
            <div>
              <label style={S.label}>Current Price ($)</label>
              <input style={S.input} type="number" step="any" placeholder="175.00"
                value={form.current_price}
                onChange={e=>f("current_price",e.target.value)} required />
            </div>
            <div style={{ gridColumn:"1/-1", display:"flex", gap:"10px", paddingTop:"4px" }}>
              <button type="submit" style={S.primaryBtn}>
                {editTarget ? "Save Changes" : "Add Investment"}
              </button>
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
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:"920px" }}>
            <thead>
              <tr>
                {["Name","Ticker","Type","Qty","Buy $","Current $","Value","P&L","Return %","Actions"]
                  .map(h => (
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
                <tr><td colSpan={10} style={{ padding:"56px", textAlign:"center",
                  color:"#9CA3AF", fontSize:"14px" }}>
                  {investments.length===0
                    ? <span>No investments yet. Click <strong>+ Add Investment</strong> to get started.</span>
                    : "No results match your filters."}
                </td></tr>
              ) : displayed.map(inv => (
                <tr key={inv.id}
                  style={{ borderBottom:"1px solid #F9FAFB", transition:"background .12s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"13px 18px", color:"#374151", fontWeight:"500",
                    maxWidth:"160px", overflow:"hidden", textOverflow:"ellipsis",
                    whiteSpace:"nowrap" }}>{inv.name}</td>
                  <td style={{ padding:"13px 18px" }}>
                    <span style={{ background:"#EAF3EE", color:"#00693C",
                      fontWeight:"700", padding:"3px 9px",
                      borderRadius:"6px", fontSize:"13px" }}>{inv.ticker}</span>
                  </td>
                  <td style={{ padding:"13px 18px" }}>
                    <span style={{ background:"#F3F4F6", color:"#6B7280",
                      padding:"2px 9px", borderRadius:"99px", fontSize:"12px" }}>
                      {inv.asset_type.replace("_"," ")}
                    </span>
                  </td>
                  <td style={{ padding:"13px 18px", color:"#374151" }}>{inv.quantity}</td>
                  <td style={{ padding:"13px 18px", color:"#9CA3AF" }}>${inv.purchase_price}</td>
                  <td style={{ padding:"13px 18px", color:"#9CA3AF" }}>${inv.current_price}</td>
                  <td style={{ padding:"13px 18px", color:"#1A1A2E", fontWeight:"700" }}>
                    ${Number(inv.total_value).toLocaleString()}
                  </td>
                  <td style={{ padding:"13px 18px", fontWeight:"600",
                    color: inv.gain_loss>=0 ? "#00AC5B" : "#DC2626" }}>
                    {inv.gain_loss>=0?"+":""}${inv.gain_loss}
                  </td>
                  <td style={{ padding:"13px 18px",
                    color: inv.gain_loss_pct>=0 ? "#00AC5B" : "#DC2626" }}>
                    {inv.gain_loss_pct>=0?"+":""}{inv.gain_loss_pct}%
                  </td>
                  <td style={{ padding:"13px 18px", whiteSpace:"nowrap" }}>
                    <button onClick={() => openEdit(inv)} style={S.editBtn}>Edit</button>
                    <button onClick={() => handleDelete(inv)} style={S.delBtn}>Delete</button>
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
  editBtn:    { background:"#EFF6FF", color:"#1D4ED8", border:"1px solid #BFDBFE",
                padding:"4px 11px", borderRadius:"6px", marginRight:"6px",
                cursor:"pointer", fontSize:"12px", fontWeight:"500" },
  delBtn:     { background:"#FEF2F2", color:"#DC2626", border:"1px solid #FECACA",
                padding:"4px 11px", borderRadius:"6px",
                cursor:"pointer", fontSize:"12px", fontWeight:"500" },
  label:      { color:"#374151", fontSize:"12px", display:"block",
                marginBottom:"5px", fontWeight:"500" },
  input:      { padding:"9px 13px", background:"#F9FAFB",
                border:"1px solid #D1D5DB", borderRadius:"8px",
                color:"#1A1A2E", fontSize:"14px", transition:"border-color .18s" },
};
