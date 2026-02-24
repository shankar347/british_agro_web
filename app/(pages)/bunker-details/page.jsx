// "use client";
// import AppLayout from "../../components/AppLayout";
// import "../../styles/pages/bunker-details.css";

// const BUNKERS = [
//   { id:"Bunker 1", capacity:5000, used:4200, batches:3, status:"Near Full", temp:"16°C", humidity:"62%" },
//   { id:"Bunker 2", capacity:5000, used:1800, batches:1, status:"Available", temp:"15°C", humidity:"60%" },
//   { id:"Bunker 3", capacity:8000, used:0,    batches:0, status:"Empty",     temp:"14°C", humidity:"58%" },
//   { id:"Bunker 4", capacity:5000, used:5000, batches:4, status:"Full",      temp:"17°C", humidity:"65%" },
//   { id:"Bunker 5", capacity:3000, used:2100, batches:2, status:"Available", temp:"16°C", humidity:"61%" },
// ];
// const STATUS_BADGE = { "Near Full":"badge-warning", "Available":"badge-success", "Empty":"badge-neutral", "Full":"badge-info" };
// const fillColor = (pct) => pct >= 90 ? "var(--error)" : pct >= 70 ? "var(--warning)" : "var(--primary)";

// export default function BunkerDetails() {
//   return (
//     <AppLayout title="Bunker Details">
//       <div className="bunker-grid">
//         {BUNKERS.map((b) => {
//           const pct = Math.round((b.used / b.capacity) * 100);
//           return (
//             <div className="card" key={b.id} style={{ padding:20 }}>
//               <div className="bunker-card-header">
//                 <h3 className="bunker-card-title">{b.id}</h3>
//                 <span className={`badge ${STATUS_BADGE[b.status]}`}>{b.status}</span>
//               </div>
//               <div className="bunker-cap-row">
//                 <span>Capacity used</span>
//                 <span><strong>{b.used.toLocaleString()} kg</strong> / {b.capacity.toLocaleString()} kg</span>
//               </div>
//               <div className="bunker-cap-track">
//                 <div className="bunker-cap-fill" style={{ width:`${Math.min(pct,100)}%`, background: fillColor(pct) }} />
//               </div>
//               <div className="bunker-mini-stats">
//                 {[{ label:"Batches", value:b.batches },{ label:"Temp", value:b.temp },{ label:"Humidity", value:b.humidity }].map(({ label, value }) => (
//                   <div key={label} className="bunker-mini-stat">
//                     <div className="bunker-mini-label">{label}</div>
//                     <div className="bunker-mini-value">{value}</div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           );
//         })}
//       </div>
//       <div className="card">
//         <h2 className="bunker-summary-title">Bunker Summary</h2>
//         <div className="table-wrapper">
//           <table>
//             <thead><tr><th>Bunker</th><th>Capacity</th><th>Used</th><th>Batches</th><th>Temp</th><th>Humidity</th><th>Status</th></tr></thead>
//             <tbody>
//               {BUNKERS.map((b) => (
//                 <tr key={b.id}>
//                   <td><strong>{b.id}</strong></td><td>{b.capacity.toLocaleString()} kg</td><td>{b.used.toLocaleString()} kg</td>
//                   <td>{b.batches}</td><td>{b.temp}</td><td>{b.humidity}</td>
//                   <td><span className={`badge ${STATUS_BADGE[b.status]}`}>{b.status}</span></td>
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
