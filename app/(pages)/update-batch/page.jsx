"use client";
import { useState } from "react";
import AppLayout from "../../components/AppLayout";
import "../../styles/pages/update-batch.css";

function PlatformForm() {
  const [form, setForm] = useState({ batchId:"", cropType:"", platform:"", quantity:"", unit:"kg", notes:"" });
  const [saved, setSaved] = useState(false);
  const h = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const submit = (e) => { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 3000); };
  return (
    // <form onSubmit={submit}>
    //   {saved && <div className="alert-success">✓ Platform batch updated!</div>}
    //   <div className="form-grid">
    //     <div className="form-group"><label className="form-label">Batch ID</label>
    //       <select className="form-select" name="batchId" value={form.batchId} onChange={h} required>
    //         <option value="">Select batch</option><option>B-0041</option><option>B-0040</option><option>B-0039</option><option>B-0038</option>
    //       </select></div>
    //     <div className="form-group"><label className="form-label">Crop Type</label>
    //       <select className="form-select" name="cropType" value={form.cropType} onChange={h}>
    //         <option value="">Select crop</option><option>Wheat</option><option>Barley</option><option>Oats</option><option>Rye</option>
    //       </select></div>
    //     <div className="form-group"><label className="form-label">Platform</label>
    //       <select className="form-select" name="platform" value={form.platform} onChange={h}>
    //         <option value="">Select platform</option><option>Platform A</option><option>Platform B</option><option>Platform C</option>
    //       </select></div>
    //     <div className="form-group"><label className="form-label">Quantity</label><input className="form-input" type="number" name="quantity" value={form.quantity} onChange={h} placeholder="e.g. 2400" /></div>
    //     <div className="form-group"><label className="form-label">Unit</label>
    //       <select className="form-select" name="unit" value={form.unit} onChange={h}><option>kg</option><option>tonnes</option><option>lbs</option></select></div>
    //     <div className="form-group full-width"><label className="form-label">Notes</label><textarea className="form-textarea" name="notes" value={form.notes} onChange={h} placeholder="Update notes..." /></div>
    //   </div>
    //   <div className="form-actions">
    //     <button type="submit" className="btn btn-primary">Update Batch</button>
    //     <button type="button" className="btn btn-secondary" onClick={() => setForm({ batchId:"", cropType:"", platform:"", quantity:"", unit:"kg", notes:"" })}>Reset</button>
    //   </div>
    // </form>

    <>
    </>
  );
}

function BunkerForm() {
  const [form, setForm] = useState({ batchId:"", bunkerId:"", status:"", notes:"" });
  const [saved, setSaved] = useState(false);
  const h = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const submit = (e) => { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 3000); };
  return (
    // <form onSubmit={submit}>
    //   {saved && <div className="alert-success">✓ Bunker batch updated!</div>}
    //   <div className="form-grid">
    //     <div className="form-group"><label className="form-label">Batch ID</label>
    //       <select className="form-select" name="batchId" value={form.batchId} onChange={h} required>
    //         <option value="">Select batch</option><option>B-0041</option><option>B-0040</option><option>B-0039</option>
    //       </select></div>
    //     <div className="form-group"><label className="form-label">Bunker</label>
    //       <select className="form-select" name="bunkerId" value={form.bunkerId} onChange={h}>
    //         <option value="">Select bunker</option><option>Bunker 1</option><option>Bunker 2</option><option>Bunker 3</option>
    //       </select></div>
    //     <div className="form-group"><label className="form-label">Status</label>
    //       <select className="form-select" name="status" value={form.status} onChange={h}>
    //         <option value="">Select status</option><option>Stored</option><option>Processing</option><option>Ready for Dispatch</option>
    //       </select></div>
    //     <div className="form-group full-width"><label className="form-label">Notes</label><textarea className="form-textarea" name="notes" value={form.notes} onChange={h} placeholder="Bunker update notes..." /></div>
    //   </div>
    //   <div className="form-actions">
    //     <button type="submit" className="btn btn-primary">Update Bunker Batch</button>
    //     <button type="button" className="btn btn-secondary" onClick={() => setForm({ batchId:"", bunkerId:"", status:"", notes:"" })}>Reset</button>
    //   </div>
    // </form>

    <>
    </>
  );
}

function TunnelForm() {
  const [form, setForm] = useState({ batchId:"", tunnelId:"", temperature:"", humidity:"", notes:"" });
  const [saved, setSaved] = useState(false);
  const h = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const submit = (e) => { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 3000); };
  return (
  //   <form onSubmit={submit}>
  //     {saved && <div className="alert-success">✓ Tunnel batch updated!</div>}
  //     <div className="form-grid">
  //       <div className="form-group"><label className="form-label">Batch ID</label>
  //         <select className="form-select" name="batchId" value={form.batchId} onChange={h} required>
  //           <option value="">Select batch</option><option>B-0041</option><option>B-0040</option><option>B-0039</option>
  //         </select></div>
  //       <div className="form-group"><label className="form-label">Tunnel</label>
  //         <select className="form-select" name="tunnelId" value={form.tunnelId} onChange={h}>
  //           <option value="">Select tunnel</option><option>Tunnel 1</option><option>Tunnel 2</option><option>Tunnel 3</option>
  //         </select></div>
  //       <div className="form-group"><label className="form-label">Temperature (°C)</label><input className="form-input" type="number" name="temperature" value={form.temperature} onChange={h} placeholder="e.g. 18" /></div>
  //       <div className="form-group"><label className="form-label">Humidity (%)</label><input className="form-input" type="number" name="humidity" value={form.humidity} onChange={h} placeholder="e.g. 65" /></div>
  //       <div className="form-group full-width"><label className="form-label">Notes</label><textarea className="form-textarea" name="notes" value={form.notes} onChange={h} placeholder="Tunnel condition notes..." /></div>
  //     </div>
  //     <div className="form-actions">
  //       <button type="submit" className="btn btn-primary">Update Tunnel Batch</button>
  //       <button type="button" className="btn btn-secondary" onClick={() => setForm({ batchId:"", tunnelId:"", temperature:"", humidity:"", notes:"" })}>Reset</button>
  //     </div>
  //   </form>
  <>
  </>
  );
}

export default function UpdateBatch() {
  const [tab, setTab] = useState("platform");
  return (
    <AppLayout title="Update Batch">
      <div className="card">
        <div className="tabs">
          <button className={`tab-btn${tab === "platform" ? " active" : ""}`} onClick={() => setTab("platform")}>Platform</button>
          <button className={`tab-btn${tab === "bunker" ? " active" : ""}`} onClick={() => setTab("bunker")}>Bunker</button>
          <button className={`tab-btn${tab === "tunnel" ? " active" : ""}`} onClick={() => setTab("tunnel")}>Tunnel</button>
        </div>
        {tab === "platform" && <PlatformForm />}
        {tab === "bunker"   && <BunkerForm />}
        {tab === "tunnel"   && <TunnelForm />}
      </div>
    </AppLayout>
  );
}
