import React, { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell as BarCell
} from "recharts";
import API from "../api";

// Manulife-brand colour ramp
const PIE_COLORS = ["#00AC5B","#00693C","#34D399","#6EE7B7","#A7F3D0",
                    "#FCD34D","#F97316","#60A5FA","#E879F9","#F87171"];

function KPI({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background:"white", borderRadius:"12px", padding:"22px 24px",
      border:"1px solid #E5E7EB", flex:"1", minWidth:"155px",
      boxShadow:"0 1px 4px rgba(0,0,0,0.05)"
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <p style={{ color:"#6B7280", fontSize:"12px", fontWeight:"500",
                    textTransform:"uppercase", letterSpacing:"0.06em",
                    marginBottom:"10px" }}>{label}</p>
        {icon && <span style={{ fontSize:"18px" }}>{icon}</span>}
      </div>
      <p style={{ color: color||"#1A1A2E", fontSize:"26px",
                  fontWeight:"800", letterSpacing:"-0.5px" }}>{value}</p>
      {sub && <p style={{ color:"#9CA3AF", fontSize:"12px", marginTop:"4px" }}>{sub}</p>}
    </div>
  );
}

const Card = ({ title, children }) => (
  <div style={{ background:"white", borderRadius:"12px", border:"1px solid #E5E7EB",
                boxShadow:"0 1px 4px rgba(0,0,0,0.05)", overflow:"hidden" }}>
    <div style={{ padding:"18px 24px", borderBottom:"1px solid #F3F4F6" }}>
      <h3 style={{ color:"#1A1A2E", fontSize:"15px", fontWeight:"700" }}>{title}</h3>
    </div>
    <div style={{ padding:"20px 24px" }}>{children}</div>
  </div>
);

