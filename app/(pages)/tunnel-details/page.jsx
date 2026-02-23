// "use client";
// import AppLayout from "../../components/AppLayout";
// import "../../styles/pages/tunnel-details.css";

// const TUNNELS = [
//   { id:"Tunnel 1", crop:"Wheat",  batch:"B-0041", startDate:"2026-02-10", endDate:"2026-02-24", temp:"18°C", humidity:"65%", status:"Active" },
//   { id:"Tunnel 2", crop:"Barley", batch:"B-0039", startDate:"2026-02-08", endDate:"2026-02-20", temp:"16°C", humidity:"60%", status:"Active" },
//   { id:"Tunnel 3", crop:"—",      batch:"—",      startDate:"—",          endDate:"—",           temp:"14°C", humidity:"55%", status:"Idle" },
//   { id:"Tunnel 4", crop:"Oats",   batch:"B-0036", startDate:"2026-01-28", endDate:"2026-02-11", temp:"17°C", humidity:"62%", status:"Completed" },
//   { id:"Tunnel 5", crop:"Rye",    batch:"B-0033", startDate:"2026-01-20", endDate:"2026-02-03", temp:"15°C", humidity:"58%", status:"Completed" },
// ];
// const STATUS_BADGE = { Active:"badge-success", Idle:"badge-neutral", Completed:"badge-info" };
// const TOP_COLOR    = { Active:"var(--success)", Idle:"var(--border)", Completed:"var(--primary)" };

// export default function TunnelDetails() {
//   return (
//     <AppLayout title="Tunnel Details">
//       <div className="tunnel-grid">
//         {TUNNELS.map((t) => (
//           <div className="card" key={t.id} style={{ padding:20, borderTop:`3px solid ${TOP_COLOR[t.status]}` }}>
//             <div className="tunnel-card-header">
//               <h3 className="tunnel-card-title">{t.id}</h3>
//               <span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span>
//             </div>
//             <div className="tunnel-fields">
//               {[
//                 { label:"Crop", value:t.crop },{ label:"Batch ID", value:t.batch },
//                 { label:"Start Date", value:t.startDate },{ label:"End Date", value:t.endDate },
//                 { label:"Temp", value:t.temp },{ label:"Humidity", value:t.humidity },
//               ].map(({ label, value }) => (
//                 <div key={label}>
//                   <div className="tunnel-field-label">{label}</div>
//                   <div className="tunnel-field-value">{value}</div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         ))}
//       </div>
//       <div className="card">
//         <h2 className="tunnel-summary-title">All Tunnels — Summary</h2>
//         <div className="table-wrapper">
//           <table>
//             <thead><tr><th>Tunnel</th><th>Batch</th><th>Crop</th><th>Start Date</th><th>End Date</th><th>Temp</th><th>Humidity</th><th>Status</th></tr></thead>
//             <tbody>
//               {TUNNELS.map((t) => (
//                 <tr key={t.id}>
//                   <td><strong>{t.id}</strong></td><td>{t.batch}</td><td>{t.crop}</td><td>{t.startDate}</td><td>{t.endDate}</td>
//                   <td>{t.temp}</td><td>{t.humidity}</td>
//                   <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span></td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </AppLayout>
//   );
// }

import React from 'react'
import AppLayout from '@/app/components/AppLayout'

const page = () => {
  return (
    <>
      <AppLayout>
        <h1> 
            <strong>Yet to work....</strong>
        </h1>
      </AppLayout>
    </>
  )
}

export default page