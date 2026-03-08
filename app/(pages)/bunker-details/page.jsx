"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { ToastProvider, useToast } from "../../components/common/Toaster";
import ViewListIcon from "@mui/icons-material/ViewList";
import GridViewIcon from "@mui/icons-material/GridView";
import CloseIcon from "@mui/icons-material/Close";
import "../../styles/pages/bunker-details.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const STAGE_KEYS = [
  "bunker_process1",
  "bunker_process1_rest",
  "bunker_process2",
  "bunker_process2_rest",
  "bunker_process3",
  "bunker_process3_rest",
  "bp_1_2", "bp_1_2_rest",
  "bp_1_3", "bp_1_3_rest",
  "bp_2_2", "bp_2_2_rest",
  "bp_2_3", "bp_2_3_rest",
  "bp_3_2", "bp_3_2_rest",
  "bp_3_3", "bp_3_3_rest",
];

const BATCH_COLORS = ["#e53935", "#43a047", "#1e88e5", "#fb8c00", "#8e24aa", "#00897b"];

function getBatchStyle(stageName) {
  if (!stageName) return { label: "—", colorClass: "bp-blue" };
  const s = stageName.toLowerCase();
  if (s.includes("bp_3") || s.includes("process3") || s.includes("aging"))
    return { label: "3BP", colorClass: "bp-red" };
  if (s.includes("bp_2") || s.includes("process2") || s.includes("distillation"))
    return { label: "2BP", colorClass: "bp-green" };
  if (s.includes("bp_1") || s.includes("bunker_process1") || s.includes("process1") || s.includes("fermentation"))
    return { label: "1BP", colorClass: "bp-blue" };
  return { label: stageName.toUpperCase(), colorClass: "bp-blue" };
}

