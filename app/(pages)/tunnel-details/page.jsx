"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { ToastProvider, useToast } from "../../components/common/Toaster";
import ViewListIcon from "@mui/icons-material/ViewList";
import GridViewIcon from "@mui/icons-material/GridView";
import "../../styles/pages/tunnel-details.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function TunnelsContent() {
  const router = useRouter();
  const toast = useToast();
  const [tunnels, setTunnels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    fetchTunnels();
  }, []);

  const fetchTunnels = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/tunnels`);
      const json = await res.json();
      if (json.success) {
        setTunnels(json.data);
      } else {
        toast.error(json.message || "Failed to fetch tunnels");
      }
    } catch (error) {
      toast.error("Failed to load tunnels");
      console.error("Error loading tunnels:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (id) => {
    router.push(`/tunnel-detail/${id}`);
  };

  const renderGridView = () => (
    <div className="tunnels-grid">
      {tunnels.map((tunnel) => (
        <div
          key={tunnel.id}
          className="tunnel-card"
          onClick={() => handleCardClick(tunnel.id)}
        >
          <div className="tunnel-card__header">
            <span className={`tunnel-capacity-badge ${tunnel.is_active ? "status-occupied" : "status-free"}`}>
              {tunnel.is_active ? "Occupied" : "Free"}
            </span>
          </div>

          <div className="tunnel-card__body">
            <h3 className="tunnel-name">{tunnel.name}</h3>
            <p className="tunnel-desc">{tunnel.description || "No description available"}</p>
          </div>

          <div className="tunnel-card__footer">
            <span className="tunnel-footer-label">Max Capacity</span>
            <span className="tunnel-footer-value">
              {tunnel.max_capacity?.toLocaleString() || "0"} kg
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <table className="tunnels-table">
      <thead>
        <tr>
          <th>Tunnel</th>
          <th>Description</th>
          <th>Max Capacity</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {tunnels.map((tunnel) => (
          <tr
            key={tunnel.id}
            className="tunnel-row"
            onClick={() => handleCardClick(tunnel.id)}
          >
            <td>
              <div className="tunnel-info">
                <span className="tunnel-name-cell">{tunnel.name}</span>
              </div>
            </td>
            <td className="tunnel-desc-cell">{tunnel.description || "No description available"}</td>
            <td>
              <span className="tunnel-capacity-badge">
                {tunnel.max_capacity?.toLocaleString() || "0"} kg
              </span>
            </td>
            <td>
              <span className={`tunnel-capacity-badge ${tunnel.is_active ? "status-occupied" : "status-free"}`}>
                {tunnel.is_active ? "Occupied" : "Free"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <AppLayout title="Tunnels">
      <div className="tunnels-container">

        {/* Header */}
        <div className="tunnels-header-section">
          <div>
            <h1 className="tunnels-main-title">Tunnels</h1>
            <p className="tunnels-subtitle">{tunnels.length} tunnels available</p>
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
        <div className={`tunnels-${viewMode}-card`}>
          <div className="table-header">
            <span className="tunnels-count">{tunnels.length} tunnels</span>
          </div>

          <div className={viewMode === "list" ? "table-wrapper" : "grid-wrapper"}>
            {loading ? (
              <div className="no-results">
                <p>Loading tunnels...</p>
              </div>
            ) : tunnels.length === 0 ? (
              <div className="no-results">
                <h3>No tunnels found</h3>
                <p>No tunnel data available</p>
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

export default function TunnelsPage() {
  return (
    <ToastProvider>
      <TunnelsContent />
    </ToastProvider>
  );
}