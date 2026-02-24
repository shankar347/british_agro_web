"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { ToastProvider, useToast } from "../../components/common/Toaster";
import "../../styles/pages/dashboard.css";

// Import your BatchRepo (adjust path as needed)
// import { BatchRepo } from "../../repositories/batchRepository";

// Mock data for demonstration - replace with actual API data
const MOCK_PLATFORM_BATCHES = [
  { 
    id: "B-0041", 
    batchNumber: "B-0041",
    crop: "Wheat", 
    platform: "Platform A", 
    currentStage: "Soaking", 
    stageStartTime: "2026-02-19T08:30:00",
    duration: "2h 15m",
    quantity: "2,400 kg",
    isRestingTooLong: false
  },
  { 
    id: "B-0042", 
    batchNumber: "B-0042",
    crop: "Barley", 
    platform: "Platform B", 
    currentStage: "Resting", 
    stageStartTime: "2026-02-18T22:00:00",
    duration: "10h 30m",
    quantity: "1,800 kg",
    isRestingTooLong: true // This should trigger AlertBadge
  },
  { 
    id: "B-0043", 
    batchNumber: "B-0043",
    crop: "Oats", 
    platform: "Platform A", 
    currentStage: "Turning", 
    stageStartTime: "2026-02-19T10:15:00",
    duration: "15m",
    quantity: "3,100 kg",
    isRestingTooLong: false
  },
];

// Resting threshold in hours - configurable
const RESTING_THRESHOLD_HOURS = 8;

function BatchStatusCard({ batch }) {
  const router = useRouter();
  
  // Calculate duration if not provided
  const getDuration = () => {
    if (batch.duration) return batch.duration;
    
    if (batch.stageStartTime) {
      const start = new Date(batch.stageStartTime);
      const now = new Date();
      const diffMs = now - start;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffHrs}h ${diffMins}m`;
    }
    return "N/A";
  };

  const handleCardClick = () => {
    router.push(`/batch-detail/${batch.batchNumber}`);
  };

  return (
    <div 
      className="batch-status-card clickable-card" 
      onClick={handleCardClick}
      style={{
        backgroundColor: batch.currentStage === "Resting" && batch.isRestingTooLong ? "#fff3cd" : "white",
        border: batch.currentStage === "Resting" && batch.isRestingTooLong ? "1px solid #ffc107" : "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        position: "relative",
        cursor: "pointer"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 8px 0" }}>
            Batch #{batch.batchNumber}
          </h3>
          <p style={{ margin: "4px 0", color: "#4b5563" }}>
            <strong>Crop:</strong> {batch.crop}
          </p>
          <p style={{ margin: "4px 0", color: "#4b5563" }}>
            <strong>Platform:</strong> {batch.platform}
          </p>
          <p style={{ margin: "4px 0", color: "#4b5563" }}>
            <strong>Quantity:</strong> {batch.quantity}
          </p>
        </div>
        
        <div style={{ textAlign: "right" }}>
          {/* Current Stage Badge */}
          <span className={`badge ${getStageBadgeClass(batch.currentStage)}`}
            style={{ display: "inline-block", marginBottom: "8px" }}
          >
            {batch.currentStage}
          </span>
          
          {/* Duration */}
          <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#6b7280" }}>
            <strong>Duration:</strong> {getDuration()}
          </p>
          
          {/* AlertBadge for resting too long */}
          {batch.currentStage === "Resting" && batch.isRestingTooLong && (
            <div 
              className="alert-badge"
              style={{
                backgroundColor: "#dc2626",
                color: "white",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: 600,
                display: "inline-block",
                marginTop: "8px"
              }}
            >
              ⚠️ RESTING TOO LONG
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getStageBadgeClass(stage) {
  const stageMap = {
    "Soaking": "badge-info",
    "Resting": "badge-warning",
    "Turning": "badge-success",
    "Completed": "badge-neutral"
  };
  return stageMap[stage] || "badge-neutral";
}

function DashboardContent() {
  const router = useRouter();
  const toast = useToast();
  const [platformBatches, setPlatformBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    emptyTunnels: 14,
    emptyBunkers: 12,
    batchesInPlatform: 0,
    batchesInBunker: 8,
    batchesInTunnel: 5
  });

  // API call on load
  useEffect(() => {
    fetchPlatformBatches();
  }, []);

  const fetchPlatformBatches = async () => {
    try {
      setLoading(true);
      
      // Replace with actual API call when available
      // const response = await BatchRepo.GetBatchesByDivision("PLATFORM");
      // setPlatformBatches(response.data);
      
      // Using mock data for now
      setTimeout(() => {
        setPlatformBatches(MOCK_PLATFORM_BATCHES);
        setStats(prev => ({
          ...prev,
          batchesInPlatform: MOCK_PLATFORM_BATCHES.length
        }));
        setLoading(false);
      }, 500);
      
    } catch (error) {
      toast.error("Failed to load platform batches");
      console.error("Error loading batches:", error);
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Platform Dashboard">
      <div className="stats-grid">
        {/* Card 4 - Static info card */}
        <div className="stat-card stat-accent-4">
          <div className="stat-label">Empty Tunnels</div>
          <div className="stat-value">{stats.emptyTunnels}</div>
          <div className="stat-sub">Tunnels : 3 free</div>
        </div>

        {/* Card 5 - Static info card */}
        <div className="stat-card stat-accent-4">
          <div className="stat-label">Empty Bunkers</div>
          <div className="stat-value">{stats.emptyBunkers}</div>
          <div className="stat-sub">Bunkers : 2 free</div>
        </div>

        {/* Card 1 - Batches in Platform */}
        <div 
          className="stat-card stat-accent clickable-card" 
          onClick={() => router.push("/batches-platform")}
          style={{ cursor: "pointer" }}
        >
          <div className="stat-label">Batches in Platform</div>
          <div className="stat-value">{stats.batchesInPlatform}</div>
          <div className="stat-sub">Across all platforms</div>
        </div>

        {/* Card 2 - Batches in Bunker */}
        <div 
          className="stat-card stat-accent-2 clickable-card" 
          onClick={() => router.push("/batches-bunker")}
          style={{ cursor: "pointer" }}
        >
          <div className="stat-label">Batches in Bunker</div>
          <div className="stat-value">{stats.batchesInBunker}</div>
          <div className="stat-sub">Currently in bunkers</div>
        </div>

        {/* Card 3 - Batches in Tunnel */}
        <div 
          className="stat-card stat-accent-3 clickable-card" 
          onClick={() => router.push("/batches-tunnel")}
          style={{ cursor: "pointer" }}
        >
          <div className="stat-label">Batches in Tunnel</div>
          <div className="stat-value">{stats.batchesInTunnel}</div>
          <div className="stat-sub">Currently in tunnels</div>
        </div>
      </div>

      {/* Platform Batches Section */}
      <div className="card" style={{ marginTop: "24px" }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: 20 
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            Platform Batches - Current Status
          </h2>
          <button 
            onClick={fetchPlatformBatches}
            className="btn-secondary"
            style={{ padding: "6px 12px", fontSize: "0.875rem" }}
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
            Loading batches...
          </div>
        ) : platformBatches.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
            No active batches in platform
          </div>
        ) : (
          <div className="batches-list">
            {platformBatches.map((batch) => (
              <BatchStatusCard key={batch.id} batch={batch} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function Dashboard() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
}