function formatDateTime(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function shortDateTime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${mo}/${day} ${hh}:${mm}`;
}

function stageLabel(key) {
  if (!key) return "—";
  const map = {
    bunker_process1: "1BP (1)", bunker_process1_rest: "1BP (1) Rest",
    bunker_process2: "2BP (1)", bunker_process2_rest: "2BP (1) Rest",
    bunker_process3: "3BP (1)", bunker_process3_rest: "3BP (1) Rest",
    bp_1_2: "1BP (2)", bp_1_2_rest: "1BP (2) Rest",
    bp_1_3: "1BP (3)", bp_1_3_rest: "1BP (3) Rest",
    bp_2_2: "2BP (2)", bp_2_2_rest: "2BP (2) Rest",
    bp_2_3: "2BP (3)", bp_2_3_rest: "2BP (3) Rest",
    bp_3_2: "3BP (2)", bp_3_2_rest: "3BP (2) Rest",
    bp_3_3: "3BP (3)", bp_3_3_rest: "3BP (3) Rest",
  };
  return map[key] || key;
}

function TempHrsPill({ start, end, colorClass }) {
  if (start == null) return null;
  const lineColor =
    colorClass === "bp-red"   ? "#e53935" :
    colorClass === "bp-green" ? "#43a047" : "#1e88e5";
  const total = end != null
    ? (parseFloat(start) + parseFloat(end)).toFixed(1)
    : parseFloat(start).toFixed(1);

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 2, 
      fontSize: 9, 
      fontWeight: 600,
      color: lineColor,
      background: `${lineColor}12`,
      border: `1px solid ${lineColor}30`,
      borderRadius: 20,
      padding: "1px 6px", 
      marginLeft: 4, 
      whiteSpace: "nowrap",
      verticalAlign: "middle",
    }}>
      <span style={{ color: "#718096", fontWeight: 500 }}>{start}</span>
      <span style={{ color: "#cbd5e0" }}>/</span>
      <span style={{ color: "#718096", fontWeight: 500 }}>{end != null ? end : "—"}</span>
      <span style={{ color: "#cbd5e0", margin: "0 1px" }}>=</span>
      <span style={{ color: lineColor, fontWeight: 700 }}>{total} hrs</span>
    </span>
  );
}

function BunkerPopup({ bunker, batchGraphData, loadingGraph, onClose }) {
  const batches = Array.isArray(bunker.batch) ? bunker.batch.slice(0, 3) : [];
  const [activeIdx, setActiveIdx] = useState(0);

  const activeBatch = batches[activeIdx] || null;
  const activeBatchId = activeBatch?.batch_id || null;
  const stagesForBatch = activeBatchId ? (batchGraphData[activeBatchId] || {}) : {};
  const stageTabsForBatch = STAGE_KEYS.filter(k => stagesForBatch[k] && stagesForBatch[k].length > 0);
  const [activeStageKey, setActiveStageKey] = useState(null);

  useEffect(() => {
    setActiveStageKey(stageTabsForBatch[0] || null);
  }, [activeIdx, loadingGraph]);

  const chartData = activeStageKey ? (stagesForBatch[activeStageKey] || []) : [];
  const BP_COLORS = { "bp-blue": "#4a90d9", "bp-green": "#43a047", "bp-red": "#e53935" };
  const activeColor = BP_COLORS[getBatchStyle(activeBatch?.stage_name).colorClass] || "#4a90d9";

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div className="bkp-backdrop" onClick={handleBackdrop}>
      <div className="bkp-modal">
        <div className="bkp-modal__header">
          <div className="bkp-modal__title">
            <span className="bkp-modal__bunker-name">{bunker.name}</span>
            <span className={`bk-card__status ${bunker.is_active ? "bk-status--occupied" : "bk-status--free"}`}>
              {bunker.is_active ? "Occupied" : "Free"}
            </span>
          </div>
          <button className="bkp-close-btn" onClick={onClose}><CloseIcon fontSize="small" /></button>
        </div>

        {batches.length === 0 ? (
          <div className="bkp-empty">No active batches today</div>
        ) : (
          <>
            <div className="bkp-tabs">
              {batches.map((batch, idx) => {
                const color = BATCH_COLORS[idx % BATCH_COLORS.length];
                const isActive = idx === activeIdx;
                return (
                  <button key={idx}
                    className={`bkp-tab ${isActive ? "bkp-tab--active" : ""}`}
                    style={isActive ? { borderBottomColor: color, color } : {}}
                    onClick={() => setActiveIdx(idx)}>
                    <span className="bkp-tab__dot" style={{ background: color }} />
                    <span className="bkp-tab__label">#{batch.batch_number}</span>
                  </button>
                );
              })}
            </div>

{activeBatch && (
  <div className="bkp-batch-meta">
    <div className="bkp-meta-row">
      <span className="bkp-meta-label">Stage</span>
      <span className="bkp-meta-value">
        <span className={`bk-bp-badge ${getBatchStyle(activeBatch.stage_name).colorClass}`}
          style={{ fontSize: "10px", height: "24px", minWidth: "32px" }}>
          {getBatchStyle(activeBatch.stage_name).label}
        </span>
      </span>
    </div>
    <div className="bkp-meta-row">
      <span className="bkp-meta-label">Start</span>
      <span className="bkp-meta-value">{formatDateTime(activeBatch.stage_start_time)}</span>
    </div>

    {activeBatch.stage_end_time && (
      <div className="bkp-meta-row">
        <span className="bkp-meta-label">End</span>
        <span className="bkp-meta-value">{formatDateTime(activeBatch.stage_end_time)}</span>
      </div>
    )}

    {activeBatch.stage_start_time && (
      <div className="bkp-meta-row">
        <span className="bkp-meta-label">
          {activeBatch.stage_end_time ? "Duration" : "continuing"}
        </span>
        <span className="bkp-meta-value" style={{ fontWeight: 600, color: "#2b6cb0" }}>
          {(() => {
            const start = new Date(activeBatch.stage_start_time);
            const end = activeBatch.stage_end_time
              ? new Date(activeBatch.stage_end_time)
              : new Date(); // current time if no end
            const diffMs = end - start;
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            return `${hours}h ${mins}m${!activeBatch.stage_end_time ? " (ongoing)" : ""}`;
          })()}
        </span>
      </div>
    )}

    {activeBatch.start_temp_hours != null && (
      <>
        <div className="bkp-meta-row">
          <span className="bkp-meta-label">Initial Temp Hr</span>
          <span className="bkp-meta-value">{activeBatch.start_temp_hours} hrs</span>
        </div>
        <div className="bkp-meta-row">
          <span className="bkp-meta-label">Final Temp Hr</span>
          <span className="bkp-meta-value">
            {activeBatch.end_temp_hours != null ? `${activeBatch.end_temp_hours} hrs` : "—"}
          </span>
        </div>
        <div className="bkp-meta-row">
          <span className="bkp-meta-label">Total Temp Hr</span>
          <span className="bkp-meta-value" style={{ fontWeight: 700, color: "#2b6cb0" }}>
            {activeBatch.end_temp_hours != null
              ? `${(activeBatch.start_temp_hours + activeBatch.end_temp_hours).toFixed(1)} hrs`
              : `${activeBatch.start_temp_hours} hrs`}
          </span>
        </div>
      </>
    )}
  </div>
)}

            {!loadingGraph && stageTabsForBatch.length > 1 && (
              <div className="bkp-stage-tabs">
                {stageTabsForBatch.map((sk) => (
                  <button key={sk}
                    className={`bkp-stage-tab ${activeStageKey === sk ? "bkp-stage-tab--active" : ""}`}
                    style={activeStageKey === sk ? { background: activeColor, color: "#fff", borderColor: activeColor } : {}}
                    onClick={() => setActiveStageKey(sk)}>
                    {stageLabel(sk)}
                  </button>
                ))}
              </div>
            )}

            <div className="bkp-graph-area">
              {loadingGraph ? (
                <div className="bkp-graph-loading">Loading temperature data…</div>
              ) : chartData.length === 0 ? (
                <div className="bkp-graph-empty">No temperature readings available for this batch</div>
              ) : (
                <>
                  <div className="bkp-graph-title" style={{ color: activeColor }}>
                    {stageLabel(activeStageKey)} — Temperature Trend
                  </div>
                  <ResponsiveContainer width="100%" height={230}>
                    <LineChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="datetime" tick={{ fontSize: 10, fill: "#718096" }} tickLine={false} angle={-25} textAnchor="end" height={44} />
                      <YAxis tick={{ fontSize: 10, fill: "#718096" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}°`}
                        label={{ value: "°C", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "#718096" } }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }} formatter={(v) => [`${v}°C`, "Avg Temp"]} />
                      <ReferenceLine y={30} stroke="#f6ad55" strokeDasharray="4 4" label={{ value: "30°", position: "right", fontSize: 9, fill: "#f6ad55" }} />
                      <ReferenceLine y={80} stroke="#fc8181" strokeDasharray="4 4" label={{ value: "80°", position: "right", fontSize: 9, fill: "#fc8181" }} />
                      <Line type="monotone" dataKey="avg" name="Avg Temp" stroke={activeColor} strokeWidth={2.5} dot={{ r: 3.5, fill: activeColor }} activeDot={{ r: 5 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                  {(() => {
                    const vals = chartData.map((d) => d.avg).filter((v) => v != null);
                    const min = vals.length ? Math.min(...vals).toFixed(1) : "—";
                    const max = vals.length ? Math.max(...vals).toFixed(1) : "—";
                    const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—";
                    return (
                      <div className="bkp-stats-row">
                        {[
                          { label: "Readings", value: vals.length },
                          { label: "Min", value: vals.length ? `${min}°C` : "—" },
                          { label: "Max", value: vals.length ? `${max}°C` : "—" },
                          { label: "Average", value: vals.length ? `${avg}°C` : "—" },
                        ].map(({ label, value }) => (
                          <div key={label} className="bkp-stat-chip">
                            <div className="bkp-stat-label">{label}</div>
                            <div className="bkp-stat-value" style={{ color: activeColor }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BunkerCard({ bunker, onClick }) {
  const isOccupied = bunker.is_active;
  const batches = Array.isArray(bunker.batch) ? bunker.batch.slice(0, 3) : [];
  const hasBatches = batches.length > 0;

  return (
    <div className="bk-card" onClick={onClick}>
      <div className="bk-card__header">
        <span className="bk-card__name">{bunker.name}</span>
        <span className={`bk-card__status ${isOccupied ? "bk-status--occupied" : "bk-status--free"}`}>
          {isOccupied ? "Occupied" : "Free"}
        </span>
      </div>

      <div className="bk-card__pipe" />

      <div className="bk-card__body">
        {!hasBatches ? (
          <div className="bk-card__empty">No active batches today</div>
        ) : (
          batches.map((batch, idx) => {
            const { label, colorClass } = getBatchStyle(batch.stage_name);
            return (
              <div key={idx} className="bk-batch-section">
                <div className="bk-batch-row">
                  <span className={`bk-bp-badge ${colorClass}`}>{label}</span>
                  <div className="bk-batch-info">
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                      <span className="bk-batch-number">#{batch.batch_number}</span>
                      <TempHrsPill
                        start={batch.start_temp_hours}
                        end={batch.end_temp_hours}
                        colorClass={colorClass}
                      />
                    </div>
                    <span className="bk-batch-time">
                      {formatDateTime(batch.stage_start_time)} → {formatDateTime(batch.stage_end_time)}
                    </span>
                  </div>
                  <div className={`bk-batch-accent ${colorClass}`} />
                </div>
                {idx < batches.length - 1 && <div className="bk-batch-divider" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function BunkersContent() {
  const router = useRouter();
  const toast = useToast();
  const [bunkers, setBunkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");

  const [selectedBunker, setSelectedBunker] = useState(null);
  const [batchGraphData, setBatchGraphData] = useState({});
  const [loadingGraph, setLoadingGraph] = useState(false);

  useEffect(() => { fetchBunkers(); }, []);

  const fetchBunkers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/bunkers`);
      const json = await res.json();
      if (json.success) setBunkers(json.data);
      else toast.error(json.message || "Failed to fetch bunkers");
    } catch (error) {
      toast.error("Failed to load bunkers");
    } finally {
      setLoading(false);
    }
  };

  const fetchGraphData = async (bunker) => {
    const batches = Array.isArray(bunker.batch) ? bunker.batch.slice(0, 3) : [];
    if (batches.length === 0) return;
    setLoadingGraph(true);
    try {
      const result = {};
      await Promise.all(batches.map(async (batch) => {
        const batchId = batch.batch_id;
        if (!batchId) return;
        try {
          const res = await fetch(`${API_URL}/bunker-process-logs/batch/${batchId}`);
          if (!res.ok) return;
          const json = await res.json();
          const items = json?.data?.items || [];
          const stageMap = {};
          items.forEach((item) => {
            STAGE_KEYS.forEach((stageKey) => {
              const stage = item[stageKey];
              if (!stage) return;
              const tempList = stage.temp_list;
              if (!Array.isArray(tempList) || tempList.length === 0) return;
              if (!stageMap[stageKey]) stageMap[stageKey] = [];
              tempList.forEach((t) => {
                if (t.date_time && t.row_avg != null) {
                  stageMap[stageKey].push({
                    datetime: shortDateTime(t.date_time),
                    raw_dt: t.date_time,
                    avg: t.row_avg,
                    sensor1: t.sensor1, sensor2: t.sensor2,
                    sensor3: t.sensor3, sensor4: t.sensor4,
                  });
                }
              });
            });
          });
          Object.keys(stageMap).forEach((sk) => {
            stageMap[sk].sort((a, b) => new Date(a.raw_dt) - new Date(b.raw_dt));
          });
          result[batchId] = stageMap;
        } catch (err) {
          result[batchId] = {};
        }
      }));
      setBatchGraphData(result);
    } catch (err) {
      console.error("Error fetching graph data:", err);
    } finally {
      setLoadingGraph(false);
    }
  };

  const handleCardClick = (bunker) => {
    setSelectedBunker(bunker);
    setBatchGraphData({});
    fetchGraphData(bunker);
  };

  const handleClosePopup = () => {
    setSelectedBunker(null);
    setBatchGraphData({});
  };

  const handleRowClick = (id) => { router.push(`/bunker-detail/${id}`); };

  const renderGridView = () => (
    <div className="bunkers-grid">
      {bunkers.map((bunker) => (
        <BunkerCard key={bunker.id} bunker={bunker} onClick={() => handleCardClick(bunker)} />
      ))}
    </div>
  );

  const renderListView = () => (
    <table className="bunkers-table">
      <thead>
        <tr>
          <th>Bunker</th><th>Batch</th><th>Stage</th>
          <th>Start</th><th>End</th><th>Max Capacity</th><th>Status</th>
        </tr>
      </thead>
      <tbody>
        {bunkers.map((bunker) => {
          const batches = Array.isArray(bunker.batch) ? bunker.batch.slice(0, 3) : [];
          const firstBatch = batches[0];
          const { label, colorClass } = getBatchStyle(firstBatch?.stage_name);
          return (
            <tr key={bunker.id} className="bunker-row" onClick={() => handleRowClick(bunker.id)} style={{ cursor: "pointer" }}>
              <td><div className="bunker-info"><span className="bunker-name-cell">{bunker.name}</span></div></td>
              <td className="bunker-desc-cell">
                {firstBatch?.batch_number ? `#${firstBatch.batch_number}` : "—"}
                {batches.length > 1 && <span style={{ color: "#888", fontSize: "11px", marginLeft: 4 }}>+{batches.length - 1} more</span>}
              </td>
              <td className="bunker-desc-cell">
                {firstBatch ? <span className={`bk-bp-badge ${colorClass}`}>{label}</span> : "—"}
              </td>
              <td className="bunker-desc-cell">{firstBatch ? formatDateTime(firstBatch.stage_start_time) : "—"}</td>
              <td className="bunker-desc-cell">{firstBatch ? formatDateTime(firstBatch.stage_end_time) : "—"}</td>
              <td><span className="bunker-capacity-badge">{bunker.max_capacity.toLocaleString()} kg</span></td>
              <td>
                <span className={`bunker-capacity-badge ${bunker.is_active ? "status-occupied" : "status-free"}`}>
                  {bunker.is_active ? "Occupied" : "Free"}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <AppLayout title="Bunkers">
      <div className="bunkers-container">
        <div className="bunkers-header-section">
          <div>
            <h1 className="bunkers-main-title">Bunkers</h1>
            <p className="bunkers-subtitle">{bunkers.length} bunkers available</p>
          </div>
        </div>

        <div className="filters-section">
          <div className="view-toggle">
            <button className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`} onClick={() => setViewMode("grid")} title="Grid View">
              <GridViewIcon fontSize="small" />
            </button>
            <button className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")} title="List View">
              <ViewListIcon fontSize="small" />
            </button>
          </div>
        </div>

        <div className={`bunkers-${viewMode}-card`}>
          <div className="table-header">
            <span className="bunkers-count">{bunkers.length} bunkers</span>
          </div>
          <div className={viewMode === "list" ? "table-wrapper" : "grid-wrapper"}>
            {loading ? (
              <div className="no-results"><p>Loading bunkers...</p></div>
            ) : bunkers.length === 0 ? (
              <div className="no-results"><h3>No bunkers found</h3><p>No bunker data available</p></div>
            ) : viewMode === "list" ? renderListView() : renderGridView()}
          </div>
        </div>
      </div>

      {selectedBunker && (
        <BunkerPopup bunker={selectedBunker} batchGraphData={batchGraphData} loadingGraph={loadingGraph} onClose={handleClosePopup} />
      )}
    </AppLayout>
  );
}

export default function BunkersPage() {
  return (
    <ToastProvider>
      <BunkersContent />
    </ToastProvider>
  );
}