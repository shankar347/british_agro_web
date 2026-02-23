// "use client";
// import { useState } from "react";
// import AppLayout from "../../components/AppLayout";
// import "../../styles/pages/forecast.css";

// const FORECAST_DATA = [
//   { month: "March 2026",  crop: "Wheat",  expected: "5,200 kg", confidence: "High",   batches: 4 },
//   { month: "April 2026",  crop: "Barley", expected: "3,800 kg", confidence: "Medium", batches: 3 },
//   { month: "May 2026",    crop: "Oats",   expected: "4,400 kg", confidence: "High",   batches: 5 },
//   { month: "June 2026",   crop: "Wheat",  expected: "6,100 kg", confidence: "High",   batches: 6 },
//   { month: "July 2026",   crop: "Rye",    expected: "2,900 kg", confidence: "Low",    batches: 2 },
//   { month: "August 2026", crop: "Barley", expected: "4,700 kg", confidence: "Medium", batches: 4 },
// ];
// const CONF_BADGE = { High: "badge-success", Medium: "badge-warning", Low: "badge-neutral" };
// const CROPS = ["All", "Wheat", "Barley", "Oats", "Rye"];

// export default function Forecast() {
//   const [filter, setFilter] = useState("All");
//   const filtered = filter === "All" ? FORECAST_DATA : FORECAST_DATA.filter((f) => f.crop === filter);
//   return (
//     <AppLayout title="Forecast">
//       <div className="card">
//         <div className="forecast-filters">
//           <span className="forecast-filter-label">Filter by crop:</span>
//           <div className="forecast-filter-group">
//             {CROPS.map((c) => (
//               <button key={c} className={`forecast-filter-btn${filter === c ? " active" : ""}`} onClick={() => setFilter(c)}>{c}</button>
//             ))}
//           </div>
//         </div>
//         <div className="table-wrapper">
//           <table>
//             <thead><tr><th>Month</th><th>Primary Crop</th><th>Expected Yield</th><th>Planned Batches</th><th>Confidence</th></tr></thead>
//             <tbody>
//               {filtered.map((f, i) => (
//                 <tr key={i}>
//                   <td><strong>{f.month}</strong></td><td>{f.crop}</td><td>{f.expected}</td><td>{f.batches}</td>
//                   <td><span className={`badge ${CONF_BADGE[f.confidence]}`}>{f.confidence}</span></td>
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