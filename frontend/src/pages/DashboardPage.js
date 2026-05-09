import React, { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import API from "../api";

const GREEN  = "#00AC5B";
const DARK   = "#00693C";
const RED    = "#DC2626";
const COLORS = ["#00AC5B","#0066CC","#F59E0B","#8B5CF6","#EF4444","#06B6D4"];

export default function DashboardPage({ addToast }) {
  const [portfolio,   setPortfolio]   = useState(null);
  const [history,     setHistory]     = useState([]);
  const [refreshing,  setRefreshing]  = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(() => {
    API.get("/portfolio").then(r => {
      const { summary, investments } = r.data;
      const allocation = investments.reduce((acc, inv) => {
        const cls = inv.asset_class || inv.asset_type || "Other";
        acc[cls] = (acc[cls] || 0) + (inv.current_price * inv.quantity);
        return acc;
      }, {});
      setPortfolio({ ...summary, investments, allocation });
    });
    API.get("/portfolio/history").then(r => setHistory(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshPrices = async () => {
    setRefreshing(true);
    try {
      const res = await API.post("/price/refresh-all");
      addToast(`Updated ${res.data.count} price(s) from market`, "success");
      setLastRefresh(new Date().toLocaleTimeString());
      load();
    } catch {
      addToast("Price refresh failed", "error");
    } finally { setRefreshing(false); }
  };

  if (!portfolio) return (
    <div style={{ padding:"48px", textAlign:"center", color:"#9CA3AF" }}>
      Loading portfolio...
    </div>
  );

  const { total_value, total_cost, gain_loss, return_pct,
          investments, allocation } = portfolio;
  const isGain = (gain_loss ?? 0) >= 0;

  const pieData = Object.entries(allocation || {}).map(([k, v]) => ({ name: k, value: v }));

  const totalVal = total_value || 1;
  const rebalance = investments.reduce((acc, inv) => {
    const cls = inv.asset_class || inv.asset_type || "Other";
    if (!acc[cls]) acc[cls] = { actual: 0, target: 0 };
    acc[cls].actual += ((inv.current_price * inv.quantity) / totalVal) * 100;
    acc[cls].target  = Math.max(acc[cls].target, inv.target_weight || 0);
    return acc;
  }, {});

  const chartData = history.slice(-30).map(h => ({
    date:  new Date(h.timestamp).toLocaleDateString("en-HK",
             { month: "short", day: "numeric" }),
    value: h.total_value,
  }));

  return (
    <div style={{ padding:"28px 32px", maxWidth:"1200px", margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:"24px", flexWrap:"wrap", gap:"12px" }}>
        <div>
          <h2 style={{ color:"#1A1A2E", fontSize:"24px", fontWeight:"800",
                       letterSpacing:"-0.4px" }}>Dashboard</h2>
          <p style={{ color:"#9CA3AF", fontSize:"13px", marginTop:"2px" }}>
            Portfolio overview &middot; {lastRefresh ? `Last refreshed ${lastRefresh}` : "Prices from last manual input"}
          </p>
        </div>
        <button onClick={refreshPrices} disabled={refreshing} style={{
          background: refreshing ? "#E5E7EB" : GREEN,
          color: refreshing ? "#9CA3AF" : "white",
          border:"none", padding:"10px 22px", borderRadius:"8px",
          fontWeight:"700", cursor: refreshing ? "not-allowed" : "pointer",
          fontSize:"13px", display:"flex", alignItems:"center", gap:"6px",
          boxShadow: refreshing ? "none" : "0 2px 8px rgba(0,172,91,0.3)",
          transition:"all .2s"
        }}>
          {refreshing ? "Refreshing..." : "Refresh Live Prices"}
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
                    gap:"14px", marginBottom:"24px" }}>
        {[
          { label:"Total Value",  value:`$${(total_value ?? 0).toLocaleString()}`,  color:"#1A1A2E" },
          { label:"Total Cost",   value:`$${(total_cost  ?? 0).toLocaleString()}`,  color:"#6B7280" },
          { label:"Gain / Loss",  value:`${isGain ? "+" : ""}$${(gain_loss ?? 0).toLocaleString()}`,
            color: isGain ? GREEN : RED },
          { label:"Return",       value:`${isGain ? "+" : ""}${(return_pct ?? 0).toFixed(2)}%`,
            color: isGain ? GREEN : RED },
          { label:"# Positions",  value: investments.length, color:"#1A1A2E" },
        ].map(c => (
          <div key={c.label} style={{
            background:"white", borderRadius:"12px", padding:"18px 22px",
            border:"1px solid #E5E7EB", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <p style={{ color:"#9CA3AF", fontSize:"11px", fontWeight:"600",
              textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"8px" }}>
              {c.label}
            </p>
            <p style={{ color:c.color, fontSize:"22px", fontWeight:"800" }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr",
                    gap:"16px", marginBottom:"24px" }}>

        {/* Portfolio History */}
        <div style={{ background:"white", borderRadius:"12px", padding:"22px",
                      border:"1px solid #E5E7EB", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 style={{ color:"#1A1A2E", fontSize:"15px", fontWeight:"700",
                       marginBottom:"16px" }}>Portfolio Value History</h3>
          {chartData.length < 2 ? (
            <div style={{ height:"200px", display:"flex", alignItems:"center",
                          justifyContent:"center", color:"#9CA3AF", fontSize:"13px",
                          flexDirection:"column", gap:"8px" }}>
              <span style={{ fontSize:"28px" }}>&#128202;</span>
              <span>Add investments &amp; refresh prices to build history</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize:11, fill:"#9CA3AF" }}
                       tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize:11, fill:"#9CA3AF" }} tickLine={false}
                       axisLine={false}
                       tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [`$${Number(v).toLocaleString()}`, "Value"]}
                         contentStyle={{ borderRadius:"8px", border:"1px solid #E5E7EB",
                                         fontSize:"12px" }} />
                <Line type="monotone" dataKey="value" stroke={GREEN} strokeWidth={2.5}
                      dot={false} activeDot={{ r:4, fill:GREEN }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Asset Allocation Pie */}
        <div style={{ background:"white", borderRadius:"12px", padding:"22px",
                      border:"1px solid #E5E7EB", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 style={{ color:"#1A1A2E", fontSize:"15px", fontWeight:"700",
                       marginBottom:"16px" }}>Asset Allocation</h3>
          {pieData.length === 0 ? (
            <div style={{ height:"200px", display:"flex", alignItems:"center",
                          justifyContent:"center", color:"#9CA3AF", fontSize:"13px" }}>
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" outerRadius={80}
                     dataKey="value" nameKey="name" label={false}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8}
                  formatter={v => <span style={{ fontSize:"11px", color:"#6B7280" }}>{v}</span>} />
                <Tooltip formatter={v => [`$${Number(v).toLocaleString()}`, "Value"]}
                         contentStyle={{ borderRadius:"8px", border:"1px solid #E5E7EB",
                                         fontSize:"12px" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Rebalance Section */}
      <div style={{ background:"white", borderRadius:"12px", padding:"22px",
                    border:"1px solid #E5E7EB", marginBottom:"24px",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
        <h3 style={{ color:"#1A1A2E", fontSize:"15px", fontWeight:"700",
                     marginBottom:"4px" }}>Target vs Actual Allocation</h3>
        <p style={{ color:"#9CA3AF", fontSize:"12px", marginBottom:"18px" }}>
          Set target weights per investment in the Investments page to track rebalance needs.
        </p>
        {Object.keys(rebalance).length === 0 ? (
          <p style={{ color:"#9CA3AF", fontSize:"13px" }}>No data</p>
        ) : Object.entries(rebalance).map(([cls, v]) => {
          const actual = v.actual;
          const target = v.target;
          const diff   = actual - target;
          const over   = diff > 2;
          const under  = diff < -2;
          return (
            <div key={cls} style={{ marginBottom:"16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                            marginBottom:"6px", alignItems:"center" }}>
                <span style={{ fontWeight:"600", color:"#374151", fontSize:"13px" }}>{cls}</span>
                <span style={{ fontSize:"12px", color: over ? "#DC2626" : under ? "#F59E0B" : GREEN,
                               fontWeight:"700" }}>
                  {over ? "▲ Overweight" : under ? "▼ Underweight" : "✓ On Target"}
                  {" "}
                  <span style={{ color:"#9CA3AF", fontWeight:"400" }}>
                    Actual {actual.toFixed(1)}%
                    {target > 0 ? ` · Target ${target.toFixed(1)}%` : ""}
                  </span>
                </span>
              </div>
              <div style={{ position:"relative", height:"10px", background:"#F3F4F6",
                            borderRadius:"99px", overflow:"hidden" }}>
                {target > 0 && (
                  <div style={{ position:"absolute", left:`${Math.min(target, 100)}%`,
                                top:0, bottom:0, width:"2px", background:"#9CA3AF",
                                zIndex:2 }} />
                )}
                <div style={{
                  height:"100%", borderRadius:"99px",
                  width:`${Math.min(actual, 100)}%`,
                  background: over ? "#DC2626" : under ? "#F59E0B" : GREEN,
                  transition:"width .6s ease"
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Holdings Table */}
      <div style={{ background:"white", borderRadius:"12px",
                    border:"1px solid #E5E7EB", overflow:"hidden",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ padding:"16px 22px", borderBottom:"1px solid #F3F4F6" }}>
          <h3 style={{ color:"#1A1A2E", fontSize:"15px", fontWeight:"700" }}>Holdings</h3>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:"600px" }}>
            <thead>
              <tr>
                {["Ticker","Name","Class","Qty","Avg Cost","Live Price","Value","P&L"].map(h => (
                  <th key={h} style={{ color:"#9CA3AF", padding:"10px 18px", textAlign:"left",
                    fontSize:"11px", fontWeight:"600", textTransform:"uppercase",
                    letterSpacing:"0.07em", background:"#F9FAFB",
                    borderBottom:"1px solid #F3F4F6" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {investments.length === 0 ? (
                <tr><td colSpan={8} style={{ padding:"48px", textAlign:"center",
                  color:"#9CA3AF", fontSize:"14px" }}>No holdings yet</td></tr>
              ) : investments.map(inv => {
                const val      = inv.current_price * inv.quantity;
                const gainLoss = (inv.current_price - inv.purchase_price) * inv.quantity;
                const glPct    = inv.purchase_price > 0
                  ? ((inv.current_price - inv.purchase_price) / inv.purchase_price) * 100
                  : 0;
                const glPos = gainLoss >= 0;
                return (
                  <tr key={inv.id}
                    style={{ borderBottom:"1px solid #F9FAFB", transition:"background .12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding:"12px 18px" }}>
                      <span style={{ background:"#EAF3EE", color:DARK, fontWeight:"700",
                        padding:"3px 9px", borderRadius:"6px", fontSize:"13px" }}>
                        {inv.ticker}
                      </span>
                    </td>
                    <td style={{ padding:"12px 18px", color:"#374151", fontSize:"14px" }}>{inv.name}</td>
                    <td style={{ padding:"12px 18px" }}>
                      <span style={{ background:"#EEF2FF", color:"#3730A3", fontSize:"11px",
                        fontWeight:"600", padding:"2px 8px", borderRadius:"99px" }}>
                        {inv.asset_class || inv.asset_type}
                      </span>
                    </td>
                    <td style={{ padding:"12px 18px", color:"#374151" }}>{inv.quantity}</td>
                    <td style={{ padding:"12px 18px", color:"#9CA3AF" }}>${inv.purchase_price}</td>
                    <td style={{ padding:"12px 18px", color:"#1A1A2E", fontWeight:"700" }}>
                      ${inv.current_price}
                    </td>
                    <td style={{ padding:"12px 18px", color:"#1A1A2E", fontWeight:"700" }}>
                      ${val.toLocaleString()}
                    </td>
                    <td style={{ padding:"12px 18px",
                      color: glPos ? GREEN : RED, fontWeight:"700" }}>
                      {glPos ? "+" : ""}${gainLoss.toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 })}
                      <span style={{ fontSize:"11px", marginLeft:"4px" }}>
                        ({glPos ? "+" : ""}{glPct.toFixed(2)}%)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}