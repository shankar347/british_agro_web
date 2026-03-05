"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { ToastProvider, useToast } from "../../components/common/Toaster";
import ViewListIcon from "@mui/icons-material/ViewList";
import GridViewIcon from "@mui/icons-material/GridView";
import "../../styles/pages/bunker-details.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getProcessColorClass(stageName) {
  if (!stageName) return "";
  const s = stageName.toLowerCase();
  if (s.includes("process1")) return "process-blue";
  if (s.includes("process2")) return "process-green";
  if (s.includes("process3")) return "process-red";
  return "process-blue";
}

function formatStageName(name) {
  if (!name) return "—";
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BunkersContent() {
  const router = useRouter();
  const toast = useToast();
  const [bunkers, setBunkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    fetchBunkers();
  }, []);

  const fetchBunkers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/bunkers`);
      const json = await res.json();
      if (json.success) {
        setBunkers(json.data);
      } else {
        toast.error(json.message || "Failed to fetch bunkers");
      }
    } catch (error) {
      toast.error("Failed to load bunkers");
      console.error("Error loading bunkers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (id) => {
    router.push(`/bunker-detail/${id}`);
  };

  const renderGridView = () => (
    <div className="bunkers-grid">
      {bunkers.map((bunker) => {
        const processClass =
          bunker.is_active && bunker.batch
            ? getProcessColorClass(bunker.batch.stage_name)
            : "";

        return (
          <div
            key={bunker.id}
            className={`bunker-card ${processClass}`}
          >
            <div className="bunker-card__header">
              <span className={`bunker-capacity-badge ${bunker.is_active ? "status-occupied" : "status-free"}`}>
                {bunker.is_active ? "Occupied" : "Free"}
              </span>
            </div>

            <div className="bunker-card__body">
              <h3 className="bunker-name">{bunker.name}</h3>

              {bunker.batch ? (
                <div className="bunker-batch-details">
                  <div className="batch-row">
                    <span className="batch-label">Batch</span>
                    <span className="batch-value">#{bunker.batch.batch_number}</span>
                  </div>
                  <div className="batch-row">
                    <span className="batch-label">Stage</span>
                    <span className="batch-value">{formatStageName(bunker.batch.stage_name)}</span>
                  </div>
                  <div className="batch-row">
                    <span className="batch-label">Start</span>
                    <span className="batch-value">{formatDateTime(bunker.batch.stage_start_time)}</span>
                  </div>
                  <div className="batch-row">
                    <span className="batch-label">End</span>
                    <span className="batch-value">{formatDateTime(bunker.batch.stage_end_time)}</span>
                  </div>
                </div>
              ) : (
                <p className="bunker-desc">No active batch</p>
              )}
            </div>

            <div className="bunker-card__footer">
              <span className="bunker-footer-label">Max Capacity</span>
              <span className="bunker-footer-value">
                {bunker.max_capacity.toLocaleString()} kg
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <table className="bunkers-table">
      <thead>
        <tr>
          <th>Bunker</th>
          <th>Batch</th>
          <th>Stage</th>
          <th>Start</th>
          <th>End</th>
          <th>Max Capacity</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {bunkers.map((bunker) => (
          <tr
            key={bunker.id}
            className="bunker-row"
            onClick={() => handleCardClick(bunker.id)}
          >
            <td>
              <div className="bunker-info">
                <span className="bunker-name-cell">{bunker.name}</span>
              </div>
            </td>
            <td className="bunker-desc-cell">
              {bunker.batch?.batch_number ? `#${bunker.batch.batch_number}` : "—"}
            </td>
            <td className="bunker-desc-cell">
              {bunker.batch?.stage_name ? formatStageName(bunker.batch.stage_name) : "—"}
            </td>
            <td className="bunker-desc-cell">
              {formatDateTime(bunker.batch?.stage_start_time)}
            </td>
            <td className="bunker-desc-cell">
              {formatDateTime(bunker.batch?.stage_end_time)}
            </td>
            <td>
              <span className="bunker-capacity-badge">
                {bunker.max_capacity.toLocaleString()} kg
              </span>
            </td>
            <td>
              <span className={`bunker-capacity-badge ${bunker.is_active ? "status-occupied" : "status-free"}`}>
                {bunker.is_active ? "Occupied" : "Free"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <AppLayout title="Bunkers">
      <div className="bunkers-container">

        {/* Header */}
        <div className="bunkers-header-section">
          <div>
            <h1 className="bunkers-main-title">Bunkers</h1>
            <p className="bunkers-subtitle">{bunkers.length} bunkers available</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="filters-section">
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid View"
            >
              <GridViewIcon fontSize="small" />
            </button>
            <button
              className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              title="List View"
            >
              <ViewListIcon fontSize="small" />
            </button>
          </div>
        </div>

        {/* Content Card */}
        <div className={`bunkers-${viewMode}-card`}>
          <div className="table-header">
            <span className="bunkers-count">{bunkers.length} bunkers</span>
          </div>

          <div className={viewMode === "list" ? "table-wrapper" : "grid-wrapper"}>
            {loading ? (
              <div className="no-results">
                <p>Loading bunkers...</p>
              </div>
            ) : bunkers.length === 0 ? (
              <div className="no-results">
                <h3>No bunkers found</h3>
                <p>No bunker data available</p>
              </div>
            ) : viewMode === "list" ? (
              renderListView()
            ) : (
              renderGridView()
            )}
          </div>
        </div>

      </div>
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