"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { ToastProvider, useToast } from "../../components/common/Toaster";
import "../../styles/pages/batch-reports.css";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PropTypes from 'prop-types';

import AssignmentIcon from '@mui/icons-material/Assignment';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
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
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import BatchPredictionIcon from '@mui/icons-material/BatchPrediction';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const ALL_MATERIALS = [
    { id: 1, name: "PADDY STRAW" },
    { id: 2, name: "WHEAT STRAW" },
    { id: 3, name: "BAGASSE" },
    { id: 4, name: "WHEAT BRAN" },
    { id: 5, name: "SUNFLOWER CAKE" },
    { id: 6, name: "O/P - C/M -1 TENI" },
    { id: 7, name: "O/P C/M-2" },
    { id: 8, name: "GYPSUM" },
    { id: 9, name: "UREA" },
    { id: 10, name: "AMMONIUM SULPHATE" },
    { id: 11, name: "SS PHOSPHATE" }
];

const OPERATION_STAGES = [
    { id: 1, name: "SOAKING", apiKey: "soaking" },
    { id: 2, name: "RESOAKING 1", apiKey: "resoaking_one" },
    { id: 3, name: "RESOAKING 2", apiKey: "resoaking_two" },
    { id: 4, name: "PLAIN BUNKER", apiKey: "plain_bunker" },
    { id: 5, name: "LONG HEAP", apiKey: "long_heap" },
    { id: 6, name: "DRY MIXING", apiKey: "dry_mixing" },
    { id: 7, name: "BP 1", apiKey: "bunker_process1" },
    { id: 8, name: "BP 2", apiKey: "bunker_process2" },
    { id: 9, name: "BP 3", apiKey: "bunker_process3" },
    { id: 10, name: "TP", apiKey: "tunnel_process" }
];

const MAIN_STAGES = [
    { id: 1, name: "Soaking", key: "soaking" },
    { id: 2, name: "Unified Process", key: "unified_process" },
    { id: 3, name: "Bunker Process", key: "bunker_process" },
    { id: 4, name: "Tunnel Management", key: "tunnel_process" }
];

function formatWithCommas(value) {
    if (value === "" || value === null || value === undefined) return "";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "";
    return Math.round(num).toLocaleString("en-IN");
}

function parseDateTime(dateTimeStr) {
    if (!dateTimeStr) return { date: '', time: '' };
    try {
        const date = new Date(dateTimeStr);
        if (isNaN(date.getTime())) return { date: '', time: '' };

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return {
            date: `${year}-${month}-${day}`,
            time: `${hours}:${minutes}`
        };
    } catch (error) {
        console.error('Error parsing datetime:', error);
        return { date: '', time: '' };
    }
}