export default function DashboardPage({ addToast }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    API.get("/portfolio")
      .then(res => setData(res.data))
      .catch(() => addToast("Failed to load portfolio", "error"));
  }, []);

  if (!data) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                  height:"60vh", color:"#9CA3AF", fontSize:"15px" }}>
      <span style={{ marginRight:"8px" }}>⏳</span> Loading…
    </div>
  );

  const { summary, investments } = data;
  const isPos = summary.gain_loss >= 0;

  const pieData  = investments.map(i => ({ name:i.ticker, value:i.total_value }));
  const barData  = [...investments]
    .sort((a,b) => b.gain_loss - a.gain_loss)
    .slice(0,8)
    .map(i => ({ name:i.ticker, pnl: parseFloat(i.gain_loss) }));

  return (
    <div style={{ padding:"32px", maxWidth:"1200px", margin:"0 auto" }}>
      {/* Page header */}
      <div style={{ marginBottom:"26px" }}>
        <h2 style={{ color:"#1A1A2E", fontSize:"24px", fontWeight:"800",
                     letterSpacing:"-0.4px" }}>Portfolio Overview</h2>
        <p style={{ color:"#9CA3AF", fontSize:"14px", marginTop:"3px" }}>
          {new Date().toLocaleDateString("en-HK",{weekday:"long",year:"numeric",
            month:"long",day:"numeric"})}
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:"16px", marginBottom:"28px" }}>
        <KPI label="Total Value"  icon="💼"
          value={`$${Number(summary.total_value).toLocaleString()}`}
          color="#00693C" />
        <KPI label="Total Cost"   icon="📥"
          value={`$${Number(summary.total_cost).toLocaleString()}`} />
        <KPI label="Total P&L"    icon={isPos?"📈":"📉"}
          value={`${isPos?"+":""}$${Number(summary.gain_loss).toLocaleString()}`}
          color={isPos ? "#00AC5B" : "#DC2626"} />
        <KPI label="Return"       icon="🎯"
          value={`${isPos?"+":""}${summary.return_pct}%`}
          color={isPos ? "#00AC5B" : "#DC2626"} />
        <KPI label="Holdings"     icon="🗂️"
          value={investments.length} sub="positions" />
      </div>

      {investments.length === 0 ? (
        <div style={{ background:"white", borderRadius:"12px", padding:"72px",
                      textAlign:"center", color:"#9CA3AF", border:"1px solid #E5E7EB" }}>
          <div style={{ fontSize:"48px", marginBottom:"14px" }}>📊</div>
          <p style={{ fontSize:"16px", color:"#374151", fontWeight:"600" }}>
            No investments yet
          </p>
          <p style={{ fontSize:"14px", marginTop:"6px" }}>
            Go to Investments to add your first position.
          </p>
        </div>
      ) : (
        <>
          {/* Charts row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                        gap:"20px", marginBottom:"24px" }}>
            <Card title="Asset Allocation">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={95} innerRadius={40}
                    paddingAngle={2}
                    label={({ name, percent }) =>
                      percent > 0.05 ? `${name} ${(percent*100).toFixed(0)}%` : ""}
                    labelLine={false}>
                    {pieData.map((_,i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={v => [`$${Number(v).toLocaleString()}`, "Value"]}
                    contentStyle={{ background:"white", border:"1px solid #E5E7EB",
                                    borderRadius:"8px", color:"#1A1A2E",
                                    boxShadow:"0 4px 12px rgba(0,0,0,0.08)" }} />
                  <Legend wrapperStyle={{ color:"#6B7280", fontSize:"12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Profit & Loss by Investment">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData}
                  margin={{ top:4, right:4, left:8, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name"
                    tick={{ fill:"#6B7280", fontSize:12 }} axisLine={false} />
                  <YAxis tick={{ fill:"#6B7280", fontSize:11 }}
                    tickFormatter={v=>`$${v>=0?"+":""}${v}`}
                    axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={v => [`${v>=0?"+":""}$${v}`, "P&L"]}
                    contentStyle={{ background:"white", border:"1px solid #E5E7EB",
                                    borderRadius:"8px", color:"#1A1A2E",
                                    boxShadow:"0 4px 12px rgba(0,0,0,0.08)" }} />
                  <Bar dataKey="pnl" radius={[5,5,0,0]}>
                    {barData.map((entry,i) => (
                      <Cell key={i} fill={entry.pnl>=0 ? "#00AC5B" : "#EF4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Holdings table */}
          <Card title="Holdings Summary">
            <div style={{ overflowX:"auto", margin:"-4px -24px -20px" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:"600px" }}>
                <thead>
                  <tr>
                    {["Ticker","Name","Type","Value","P&L","Return"].map(h => (
                      <th key={h} style={{
                        color:"#9CA3AF", textAlign:"left",
                        padding:"10px 20px", fontSize:"11px", fontWeight:"600",
                        textTransform:"uppercase", letterSpacing:"0.07em",
                        background:"#F9FAFB", borderBottom:"1px solid #F3F4F6"
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...investments].sort((a,b)=>b.total_value-a.total_value).map(inv => (
                    <tr key={inv.id}
                      style={{ borderBottom:"1px solid #F9FAFB", transition:"background .12s" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{ padding:"13px 20px" }}>
                        <span style={{ background:"#EAF3EE", color:"#00693C",
                          fontWeight:"700", padding:"3px 9px",
                          borderRadius:"6px", fontSize:"13px" }}>{inv.ticker}</span>
                      </td>
                      <td style={{ padding:"13px 20px", color:"#374151",
                                   fontSize:"14px" }}>{inv.name}</td>
                      <td style={{ padding:"13px 20px" }}>
                        <span style={{ background:"#F3F4F6", color:"#6B7280",
                          padding:"2px 9px", borderRadius:"99px", fontSize:"12px" }}>
                          {inv.asset_type.replace("_"," ")}
                        </span>
                      </td>
                      <td style={{ padding:"13px 20px", color:"#1A1A2E",
                                   fontWeight:"700", fontSize:"14px" }}>
                        ${Number(inv.total_value).toLocaleString()}
                      </td>
                      <td style={{ padding:"13px 20px", fontWeight:"600", fontSize:"14px",
                        color: inv.gain_loss>=0 ? "#00AC5B" : "#DC2626" }}>
                        {inv.gain_loss>=0?"+":""}${inv.gain_loss}
                      </td>
                      <td style={{ padding:"13px 20px", fontSize:"14px",
                        color: inv.gain_loss_pct>=0 ? "#00AC5B" : "#DC2626" }}>
                        {inv.gain_loss_pct>=0?"+":""}{inv.gain_loss_pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
