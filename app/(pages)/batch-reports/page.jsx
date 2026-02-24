"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { ToastProvider, useToast } from "../../components/common/Toaster";
import "../../styles/pages/batch-reports.css";
import PropTypes from 'prop-types';

import AssignmentIcon from '@mui/icons-material/Assignment';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import SearchIcon from '@mui/icons-material/Search';
import GrainIcon from '@mui/icons-material/Grain';
import ScaleIcon from '@mui/icons-material/Scale';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import TimerIcon from '@mui/icons-material/Timer';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import ErrorIcon from '@mui/icons-material/Error';
import StorageIcon from '@mui/icons-material/Storage';
// import TunnelIcon from '@mui/icons-material/Tunnel';
import TimelineIcon from '@mui/icons-material/Timeline';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import BatchPredictionIcon from '@mui/icons-material/BatchPrediction';

const ReportsRepo = {
  GetFullBatchReport: async (batchId) => {
    return {
      batchInfo: {
        id: batchId,
        material: 'Wheat',
        variety: 'Hard Red Winter',
        supplier: 'AgriCorp Ltd',
        receivedDate: '2026-02-15T10:30:00',
        startDate: '2026-02-16T08:00:00',
        endDate: '2026-02-19T16:00:00',
        status: 'completed',
        quality: 'Grade A',
        moisture: 14.2,
        temperature: 22.5
      },
      
      formulation: {
        totalWeight: 25000, // kg
        targetMoisture: 45,
        actualMoisture: 44.8,
        waterAdded: 12500, // liters
        additives: [
          { name: 'Enzyme A', quantity: 25, unit: 'kg' },
          { name: 'Preservative B', quantity: 15, unit: 'kg' },
          { name: 'Nutrient Mix', quantity: 50, unit: 'kg' }
        ],
        totals: {
          dryMatter: 25000,
          waterContent: 11250,
          totalWeight: 36250,
          moisturePercentage: 44.8
        }
      },
      
      soakingReport: {
        totalDuration: 72, // hours
        targetDuration: 72,
        straws: [
          {
            id: 1,
            strawNumber: 'S-001',
            startTime: '2026-02-16T08:00:00',
            soakHours: 24,
            restHours: 8,
            totalHours: 32,
            temperature: 22.5,
            moisture: 42.3,
            status: 'completed'
          },
          {
            id: 2,
            strawNumber: 'S-002',
            startTime: '2026-02-16T09:30:00',
            soakHours: 24,
            restHours: 8,
            totalHours: 32,
            temperature: 23.1,
            moisture: 43.1,
            status: 'completed'
          },
          {
            id: 3,
            strawNumber: 'S-003',
            startTime: '2026-02-16T11:00:00',
            soakHours: 24,
            restHours: 8,
            totalHours: 32,
            temperature: 22.8,
            moisture: 42.7,
            status: 'completed'
          },
          {
            id: 4,
            strawNumber: 'S-004',
            startTime: '2026-02-16T13:00:00',
            soakHours: 24,
            restHours: 8,
            totalHours: 32,
            temperature: 23.2,
            moisture: 43.4,
            status: 'completed'
          },
          {
            id: 5,
            strawNumber: 'S-005',
            startTime: '2026-02-16T14:30:00',
            soakHours: 24,
            restHours: 8,
            totalHours: 32,
            temperature: 22.9,
            moisture: 42.9,
            status: 'completed'
          }
        ],
        summary: {
          averageSoakHours: 24,
          averageRestHours: 8,
          averageMoisture: 42.88,
          averageTemperature: 22.9
        }
      },
      
      processTimeline: {
        bunkerHistory: [
          {
            id: 1,
            bunkerNumber: 2,
            startTime: '2026-02-17T08:00:00',
            endTime: '2026-02-18T08:00:00',
            duration: 24,
            moisture: [42.3, 43.1, 43.8, 44.2],
            temperature: [22.5, 22.8, 23.2, 23.5],
            timestamps: [
              '2026-02-17T08:00:00',
              '2026-02-17T14:00:00',
              '2026-02-17T20:00:00',
              '2026-02-18T02:00:00'
            ]
          },
          {
            id: 2,
            bunkerNumber: 4,
            startTime: '2026-02-18T09:00:00',
            endTime: '2026-02-19T09:00:00',
            duration: 24,
            moisture: [44.2, 44.6, 44.9, 45.1],
            temperature: [23.5, 23.8, 24.1, 24.3],
            timestamps: [
              '2026-02-18T09:00:00',
              '2026-02-18T15:00:00',
              '2026-02-18T21:00:00',
              '2026-02-19T03:00:00'
            ]
          }
        ],
        tunnelHistory: [
          {
            id: 1,
            tunnelName: 'Tunnel A',
            startTime: '2026-02-19T10:00:00',
            endTime: '2026-02-19T18:00:00',
            duration: 8,
            temperature: [24.5, 24.8, 25.2, 24.9],
            humidity: [55, 57, 58, 56],
            timestamps: [
              '2026-02-19T10:00:00',
              '2026-02-19T12:00:00',
              '2026-02-19T14:00:00',
              '2026-02-19T16:00:00'
            ]
          }
        ],
        qualityChecks: [
          { time: '2026-02-17T14:00:00', parameter: 'Moisture', value: 42.3, status: 'good' },
          { time: '2026-02-18T02:00:00', parameter: 'Temperature', value: 23.5, status: 'good' },
          { time: '2026-02-18T15:00:00', parameter: 'pH', value: 5.8, status: 'good' },
          { time: '2026-02-19T03:00:00', parameter: 'Moisture', value: 45.1, status: 'good' },
          { time: '2026-02-19T16:00:00', parameter: 'Final Check', value: 44.8, status: 'good' }
        ]
      },
      
      performance: {
        cycleTime: 78, // hours
        efficiency: 94.5, // percentage
        yield: 23500, // kg
        yieldPercentage: 94,
        issues: []
      }
    };
  }
};