function calculateTotalHours(startDateTime, endDateTime) {
    if (!startDateTime || !endDateTime) return '';
    try {
        const start = new Date(startDateTime);
        const end = new Date(endDateTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

        const diffHours = (end - start) / (1000 * 60 * 60);
        return diffHours.toFixed(1);
    } catch (error) {
        console.error('Error calculating hours:', error);
        return '';
    }
}

function findMatchingEntry(entries, materialName) {
    if (!entries || !Array.isArray(entries)) return null;
    return entries.find(entry =>
        entry.name && entry.name.toUpperCase() === materialName
    );
}

function StageStatus({ batchData }) {
    if (!batchData) return null;

    const { current_stage, status } = batchData;

    if (status === "completed") {
        return (
            <div className="stage-status-section">
                <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '15px' }}>
                    {/* <TimelineIcon style={{ marginRight: '8px', verticalAlign: 'middle' }} /> */}
                    Batch Progress Status
                </h3>
                <div className="status-card completed">
                    <div className="status-header">
                        {/* <CheckCircleIcon style={{ color: '#10b981', fontSize: '24px' }} /> */}
                        <span className="status-badge completed">Completed</span>
                    </div>
                    <p className="status-message">This batch has been completed successfully</p>
                </div>
            </div>
        );
    }

    const currentStageIndex = MAIN_STAGES.findIndex(
        stage => stage.name.toLowerCase() === current_stage?.toLowerCase()
    );

    const previousStage = currentStageIndex > 0 ? MAIN_STAGES[currentStageIndex - 1] : null;
    const nextStage = currentStageIndex < MAIN_STAGES.length - 1 ? MAIN_STAGES[currentStageIndex + 1] : null;

    return (
        <div className="stage-status-section">
            <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '15px' }}>
                <TimelineIcon style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Batch Progress Status
            </h3>

            <div className="status-container">
                {/* Current Stage */}
                <div className="status-card current">
                    <div className="status-header">
                        {/* <TimerIcon style={{ color: '#3b82f6', fontSize: '24px' }} /> */}
                        <span className="status-badge in-progress">In Progress</span>
                    </div>
                    <div className="stage-info">
                        <span className="stage-label">Current Stage:</span>
                        <span className="stage-value current">{current_stage || 'Not started'}</span>
                    </div>
                </div>

                {/* Previous and Next Stages */}
                {(previousStage || nextStage) && (
                    <div className="stage-navigation">
                        {previousStage && (
                            <div className="stage-card previous">
                                {/* <ArrowBackIcon className="nav-icon" /> */}
                                <div className="stage-details">
                                    <span className="stage-label">Previous Stage</span>
                                    <span className="stage-name">{previousStage.name}</span>
                                </div>
                            </div>
                        )}

                        {nextStage && (
                            <div className="stage-card next">
                                <div className="stage-details">
                                    <span className="stage-label">Next Stage</span>
                                    <span className="stage-name">{nextStage.name}</span>
                                </div>
                                {/* <ArrowForwardIcon className="nav-icon" /> */}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style jsx>{`
        .stage-status-section {
          margin-bottom: 30px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .status-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .status-card {
          padding: 16px;
          border-radius: 6px;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .status-card.completed {
          border-left: 4px solid #10b981;
          background: #f0fdf4;
        }

        .status-card.current {
          border-left: 4px solid #3b82f6;
        }

        .status-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .status-badge.completed {
          background: #10b981;
          color: white;
        }

        .status-badge.in-progress {
          background: #3b82f6;
          color: white;
        }

        .status-message {
          color: #374151;
          margin: 0;
          font-size: 0.95rem;
        }

        .stage-info {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1rem;
        }

        .stage-label {
          color: #64748b;
          font-weight: 500;
          min-width: 100px;
        }

        .stage-value.current {
          font-weight: 600;
          color: #3b82f6;
          font-size: 1.1rem;
        }

        .stage-navigation {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-top: 10px;
        }

        .stage-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .stage-card.previous {
          border-left: 3px solid #f59e0b;
        }

        .stage-card.next {
          border-right: 3px solid #8b5cf6;
        }

        .stage-details {
          flex: 1;
        }

        .stage-name {
          display: block;
          font-weight: 600;
          color: #1e293b;
          margin-top: 2px;
        }

        .nav-icon {
          color: #94a3b8;
          font-size: 20px;
        }

        @media (max-width: 768px) {
          .stage-navigation {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </div>
    );
}

StageStatus.propTypes = {
    batchData: PropTypes.object
};

function FormulationTable({ entries = [] }) {
    const readOnlyStyle = { background: "#f0f4f8", cursor: "not-allowed" };

    const totalCellStyle = {
        border: "1px solid",
        fontWeight: "bold",
        padding: "2px 3px",
        textAlign: "center",
        fontSize: "0.92em",
    };

    const totals = (entries || []).reduce((acc, entry) => {
        acc.totalDryWt += entry.dry_weight || 0;
        acc.totalN2 += entry.nitrogen_total || 0;
        acc.totalAsh += entry.ash_total || 0;
        return acc;
    }, { totalDryWt: 0, totalN2: 0, totalAsh: 0 });

    return (
        <div className="formulation-table-container">
            <h3 className="table-title">Raw Materials Formulation</h3>
            <div className="table-wrapper">
                <table className="materials-table">
                    <thead>
                        <tr>
                            <th>S.NO</th>
                            <th>RAW MATERIALS</th>
                            <th>FRESH WEIGHT</th>
                            <th>MOIST %</th>
                            <th>DRY WT</th>
                            <th>N2 %</th>
                            <th>TOTAL N2</th>
                            <th>ASH %</th>
                            <th>TOTAL ASH</th>
                            <th>%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ALL_MATERIALS.map((material) => {
                            const entry = findMatchingEntry(entries, material.name);

                            return (
                                <tr key={material.id}>
                                    <td>{material.id}</td>
                                    <td>{material.name}</td>
                                    <td>
                                        <input
                                            type="text"
                                            value={entry?.wet_weight ? formatWithCommas(entry.wet_weight) : "-"}
                                            readOnly
                                            className="table-input"
                                            placeholder="-"
                                            style={readOnlyStyle}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={entry?.moisture_percent || "-"}
                                            readOnly
                                            className="table-input"
                                            placeholder="-"
                                            style={readOnlyStyle}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={entry?.dry_weight ? formatWithCommas(entry.dry_weight) : "-"}
                                            readOnly
                                            className="table-input"
                                            placeholder="-"
                                            style={readOnlyStyle}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={entry?.nitrogen_percent || "-"}
                                            readOnly
                                            className="table-input"
                                            placeholder="-"
                                            style={readOnlyStyle}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={entry?.nitrogen_total ? formatWithCommas(entry.nitrogen_total) : "-"}
                                            readOnly
                                            className="table-input"
                                            placeholder="-"
                                            style={readOnlyStyle}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={entry?.ash_percent || "-"}
                                            readOnly
                                            className="table-input"
                                            placeholder="-"
                                            style={readOnlyStyle}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={entry?.ash_total ? formatWithCommas(entry.ash_total) : "-"}
                                            readOnly
                                            className="table-input"
                                            placeholder="-"
                                            style={readOnlyStyle}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={entry?.total_percent || "-"}
                                            readOnly
                                            className="table-input"
                                            placeholder="-"
                                            style={readOnlyStyle}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                        <tr className="totals-row">
                            <td colSpan={4} style={{ textAlign: "center", fontWeight: "bolder", color: "black" }}>TOTAL</td>
                            <td style={totalCellStyle}>
                                {totals.totalDryWt > 0 ? formatWithCommas(totals.totalDryWt) : ""}
                            </td>
                            <td></td>
                            <td style={totalCellStyle}>
                                {totals.totalN2 > 0 ? formatWithCommas(totals.totalN2) : ""}
                            </td>
                            <td></td>
                            <td style={totalCellStyle}>
                                {totals.totalAsh > 0 ? formatWithCommas(totals.totalAsh) : ""}
                            </td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Summary Ratios */}
            <div className="totals-container">
                <div className="total-item">
                    <span className="total-label">C/M % =</span>
                    <input
                        type="text"
                        readOnly
                        value={entries[0]?.cm_ratio || ""}
                        className="total-input"
                        placeholder="0.00"
                        style={readOnlyStyle}
                    />
                </div>
                <div className="total-item">
                    <span className="total-label">N2 =</span>
                    <input
                        type="text"
                        readOnly
                        value={entries[0]?.n2_ratio || ""}
                        className="total-input"
                        placeholder="0.00"
                        style={readOnlyStyle}
                    />
                </div>
                <div className="total-item">
                    <span className="total-label">ASH =</span>
                    <input
                        type="text"
                        readOnly
                        value={entries[0]?.ash_ratio || ""}
                        className="total-input"
                        placeholder="0.00"
                        style={readOnlyStyle}
                    />
                </div>
                <br />
                <div className="total-item">
                    <span className="total-label">C:N =</span>
                    <input
                        type="text"
                        readOnly
                        value={entries[0]?.cn_ratio || ""}
                        className="total-input"
                        placeholder="0.0"
                        style={readOnlyStyle}
                    />
                </div>
            </div>
        </div>
    );
}

FormulationTable.propTypes = {
    entries: PropTypes.array
};

function OperationTimelineTable({ operationData = {} }) {
    const readOnlyStyle = { background: "#f0f4f8", cursor: "not-allowed" };

    const totalCellStyle = {
        border: "1px solid",
        fontWeight: "bold",
        padding: "2px 3px",
        textAlign: "center",
        fontSize: "0.92em",
    };

    const totals = Object.values(operationData).reduce((acc, op) => {
        acc.totalOperation += (op.operation_hours || 0);
        acc.totalResting += (op.rest_hours || 0);
        return acc;
    }, { totalOperation: 0, totalResting: 0 });

    // const getRemarks = (stageName, operation) => {
    //   if (!operation) return "-";

    //   if (operation.operation_hours === 0 && operation.rest_hours === 0) {
    //     return "Not started";
    //   } else if (operation.operation_hours > 0 && operation.rest_hours > 0) {
    //     return "Completed";
    //   }
    //   return "-";
    // };

    return (
        <div className="formulation-table-container" style={{ marginTop: "30px" }}>
            <h3 className="table-title">Operation Timeline</h3>
            <div className="table-wrapper">
                <table className="materials-table">
                    <thead>
                        <tr>
                            <th>S.NO</th>
                            <th>OPERATION STAGE</th>
                            <th>OPERATION TIME (hrs)</th>
                            <th>RESTING TIME (hrs)</th>
                            <th>REMARKS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {OPERATION_STAGES.map((stage) => {
                            const operation = operationData[stage.apiKey] || {
                                operation_hours: 0,
                                rest_hours: 0
                            };

                            return (
                                <tr key={stage.id}>
                                    <td>{stage.id}</td>
                                    <td>{stage.name}</td>
                                    <td>
                                        <input
                                            type="text"
                                            value={operation.operation_hours?.toFixed(1) || "0.0"}
                                            readOnly
                                            className="table-input"
                                            placeholder="-"
                                            style={readOnlyStyle}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={operation.rest_hours?.toFixed(1) || "0.0"}
                                            readOnly
                                            className="table-input"
                                            placeholder="-"
                                            style={readOnlyStyle}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            // value={getRemarks(stage.name, operation)}
                                            readOnly
                                            className="table-input"
                                            placeholder="-"
                                            style={readOnlyStyle}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                        <tr className="totals-row">
                            <td colSpan={2} style={{ textAlign: "center", fontWeight: "bolder", color: "black" }}>TOTAL</td>
                            <td style={totalCellStyle}>
                                {totals.totalOperation > 0 ? totals.totalOperation.toFixed(1) : "0.0"}
                            </td>
                            <td style={totalCellStyle}>
                                {totals.totalResting > 0 ? totals.totalResting.toFixed(1) : "0.0"}
                            </td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

OperationTimelineTable.propTypes = {
    operationData: PropTypes.object
};

function BatchSummary({ batchData }) {
    if (!batchData) return null;

    const startDateTime = batchData.start_date || batchData.start_time;
    const plannedDateTime = batchData.planned_comp_date || batchData.planned_comp_time;

    const { date: startDate, time: startTime } = parseDateTime(startDateTime);
    const { date: plannedDate, time: plannedTime } = parseDateTime(plannedDateTime);

    const totalHours = calculateTotalHours(startDateTime, plannedDateTime);

    const formatDisplayDateTime = (dateStr, timeStr) => {
        if (!dateStr) return 'Not set';
        return `${dateStr} ${timeStr || ''}`;
    };

    return (
        <div className="batch-summary-section">
            <h2 className="section-title">Batch Summary</h2>
            <div className="batch-info-grid">
                <div className="form-group">
                    <label className="form-label">Batch Number</label>
                    <input
                        type="text"
                        value={batchData.batch_number || ''}
                        readOnly
                        className="form-input"
                        style={{ background: "#f0f4f8" }}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                        type="text"
                        value={formatDisplayDateTime(startDate, startTime)}
                        readOnly
                        className="form-input"
                        style={{ background: "#f0f4f8" }}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Planned Completion</label>
                    <input
                        type="text"
                        value={formatDisplayDateTime(plannedDate, plannedTime)}
                        readOnly
                        className="form-input"
                        style={{ background: "#f0f4f8" }}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Total Hours</label>
                    <input
                        type="text"
                        value={totalHours ? `${totalHours} hrs` : 'Not calculated'}
                        readOnly
                        className="form-input"
                        style={{ background: "#f0f4f8" }}
                    />
                </div>
            </div>

            {batchData.remarks && (
                <div className="comments-group">
                    <label className="form-label">Remarks</label>
                    <textarea
                        value={batchData.remarks}
                        readOnly
                        className="form-textarea"
                        rows="2"
                        style={{ background: "#f0f4f8" }}
                    />
                </div>
            )}
        </div>
    );
}

BatchSummary.propTypes = {
    batchData: PropTypes.object
};

export default function BatchReportsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const toast = useToast();
    const reportContentRef = useRef(null);

    const [batchId, setBatchId] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [batchData, setBatchData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const urlBatchId = searchParams.get('batchId');
        const urlBatchName = searchParams.get('name');

        if (urlBatchId) {
            setSearchInput(urlBatchId);
            if (urlBatchName) {
                console.log('Loading batch:', urlBatchName);
            }
            fetchBatchReport(urlBatchId);
        }
    }, [searchParams]);

    const fetchBatchReport = async (id) => {
        if (!id) return;

        try {
            setLoading(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;

            const batchResponse = await fetch(`${apiUrl}/batches/${id}`);
            let batchInfo = {};

            if (batchResponse.ok) {
                const batchResult = await batchResponse.json();
                batchInfo = batchResult.data || batchResult;
            }

            const timelineResponse = await fetch(`${apiUrl}/batches/reports/${id}`);
            let operationTimeline = {};

            if (timelineResponse.ok) {
                const timelineResult = await timelineResponse.json();
                if (timelineResult.status && timelineResult.data) {
                    operationTimeline = timelineResult.data;
                }
            }

            const combinedData = {
                ...batchInfo,
                operation_timeline: operationTimeline,
                formulation_entries: batchInfo.formulation_entries || []
            };

            setBatchData(combinedData);
            setBatchId(id);

            if (batchInfo.batch_number) {
                setSearchInput(batchInfo.batch_number);
            }

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
            toast.error('Please enter a Batch ID or Number');
            return;
        }

        const isNumeric = /^\d+$/.test(searchInput.trim());

        if (isNumeric) {
            router.push(`/batch-reports?batchId=${searchInput}`);
            fetchBatchReport(searchInput);
        } else {
            toast.info('Searching by batch number...');
            router.push(`/batch-reports?batchId=${searchInput}`);
            fetchBatchReport(searchInput);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('Please allow pop-ups to print');
            return;
        }

        const content = document.getElementById('report-content')?.innerHTML || '';

        printWindow.document.write(`
      <html>
        <head>
          <title>Batch Report - ${batchData?.batch_number || batchId}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .section-title { margin-top: 20px; margin-bottom: 10px; }
            .batch-info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
            .form-group { display: flex; flex-direction: column; }
            .form-label { font-weight: bold; margin-bottom: 5px; }
            .form-input { padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
            .table-wrapper { overflow-x: auto; }
            .materials-table { width: 100%; border-collapse: collapse; font-size: 12px; }
            .materials-table th { background-color: #f1f5f9; padding: 6px; }
            .materials-table td { padding: 4px; border-bottom: 1px solid #eee; }
            .totals-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 20px; }
            .total-item { display: flex; align-items: center; gap: 10px; }
            .total-label { font-weight: bold; }
            .total-input { padding: 4px; border: 1px solid #ddd; border-radius: 4px; }
            .table-input { width: 100%; padding: 2px 4px; border: 1px solid #ddd; border-radius: 2px; }
          </style>
        </head>
        <body>
          <h1>Batch Report - ${batchData?.batch_number || batchId}</h1>
          <div>${content}</div>
        </body>
      </html>
    `);

        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    // Export to PDF
    const handleExportPDF = () => {
        try {
            if (!batchData) return;

            const doc = new jsPDF();
            let yPos = 20;

            // Title
            doc.setFontSize(16);
            doc.text(`Batch Report - ${batchData.batch_number || batchId}`, 14, yPos);
            yPos += 10;

            // Batch Summary
            doc.setFontSize(14);
            doc.text('Batch Summary', 14, yPos);
            yPos += 7;

            doc.setFontSize(10);
            const startDate = batchData.start_date || batchData.start_time;
            const plannedDate = batchData.planned_comp_date || batchData.planned_comp_time;
            const totalHours = calculateTotalHours(startDate, plannedDate);

            doc.text(`Batch Number: ${batchData.batch_number || ''}`, 14, yPos);
            yPos += 6;
            doc.text(`Start Date: ${startDate ? new Date(startDate).toLocaleString() : 'Not set'}`, 14, yPos);
            yPos += 6;
            doc.text(`Planned Completion: ${plannedDate ? new Date(plannedDate).toLocaleString() : 'Not set'}`, 14, yPos);
            yPos += 6;
            doc.text(`Total Hours: ${totalHours || 'Not calculated'}`, 14, yPos);
            yPos += 6;

            if (batchData.remarks) {
                doc.text(`Remarks: ${batchData.remarks}`, 14, yPos);
                yPos += 10;
            } else {
                yPos += 4;
            }

            // Formulation Table
            doc.setFontSize(14);
            doc.text('Raw Materials Formulation', 14, yPos);
            yPos += 5;

            const formulationColumn = ["S.No", "Material", "Fresh Wt", "Moist %", "Dry Wt", "N2 %", "Total N2", "Ash %", "Total Ash", "%"];
            const formulationRows = [];

            ALL_MATERIALS.forEach((material) => {
                const entry = findMatchingEntry(batchData.formulation_entries, material.name);
                formulationRows.push([
                    material.id,
                    material.name,
                    entry?.wet_weight || '-',
                    entry?.moisture_percent || '-',
                    entry?.dry_weight || '-',
                    entry?.nitrogen_percent || '-',
                    entry?.nitrogen_total || '-',
                    entry?.ash_percent || '-',
                    entry?.ash_total || '-',
                    entry?.total_percent || '-'
                ]);
            });

            doc.autoTable({
                head: [formulationColumn],
                body: formulationRows,
                startY: yPos + 5,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 128, 185], textColor: 255 }
            });

            // Operation Timeline Table
            yPos = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(14);
            doc.text('Operation Timeline', 14, yPos);

            const operationColumn = ["S.No", "Operation Stage", "Operation Time", "Resting Time", "Remarks"];
            const operationRows = [];

            OPERATION_STAGES.forEach((stage) => {
                const operation = batchData.operation_timeline?.[stage.apiKey] || {
                    operation_hours: 0,
                    rest_hours: 0
                };

                let remarks = "-";
                if (operation.operation_hours === 0 && operation.rest_hours === 0) {
                    remarks = "Not started";
                } else if (operation.operation_hours > 0 && operation.rest_hours === 0) {
                    remarks = "In progress";
                } else if (operation.operation_hours > 0 && operation.rest_hours > 0) {
                    remarks = "Completed";
                }

                operationRows.push([
                    stage.id,
                    stage.name,
                    operation.operation_hours?.toFixed(1) || '0.0',
                    operation.rest_hours?.toFixed(1) || '0.0',
                    remarks
                ]);
            });

            doc.autoTable({
                head: [operationColumn],
                body: operationRows,
                startY: yPos + 5,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 128, 185], textColor: 255 }
            });

            doc.save(`batch-report-${batchData.batch_number || batchId}.pdf`);
            toast.success('PDF exported successfully');
        } catch (error) {
            console.error('PDF export error:', error);
            toast.error('Failed to export PDF');
        }
    };

    // Export to Excel
    const handleExportExcel = () => {
        try {
            if (!batchData) return;

            const wb = XLSX.utils.book_new();

            // Batch Summary Sheet
            const startDate = batchData.start_date || batchData.start_time;
            const plannedDate = batchData.planned_comp_date || batchData.planned_comp_time;
            const totalHours = calculateTotalHours(startDate, plannedDate);

            const summaryData = [
                ['Batch Summary'],
                ['Batch Number', batchData.batch_number || ''],
                ['Start Date', startDate ? new Date(startDate).toLocaleString() : 'Not set'],
                ['Planned Completion', plannedDate ? new Date(plannedDate).toLocaleString() : 'Not set'],
                ['Total Hours', totalHours || 'Not calculated'],
                ['Remarks', batchData.remarks || '']
            ];

            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

            // Formulation Sheet 
            const formulationData = [
                ['S.No', 'Material', 'Fresh Weight', 'Moist %', 'Dry Wt', 'N2 %', 'Total N2', 'Ash %', 'Total Ash', '%'],
                ...ALL_MATERIALS.map((material) => {
                    const entry = findMatchingEntry(batchData.formulation_entries, material.name);
                    return [
                        material.id,
                        material.name,
                        entry?.wet_weight || '-',
                        entry?.moisture_percent || '-',
                        entry?.dry_weight || '-',
                        entry?.nitrogen_percent || '-',
                        entry?.nitrogen_total || '-',
                        entry?.ash_percent || '-',
                        entry?.ash_total || '-',
                        entry?.total_percent || '-'
                    ];
                })
            ];

            const formulationSheet = XLSX.utils.aoa_to_sheet(formulationData);
            XLSX.utils.book_append_sheet(wb, formulationSheet, 'Formulation');

            // Operation Timeline Sheet
            const operationData = [
                ['S.No', 'Operation Stage', 'Operation Time (hrs)', 'Resting Time (hrs)', 'Remarks'],
                ...OPERATION_STAGES.map((stage) => {
                    const operation = batchData.operation_timeline?.[stage.apiKey] || {
                        operation_hours: 0,
                        rest_hours: 0
                    };

                    let remarks = "-";
                    if (operation.operation_hours === 0 && operation.rest_hours === 0) {
                        remarks = "Not started";
                    } else if (operation.operation_hours > 0 && operation.rest_hours === 0) {
                        remarks = "In progress";
                    } else if (operation.operation_hours > 0 && operation.rest_hours > 0) {
                        remarks = "Completed";
                    }

                    return [
                        stage.id,
                        stage.name,
                        operation.operation_hours?.toFixed(1) || '0.0',
                        operation.rest_hours?.toFixed(1) || '0.0',
                        remarks
                    ];
                })
            ];

            const operationSheet = XLSX.utils.aoa_to_sheet(operationData);
            XLSX.utils.book_append_sheet(wb, operationSheet, 'Operation Timeline');

            XLSX.writeFile(wb, `batch-report-${batchData.batch_number || batchId}.xlsx`);
            toast.success('Excel exported successfully');
        } catch (error) {
            console.error('Excel export error:', error);
            toast.error('Failed to export Excel');
        }
    };

    return (
        <AppLayout title="Batch Reports">
            <div className="add-batch-card">
                <form onSubmit={(e) => e.preventDefault()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h1 className="section-title" style={{ marginBottom: 0, borderBottom: 'none' }}>Batch Reports</h1>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px' }}>
                                <SearchIcon style={{ margin: '0 5px', color: '#666', fontSize: '20px' }} />
                                <input
                                    type="text"
                                    placeholder="Enter Batch ID or Number"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    style={{ border: 'none', outline: 'none', padding: '8px', width: '250px' }}
                                    disabled={loading}
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                className="btn-primary"
                                style={{ padding: '8px 20px' }}
                                disabled={loading || !searchInput}
                            >
                                {loading ? 'Loading...' : 'Generate'}
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {batchData && (
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <button onClick={handlePrint} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <PrintIcon /> Print
                            </button>
                            {/* <button onClick={handleExportPDF} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <PictureAsPdfIcon /> PDF
              </button> */}
                            {/* <button onClick={handleExportExcel} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <TableChartIcon /> Excel
              </button> */}
                        </div>
                    )}

                    {loading && (
                        <div className="loading-overlay">
                            <div className="loading-spinner"></div>
                            <p>Generating batch report...</p>
                        </div>
                    )}

                    {!loading && batchData ? (
                        <div id="report-content" ref={reportContentRef}>
                            <BatchSummary batchData={batchData} />
                            <StageStatus batchData={batchData} />
                            <FormulationTable entries={batchData.formulation_entries || []} />
                            <OperationTimelineTable operationData={batchData.operation_timeline || {}} />
                        </div>
                    ) : !loading && !batchData && (
                        <div style={{ textAlign: 'center', padding: '50px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
                            <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>No Report Generated</h3>
                            <p style={{ color: '#64748b' }}>
                                Enter a Batch ID or Number above to generate a comprehensive batch report
                            </p>
                        </div>
                    )}
                </form>
            </div>

            <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .loading-spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
      `}</style>
        </AppLayout>
    );
}