// PropTypes definitions
const batchInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  material: PropTypes.string.isRequired,
  variety: PropTypes.string,
  supplier: PropTypes.string,
  receivedDate: PropTypes.string,
  startDate: PropTypes.string,
  endDate: PropTypes.string,
  status: PropTypes.string,
  quality: PropTypes.string,
  moisture: PropTypes.number,
  temperature: PropTypes.number
});

const strawPropType = PropTypes.shape({
  id: PropTypes.number.isRequired,
  strawNumber: PropTypes.string.isRequired,
  startTime: PropTypes.string.isRequired,
  soakHours: PropTypes.number.isRequired,
  restHours: PropTypes.number.isRequired,
  totalHours: PropTypes.number.isRequired,
  temperature: PropTypes.number,
  moisture: PropTypes.number,
  status: PropTypes.string.isRequired
});

// BatchHeader Component
function BatchHeader({ batchInfo, formulation, performance }) {
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed':
        return <span className="status-badge completed"><CheckCircleIcon /> Completed</span>;
      case 'in-progress':
        return <span className="status-badge in-progress"><PendingIcon /> In Progress</span>;
      case 'failed':
        return <span className="status-badge failed"><ErrorIcon /> Failed</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="batch-header">
      <div className="header-top">
        <div className="title-section">
          <h1 className="batch-title">
            <AssignmentIcon /> Batch Report: {batchInfo.id}
          </h1>
          {getStatusBadge(batchInfo.status)}
        </div>

        <div className="action-buttons">
          <button className="action-btn">
            <PrintIcon /> Print
          </button>
          <button className="action-btn">
            <DownloadIcon /> Export PDF
          </button>
          <button className="action-btn">
            <ShareIcon /> Share
          </button>
        </div>
      </div>

      <div className="batch-summary-cards">
        <div className="summary-card">
          <div className="card-icon material">
            <GrainIcon />
          </div>
          <div className="card-content">
            <span className="card-label">Material</span>
            <span className="card-value">{batchInfo.material}</span>
            <span className="card-subvalue">{batchInfo.variety}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon supplier">
            <PersonIcon />
          </div>
          <div className="card-content">
            <span className="card-label">Supplier</span>
            <span className="card-value">{batchInfo.supplier}</span>
            <span className="card-subvalue">Received: {formatDate(batchInfo.receivedDate).split(',')[0]}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon timeline">
            <ScheduleIcon />
          </div>
          <div className="card-content">
            <span className="card-label">Timeline</span>
            <span className="card-value">Started: {formatDate(batchInfo.startDate).split(',')[0]}</span>
            <span className="card-subvalue">Completed: {formatDate(batchInfo.endDate).split(',')[0]}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon performance">
            <ShowChartIcon />
          </div>
          <div className="card-content">
            <span className="card-label">Performance</span>
            <span className="card-value">Efficiency: {performance.efficiency}%</span>
            <span className="card-subvalue">Yield: {performance.yield.toLocaleString()} kg</span>
          </div>
        </div>
      </div>

      <div className="formulation-summary">
        <h3 className="section-title">Formulation Summary</h3>
        <div className="formulation-grid">
          <div className="formulation-item">
            <ScaleIcon />
            <div>
              <span className="item-label">Total Dry Matter</span>
              <span className="item-value">{formulation.totals.dryMatter.toLocaleString()} kg</span>
            </div>
          </div>
          <div className="formulation-item">
            <WaterDropIcon />
            <div>
              <span className="item-label">Water Added</span>
              <span className="item-value">{formulation.waterAdded.toLocaleString()} L</span>
            </div>
          </div>
          <div className="formulation-item">
            <BatchPredictionIcon />
            <div>
              <span className="item-label">Target Moisture</span>
              <span className="item-value">{formulation.targetMoisture}%</span>
            </div>
          </div>
          <div className="formulation-item highlight">
            <div>
              <span className="item-label">Final Moisture</span>
              <span className="item-value">{formulation.actualMoisture}%</span>
            </div>
          </div>
        </div>

        {formulation.additives.length > 0 && (
          <div className="additives-section">
            <h4>Additives</h4>
            <div className="additives-list">
              {formulation.additives.map((additive, index) => (
                <span key={index} className="additive-tag">
                  {additive.name}: {additive.quantity} {additive.unit}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

BatchHeader.propTypes = {
  batchInfo: batchInfoPropType.isRequired,
  formulation: PropTypes.object.isRequired,
  performance: PropTypes.object.isRequired
};

function SoakingReportTable({ soakingReport }) {
  const formatTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="soaking-report">
      <div className="report-header">
        <h3 className="section-title">
          <TimerIcon /> Soaking Report
        </h3>
        <div className="report-summary">
          <span className="summary-chip">
            Total Duration: {soakingReport.totalDuration} hours
          </span>
          <span className="summary-chip">
            Target: {soakingReport.targetDuration} hours
          </span>
        </div>
      </div>

      <div className="table-container">
        <table className="soaking-table">
          <thead>
            <tr>
              <th>Straw #</th>
              <th>Start Date</th>
              <th>Start Time</th>
              <th>Soak Hours</th>
              <th>Rest Hours</th>
              <th>Total Hours</th>
              <th>Temperature (°C)</th>
              <th>Moisture (%)</th>
            </tr>
          </thead>
          <tbody>
            {soakingReport.straws.map((straw) => (
              <tr key={straw.id}>
                <td className="straw-number">{straw.strawNumber}</td>
                <td>{formatDate(straw.startTime)}</td>
                <td>{formatTime(straw.startTime)}</td>
                <td className="hours-cell">{straw.soakHours}h</td>
                <td className="hours-cell">{straw.restHours}h</td>
                <td className="total-hours">{straw.totalHours}h</td>
                <td>
                  <span className="temp-value">{straw.temperature}°C</span>
                </td>
                <td>
                  <span className="moisture-value">{straw.moisture}%</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="summary-row">
              <td colSpan="3" className="summary-label">Average</td>
              <td className="hours-cell">{soakingReport.summary.averageSoakHours}h</td>
              <td className="hours-cell">{soakingReport.summary.averageRestHours}h</td>
              <td className="total-hours">{soakingReport.summary.averageSoakHours + soakingReport.summary.averageRestHours}h</td>
              <td>{soakingReport.summary.averageTemperature.toFixed(1)}°C</td>
              <td>{soakingReport.summary.averageMoisture.toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="soaking-stats">
        <div className="stat-row">
          <span className="stat-label">Soak/Rest Ratio:</span>
          <span className="stat-value">
            {soakingReport.summary.averageSoakHours}:{soakingReport.summary.averageRestHours}
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Moisture Gain:</span>
          <span className="stat-value">
            +{(soakingReport.summary.averageMoisture - 14).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

SoakingReportTable.propTypes = {
  soakingReport: PropTypes.shape({
    totalDuration: PropTypes.number.isRequired,
    targetDuration: PropTypes.number.isRequired,
    straws: PropTypes.arrayOf(strawPropType).isRequired,
    summary: PropTypes.object.isRequired
  }).isRequired
};

SoakingReportTable.propTypes = {
  soakingReport: PropTypes.shape({
    totalDuration: PropTypes.number.isRequired,
    targetDuration: PropTypes.number.isRequired,
    straws: PropTypes.arrayOf(strawPropType).isRequired,
    summary: PropTypes.object.isRequired
  }).isRequired
};

function MiniChart({ data, type, color }) {
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue;

  return (
    <div className="mini-chart">
      {data.map((value, index) => {
        const height = range > 0 ? ((value - minValue) / range) * 60 + 20 : 50;
        return (
          <div
            key={index}
            className="chart-bar"
            style={{
              height: `${height}%`,
              backgroundColor: color
            }}
          >
            <span className="bar-value">{value.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}

MiniChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.number).isRequired,
  type: PropTypes.string,
  color: PropTypes.string
};

function ProcessTimeline({ timeline }) {
  const [expandedBunker, setExpandedBunker] = useState(null);
  const [expandedTunnel, setExpandedTunnel] = useState(null);

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="process-timeline">
      <h3 className="section-title">
        <TimelineIcon /> Process Timeline
      </h3>

      <div className="timeline-section">
        <h4 className="subsection-title">
          <StorageIcon /> Bunker Processing
        </h4>

        <div className="timeline-cards">
          {timeline.bunkerHistory.map((bunker) => (
            <div key={bunker.id} className="timeline-card">
              <div 
                className="card-header"
                onClick={() => setExpandedBunker(expandedBunker === bunker.id ? null : bunker.id)}
              >
                <div className="header-info">
                  <span className="process-location">Bunker #{bunker.bunkerNumber}</span>
                  <span className="process-duration">{bunker.duration} hours</span>
                </div>
                <span className="expand-icon">
                  {expandedBunker === bunker.id ? '▼' : '▶'}
                </span>
              </div>

              <div className="card-body">
                <div className="time-range">
                  <span>Start: {formatDateTime(bunker.startTime)}</span>
                  <span>End: {formatDateTime(bunker.endTime)}</span>
                </div>

                <div className="charts-container">
                  <div className="chart-wrapper">
                    <div className="chart-label">
                      <WaterDropIcon /> Moisture Progression
                    </div>
                    <MiniChart 
                      data={bunker.moisture} 
                      type="moisture"
                      color="#3b82f6"
                    />
                  </div>

                  <div className="chart-wrapper">
                    <div className="chart-label">
                      <ThermostatIcon /> Temperature Progression
                    </div>
                    <MiniChart 
                      data={bunker.temperature} 
                      type="temperature"
                      color="#ef4444"
                    />
                  </div>
                </div>

                {expandedBunker === bunker.id && (
                  <div className="expanded-details">
                    <table className="details-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Moisture (%)</th>
                          <th>Temperature (°C)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bunker.timestamps.map((timestamp, index) => (
                          <tr key={index}>
                            <td>{formatTime(timestamp)}</td>
                            <td>{bunker.moisture[index]}%</td>
                            <td>{bunker.temperature[index]}°C</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tunnel History Section */}
      <div className="timeline-section">
        <h4 className="subsection-title">
          {/* <TunnelIcon /> */}
          😁
           Tunnel Processing
        </h4>

        <div className="timeline-cards">
          {timeline.tunnelHistory.map((tunnel) => (
            <div key={tunnel.id} className="timeline-card">
              <div 
                className="card-header"
                onClick={() => setExpandedTunnel(expandedTunnel === tunnel.id ? null : tunnel.id)}
              >
                <div className="header-info">
                  <span className="process-location">{tunnel.tunnelName}</span>
                  <span className="process-duration">{tunnel.duration} hours</span>
                </div>
                <span className="expand-icon">
                  {expandedTunnel === tunnel.id ? '▼' : '▶'}
                </span>
              </div>

              <div className="card-body">
                <div className="time-range">
                  <span>Start: {formatDateTime(tunnel.startTime)}</span>
                  <span>End: {formatDateTime(tunnel.endTime)}</span>
                </div>

                <div className="charts-container">
                  <div className="chart-wrapper">
                    <div className="chart-label">
                      <ThermostatIcon /> Temperature Progression
                    </div>
                    <MiniChart 
                      data={tunnel.temperature} 
                      type="temperature"
                      color="#ef4444"
                    />
                  </div>

                  <div className="chart-wrapper">
                    <div className="chart-label">
                      <WaterDropIcon /> Humidity Progression
                    </div>
                    <MiniChart 
                      data={tunnel.humidity} 
                      type="humidity"
                      color="#10b981"
                    />
                  </div>
                </div>

                {expandedTunnel === tunnel.id && (
                  <div className="expanded-details">
                    <table className="details-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Temperature (°C)</th>
                          <th>Humidity (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tunnel.timestamps.map((timestamp, index) => (
                          <tr key={index}>
                            <td>{formatTime(timestamp)}</td>
                            <td>{tunnel.temperature[index]}°C</td>
                            <td>{tunnel.humidity[index]}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quality Checks Timeline */}
      <div className="quality-checks">
        <h4 className="subsection-title">Quality Checks</h4>
        <div className="checks-timeline">
          {timeline.qualityChecks.map((check, index) => (
            <div key={index} className="check-item">
              <div className="check-dot"></div>
              <div className="check-content">
                <span className="check-time">{formatDateTime(check.time)}</span>
                <span className="check-parameter">{check.parameter}</span>
                <span className="check-value">{check.value}</span>
                <span className={`check-status ${check.status}`}>{check.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

ProcessTimeline.propTypes = {
  timeline: PropTypes.shape({
    bunkerHistory: PropTypes.array.isRequired,
    tunnelHistory: PropTypes.array.isRequired,
    qualityChecks: PropTypes.array.isRequired
  }).isRequired
};

// Main Component
function BatchReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  
  const [batchId, setBatchId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Check for batch ID in URL params
    const urlBatchId = searchParams.get('batchId');
    if (urlBatchId) {
      setSearchInput(urlBatchId);
      fetchReport(urlBatchId);
    }
  }, [searchParams]);

  const fetchReport = async (id) => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await ReportsRepo.GetFullBatchReport(id);
      setReportData(data);
      setBatchId(id);
      toast.success('Batch report loaded successfully');
    } catch (error) {
      toast.error('Failed to load batch report');
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchInput.trim()) {
      toast.error('Please enter a Batch ID');
      return;
    }

    // Update URL with batch ID
    router.push(`/batch-reports?batchId=${searchInput}`);
    fetchReport(searchInput);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    toast.info('PDF export feature coming soon');
  };

  const handleShare = () => {
    // Copy report URL to clipboard
    const url = `${window.location.origin}/batch-reports?batchId=${batchId}`;
    navigator.clipboard.writeText(url);
    toast.success('Report link copied to clipboard');
  };

  return (
    <AppLayout title="Batch Reports">
      <div className="reports-container">
        {/* Header Section */}
        <div className="header-section">
          <div className="header-left">
            <h1 className="page-title">Batch Reports</h1>
          </div>

          <div className="search-section">
            <div className="search-wrapper">
              <SearchIcon className="search-icon" />
              <input
                type="text"
                placeholder="Enter Batch ID (e.g., B2024-001)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="search-input"
                disabled={loading}
              />
            </div>
            <button 
              onClick={handleSearch}
              className="search-btn"
              disabled={loading || !searchInput}
            >
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Generating batch report...</p>
          </div>
        ) : reportData ? (
          <div className="report-content">
            {/* Batch Header with Summary */}
            <BatchHeader 
              batchInfo={reportData.batchInfo}
              formulation={reportData.formulation}
              performance={reportData.performance}
            />

            {/* Tab Navigation */}
            <div className="tab-navigation">
              <button 
                className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button 
                className={`tab-btn ${activeTab === 'soaking' ? 'active' : ''}`}
                onClick={() => setActiveTab('soaking')}
              >
                Soaking Details
              </button>
              <button 
                className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
                onClick={() => setActiveTab('timeline')}
              >
                Process Timeline
              </button>
              <button 
                className={`tab-btn ${activeTab === 'quality' ? 'active' : ''}`}
                onClick={() => setActiveTab('quality')}
              >
                Quality Analysis
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-tab">
                  <SoakingReportTable soakingReport={reportData.soakingReport} />
                  <div className="summary-charts">
                    <div className="chart-card">
                      <h4>Moisture Trend</h4>
                      <div className="trend-chart">
                        {/* Combined moisture trend from bunker and tunnel data */}
                        <MiniChart 
                          data={[...reportData.processTimeline.bunkerHistory.flatMap(b => b.moisture)]}
                          type="moisture"
                          color="#3b82f6"
                        />
                      </div>
                    </div>
                    <div className="chart-card">
                      <h4>Temperature Trend</h4>
                      <div className="trend-chart">
                        <MiniChart 
                          data={[...reportData.processTimeline.bunkerHistory.flatMap(b => b.temperature)]}
                          type="temperature"
                          color="#ef4444"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'soaking' && (
                <SoakingReportTable soakingReport={reportData.soakingReport} />
              )}

              {activeTab === 'timeline' && (
                <ProcessTimeline timeline={reportData.processTimeline} />
              )}

              {activeTab === 'quality' && (
                <div className="quality-tab">
                  <div className="quality-metrics">
                    <h4>Quality Metrics</h4>
                    <div className="metrics-grid">
                      <div className="metric-card">
                        <span className="metric-label">Final Moisture</span>
                        <span className="metric-value">{reportData.batchInfo.moisture}%</span>
                        <span className="metric-target">Target: 45%</span>
                      </div>
                      <div className="metric-card">
                        <span className="metric-label">Final Temperature</span>
                        <span className="metric-value">{reportData.batchInfo.temperature}°C</span>
                        <span className="metric-target">Target: 22-25°C</span>
                      </div>
                      <div className="metric-card">
                        <span className="metric-label">Quality Grade</span>
                        <span className="metric-value">{reportData.batchInfo.quality}</span>
                      </div>
                      <div className="metric-card">
                        <span className="metric-label">Yield</span>
                        <span className="metric-value">{reportData.performance.yieldPercentage}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="quality-timeline">
                    <h4>Quality Check History</h4>
                    <div className="checks-list">
                      {reportData.processTimeline.qualityChecks.map((check, index) => (
                        <div key={index} className="check-entry">
                          <span className="check-time">{new Date(check.time).toLocaleString()}</span>
                          <span className="check-param">{check.parameter}</span>
                          <span className="check-value">{check.value}</span>
                          <span className={`check-badge ${check.status}`}>{check.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3 className="empty-title">No Report Generated</h3>
            <p className="empty-description">
              Enter a Batch ID above to generate a comprehensive batch report
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function BatchReports() {
  return (
    <ToastProvider>
      <BatchReportsContent />
    </ToastProvider>
  );
}