"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { ToastProvider, useToast } from "../../components/common/Toaster";
import "../../styles/pages/unified-platform.css";

import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';

const MATERIAL_TYPES = {
    'BAGASSE': 'BAGASSE',
    'WHEAT STRAW': 'WHEAT',
    'PADDY STRAW': 'PADDY'
};

const MATERIAL_DISPLAY_NAMES = {
    'BAGASSE': 'Bagasse',
    'WHEAT': 'Wheat Straw',
    'PADDY': 'Paddy Straw'
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const API_ENDPOINT = `${API_BASE_URL}/tunnel-process-logs`;
const API_FETCH_ENDPOINT = `${API_BASE_URL}/tunnel-process-logs/batch`;
const BATCH_FETCH_ENDPOINT = `${API_BASE_URL}/batches`;

const STAGE_NAMES = ["Tunnel Process"];

// ─── Temperature Reading Helpers ─────────────────────────────────────────────

const createEmptyTempReading = () => ({
    id: Date.now() + Math.random(),
    date: '',
    time: '',
    sensor1: '',
    sensor2: '',
    sensor3: '',
    sensor4: ''
});

const calcAvgTemperature = (readings) => {
    if (!readings || readings.length === 0) return '';
    const allValues = [];
    readings.forEach(r => {
        [r.sensor1, r.sensor2, r.sensor3, r.sensor4].forEach(v => {
            const num = parseFloat(v);
            if (!isNaN(num)) allValues.push(num);
        });
    });
    if (allValues.length === 0) return '';
    return (allValues.reduce((a, b) => a + b, 0) / allValues.length).toFixed(1);
};

// ─── Substage / Batch Factories ───────────────────────────────────────────────

const createEmptySubstage = (name) => ({
    name,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    totalHours: '',
    moisture: '',
    temperature: '',
    temperatureReadings: [],
    remarks: ''
});

const createEmptyBatch = (batchNumber, materials = [], batchId = null) => {
    const materialTypes = materials.map(m => MATERIAL_TYPES[m]).filter(Boolean);
    const materialDisplayNames = materialTypes.map(t => MATERIAL_DISPLAY_NAMES[t]);
    return {
        id: batchId || Date.now(),
        batchNumber,
        materialTypes,
        materialDisplayNames,
        batchData: null,
        existingRecords: {},
        substages: STAGE_NAMES.map(name => createEmptySubstage(name))
    };
};

const parseDateTime = (datetime) => {
    if (!datetime) return { date: '', time: '' };
    try {
        const date = new Date(datetime);
        if (isNaN(date.getTime())) return { date: '', time: '' };
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
    } catch {
        return { date: '', time: '' };
    }
};

const combineDateTime = (date, time) => {
    if (!date || !time) return null;
    try {
        const datetime = new Date(`${date}T${time}:00`);
        if (isNaN(datetime.getTime())) return null;
        return datetime.toISOString();
    } catch {
        return null;
    }
};

const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return null;
    try {
        const date = new Date(dateTimeStr);
        if (isNaN(date.getTime())) return null;
        const y = date.getFullYear();
        const mo = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const mi = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');
        return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
    } catch {
        return null;
    }
};

const hasCompleteData = (substages) => {
    const hasAny = substages.some(s =>
        s.startDate || s.startTime || s.endDate || s.endTime ||
        s.moisture || s.temperature || s.remarks
    );
    if (!hasAny) return false;
    for (const s of substages) {
        if (s.startDate && !s.startTime) return false;
        if (s.startTime && !s.startDate) return false;
        if (s.endDate && !s.endTime) return false;
        if (s.endTime && !s.endDate) return false;
    }
    return true;
};

// Updated to use temp_list instead of temperature_readings
const convertToApiPayload = (batch, materialType, isCompleted) => {
    const tunnelProcess = batch.substages[0] || createEmptySubstage("Tunnel Process");

    const start_time = tunnelProcess.startDate && tunnelProcess.startTime
        ? combineDateTime(tunnelProcess.startDate, tunnelProcess.startTime) : null;
    const end_time = tunnelProcess.endDate && tunnelProcess.endTime
        ? combineDateTime(tunnelProcess.endDate, tunnelProcess.endTime) : null;

    const avgTemp = calcAvgTemperature(tunnelProcess.temperatureReadings);
    const tempValue = avgTemp !== ''
        ? parseFloat(avgTemp)
        : tunnelProcess.temperature ? parseFloat(tunnelProcess.temperature) : null;

    const payload = {
        batch_id: batch.id,
        start_time: formatDateTime(start_time),
        end_time: formatDateTime(end_time),
        straw_type: materialType,
        iscompleted: isCompleted,
        tunnel_process: {
            start_time: formatDateTime(start_time),
            end_time: formatDateTime(end_time),
            moisture: tunnelProcess.moisture ? parseFloat(tunnelProcess.moisture) : null,
            temperature: tempValue,
            remarks: tunnelProcess.remarks || null,
            // Changed from temperature_readings to temp_list
            temp_list: tunnelProcess.temperatureReadings?.length > 0
                ? tunnelProcess.temperatureReadings.map(r => {
                    // Combine date and time into ISO format for date_time
                    const dateTimeStr = r.date && r.time 
                        ? combineDateTime(r.date, r.time)
                        : null;
                    
                    // Calculate row average
                    const rowVals = [r.sensor1, r.sensor2, r.sensor3, r.sensor4]
                        .map(v => parseFloat(v))
                        .filter(v => !isNaN(v));
                    const rowAvg = rowVals.length > 0
                        ? (rowVals.reduce((a, b) => a + b, 0) / rowVals.length)
                        : null;

                    return {
                        date_time: dateTimeStr,
                        sensor1: r.sensor1 ? parseFloat(r.sensor1) : null,
                        sensor2: r.sensor2 ? parseFloat(r.sensor2) : null,
                        sensor3: r.sensor3 ? parseFloat(r.sensor3) : null,
                        sensor4: r.sensor4 ? parseFloat(r.sensor4) : null,
                        row_avg: rowAvg
                    };
                })
                : undefined
        }
    };

    // Clean up null/undefined values
    Object.keys(payload).forEach(key => {
        if (payload[key] === null || payload[key] === undefined) {
            delete payload[key];
        } else if (typeof payload[key] === 'object' && payload[key] !== null
            && key !== 'batch_id' && key !== 'straw_type' && key !== 'iscompleted') {
            Object.keys(payload[key]).forEach(subKey => {
                if (payload[key][subKey] === null || payload[key][subKey] === undefined || 
                    (Array.isArray(payload[key][subKey]) && payload[key][subKey].length === 0)) {
                    delete payload[key][subKey];
                }
            });
            if (Object.keys(payload[key]).length === 0) delete payload[key];
        }
    });

    return payload;
};

// Updated to handle temp_list from API response
const convertApiResponseToUI = (apiData, batch) => {
    if (!apiData || !Array.isArray(apiData) || apiData.length === 0) return batch;

    const firstItem = apiData[0];
    if (firstItem && batch.substages[0]) {
        const tunnelData = firstItem.tunnel_process || firstItem;
        const sub = batch.substages[0];

        if (tunnelData.start_time || firstItem.start_time) {
            const { date, time } = parseDateTime(tunnelData.start_time || firstItem.start_time);
            sub.startDate = date; sub.startTime = time;
        }
        if (tunnelData.end_time || firstItem.end_time) {
            const { date, time } = parseDateTime(tunnelData.end_time || firstItem.end_time);
            sub.endDate = date; sub.endTime = time;
        }
        if (sub.startDate && sub.startTime && sub.endDate && sub.endTime) {
            const start = new Date(`${sub.startDate}T${sub.startTime}`);
            const end = new Date(`${sub.endDate}T${sub.endTime}`);
            sub.totalHours = ((end - start) / 3_600_000).toFixed(1);
        } else if (tunnelData.duration_hours != null) {
            sub.totalHours = tunnelData.duration_hours.toString();
        }
        if (tunnelData.moisture != null) sub.moisture = tunnelData.moisture.toString();
        if (tunnelData.temperature != null) sub.temperature = tunnelData.temperature.toString();
        if (tunnelData.avg_temp != null) sub.temperature = tunnelData.avg_temp.toString();
        if (tunnelData.remarks) sub.remarks = tunnelData.remarks;

        // Handle temp_list from API response (changed from temperature_readings)
        if (tunnelData.temp_list && Array.isArray(tunnelData.temp_list)) {
            sub.temperatureReadings = tunnelData.temp_list.map(r => {
                // Parse date_time into date and time components
                let date = '', time = '';
                if (r.date_time) {
                    const parsed = parseDateTime(r.date_time);
                    date = parsed.date;
                    time = parsed.time;
                }
                
                return {
                    id: Date.now() + Math.random(),
                    date: date,
                    time: time,
                    sensor1: r.sensor1 != null ? r.sensor1.toString() : '',
                    sensor2: r.sensor2 != null ? r.sensor2.toString() : '',
                    sensor3: r.sensor3 != null ? r.sensor3.toString() : '',
                    sensor4: r.sensor4 != null ? r.sensor4.toString() : ''
                };
            });
        }
    }

    return batch;
};

const fetchBatchData = async (batchId) => {
    try {
        const response = await fetch(`${API_FETCH_ENDPOINT}/${batchId}`);
        if (!response.ok) {
            if (response.status === 404) return { success: true, data: [] };
            throw new Error(`Failed to fetch tunnel data: ${response.status}`);
        }
        const responseData = await response.json();
        if (responseData.success && responseData.data) {
            if (responseData.data.items && Array.isArray(responseData.data.items))
                return { success: true, data: responseData.data.items };
            if (Array.isArray(responseData.data))
                return { success: true, data: responseData.data };
        }
        return { success: true, data: [] };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

const sendToApi = async (payload, materialType, displayName) => {
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            let errorMessage = `API error: ${response.status}`;
            if (errorData.detail) {
                if (typeof errorData.detail === 'string') errorMessage = errorData.detail;
                else if (Array.isArray(errorData.detail)) errorMessage = errorData.detail.map(e => e.msg).join(', ');
                else errorMessage = JSON.stringify(errorData.detail);
            }
            throw new Error(errorMessage);
        }
        const result = await response.json();
        return { success: true, data: result, materialType, displayName };
    } catch (error) {
        return { success: false, error: error.message, materialType, displayName };
    }
};

const completeBatch = async (batchId) => {
    try {
        const now = new Date();
        const y = now.getFullYear();
        const mo = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const h = String(now.getHours()).padStart(2, '0');
        const mi = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const currentDateTime = `${y}-${mo}-${d}T${h}:${mi}:${s}`;

        const response = await fetch(`${BATCH_FETCH_ENDPOINT}/${batchId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                planned_comp_date: currentDateTime,
                planned_comp_time: currentDateTime,
                status: "completed",
                current_stage: "completed"
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            let errorMessage = `API error: ${response.status}`;
            if (errorData.detail) {
                if (typeof errorData.detail === 'string') errorMessage = errorData.detail;
                else if (Array.isArray(errorData.detail)) errorMessage = errorData.detail.map(e => e.msg).join(', ');
                else errorMessage = JSON.stringify(errorData.detail);
            }
            throw new Error(errorMessage);
        }
        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ─── Inline styles for sensor sub-table ──────────────────────────────────────

const thStyle = {
    padding: '7px 10px', textAlign: 'center', fontWeight: 600,
    fontSize: '11px', color: '#4a5568', borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap'
};
const tdStyle = {
    padding: '5px 8px', textAlign: 'center',
    borderBottom: '1px solid #edf2f7', verticalAlign: 'middle'
};
const inputStyle = {
    border: '1px solid #e2e8f0', borderRadius: '4px',
    padding: '3px 6px', fontSize: '12px', background: '#fff', outline: 'none'
};

// ─── Temperature Readings Panel ───────────────────────────────────────────────

const TemperatureReadingsPanel = ({ substage, substageIndex, onUpdate, readOnly }) => {
    const readings = substage.temperatureReadings || [];

    const addReading = () => {
        onUpdate(substageIndex, 'temperatureReadings', [...readings, createEmptyTempReading()]);
    };

    const removeReading = (id) => {
        onUpdate(substageIndex, 'temperatureReadings', readings.filter(r => r.id !== id));
    };

    const updateReading = (id, field, value) => {
        onUpdate(substageIndex, 'temperatureReadings',
            readings.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const avg = calcAvgTemperature(readings);

    return (
        <tr className="temp-readings-row">
            <td colSpan="9" style={{ padding: 0, background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <div style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ThermostatIcon style={{ fontSize: '16px', color: '#e53e3e' }} />
                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#2d3748' }}>
                                Sensor Temperature Readings — {substage.name}
                            </span>
                            {avg !== '' && (
                                <span style={{
                                    background: '#fed7d7', color: '#c53030', padding: '2px 10px',
                                    borderRadius: '12px', fontSize: '12px', fontWeight: 700
                                }}>
                                    Avg: {avg} °C
                                </span>
                            )}
                        </div>
                        {!readOnly && (
                            <button
                                onClick={addReading}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    background: '#2b6cb0', color: '#fff', border: 'none',
                                    borderRadius: '6px', padding: '5px 12px', cursor: 'pointer',
                                    fontSize: '12px', fontWeight: 600
                                }}
                            >
                                <AddIcon style={{ fontSize: '14px' }} /> Add Reading
                            </button>
                        )}
                    </div>

                    {readings.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '16px', color: '#a0aec0',
                            fontSize: '13px', background: '#fff', borderRadius: '6px',
                            border: '1px dashed #cbd5e0'
                        }}>
                            No temperature readings yet. Click "Add Reading" to log sensor data.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{
                                width: '100%', borderCollapse: 'collapse', background: '#fff',
                                borderRadius: '6px', overflow: 'hidden',
                                border: '1px solid #e2e8f0', fontSize: '12px'
                            }}>
                                <thead>
                                    <tr style={{ background: '#edf2f7' }}>
                                        <th style={thStyle}>Date</th>
                                        <th style={thStyle}>Time</th>
                                        <th style={{ ...thStyle, color: '#c05621' }}>🌡 Sensor 1 (°C)</th>
                                        <th style={{ ...thStyle, color: '#2c7a7b' }}>🌡 Sensor 2 (°C)</th>
                                        <th style={{ ...thStyle, color: '#553c9a' }}>🌡 Sensor 3 (°C)</th>
                                        <th style={{ ...thStyle, color: '#276749' }}>🌡 Sensor 4 (°C)</th>
                                        <th style={thStyle}>Row Avg</th>
                                        {!readOnly && <th style={thStyle}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {readings.map((r, i) => {
                                        const rowVals = [r.sensor1, r.sensor2, r.sensor3, r.sensor4]
                                            .map(v => parseFloat(v)).filter(v => !isNaN(v));
                                        const rowAvg = rowVals.length > 0
                                            ? (rowVals.reduce((a, b) => a + b, 0) / rowVals.length).toFixed(1)
                                            : '—';
                                        return (
                                            <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f7fafc' }}>
                                                <td style={tdStyle}>
                                                    <input
                                                        type="date" value={r.date}
                                                        onChange={e => updateReading(r.id, 'date', e.target.value)}
                                                        disabled={readOnly} style={inputStyle}
                                                    />
                                                </td>
                                                <td style={tdStyle}>
                                                    <input
                                                        type="time" value={r.time}
                                                        onChange={e => updateReading(r.id, 'time', e.target.value)}
                                                        disabled={readOnly} style={inputStyle}
                                                    />
                                                </td>
                                                {['sensor1', 'sensor2', 'sensor3', 'sensor4'].map(sKey => (
                                                    <td key={sKey} style={tdStyle}>
                                                        <input
                                                            type="number" value={r[sKey]}
                                                            onChange={e => updateReading(r.id, sKey, e.target.value)}
                                                            disabled={readOnly}
                                                            placeholder="°C" min="0" max="100" step="0.1"
                                                            style={{ ...inputStyle, width: '80px', textAlign: 'center' }}
                                                        />
                                                    </td>
                                                ))}
                                                <td style={{ ...tdStyle, fontWeight: 700, color: '#c53030', textAlign: 'center' }}>
                                                    {rowAvg}
                                                </td>
                                                {!readOnly && (
                                                    <td style={tdStyle}>
                                                        <button
                                                            onClick={() => removeReading(r.id)}
                                                            style={{
                                                                background: 'none', border: 'none',
                                                                cursor: 'pointer', color: '#e53e3e',
                                                                display: 'flex', alignItems: 'center'
                                                            }}
                                                            title="Remove reading"
                                                        >
                                                            <DeleteIcon style={{ fontSize: '16px' }} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
};

const TunnelTable = React.memo(({ batch, onUpdate, readOnly = false }) => {
    const toast = useToast();
    const [expandedRows, setExpandedRows] = useState({});

    const toggleExpand = (index) => {
        setExpandedRows(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const validateDateRange = (substage, field, value) => {
        if (field === 'startDate' || field === 'startTime') {
            if (substage.endDate && substage.endTime) {
                const newStart = field === 'startDate'
                    ? combineDateTime(value, substage.startTime)
                    : combineDateTime(substage.startDate, value);
                const end = combineDateTime(substage.endDate, substage.endTime);
                if (newStart && end && new Date(newStart) > new Date(end)) {
                    toast.error(`Start date/time cannot be after end date/time`);
                    return false;
                }
            }
        } else if (field === 'endDate' || field === 'endTime') {
            if (substage.startDate && substage.startTime) {
                const start = combineDateTime(substage.startDate, substage.startTime);
                const newEnd = field === 'endDate'
                    ? combineDateTime(value, substage.endTime)
                    : combineDateTime(substage.endDate, value);
                if (start && newEnd && new Date(start) > new Date(newEnd)) {
                    toast.error(`End date/time cannot be before start date/time`);
                    return false;
                }
            }
        }
        return true;
    };

    const handleInputChange = (index, field, value) => {
        if (readOnly) return;

        const updatedBatch = { ...batch, substages: batch.substages.map(s => ({ ...s })) };
        const substage = updatedBatch.substages[index];

        if (['startDate', 'startTime', 'endDate', 'endTime'].includes(field)) {
            if (!validateDateRange(substage, field, value)) return;
        }

        substage[field] = value;

        if (substage.startDate && substage.startTime && substage.endDate && substage.endTime) {
            const start = new Date(`${substage.startDate}T${substage.startTime}`);
            const end = new Date(`${substage.endDate}T${substage.endTime}`);
            substage.totalHours = ((end - start) / 3_600_000).toFixed(1);
        }

        if (field === 'temperatureReadings') {
            substage.temperature = calcAvgTemperature(value);
        }

        onUpdate(updatedBatch);
    };

    const getMaterialsDisplay = () =>
        batch.materialDisplayNames?.length > 0
            ? batch.materialDisplayNames.join(' + ')
            : 'Tunnel Process';

    return (
        <div className="table-section">
            <h3 className="table-title">Tunnel Process — {getMaterialsDisplay()}</h3>
            <div className="entry-table-container">
                <table className="entry-table unified-platform-table">
                    <thead>
                        <tr>
                            <th rowSpan="2">Substage</th>
                            <th colSpan="2">Start</th>
                            <th colSpan="2">End</th>
                            <th rowSpan="2">Total Hours</th>
                            <th rowSpan="2">Moisture (%)</th>
                            <th rowSpan="2">Temperature (°C)</th>
                            <th rowSpan="2">Remarks</th>
                        </tr>
                        <tr>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Date</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {batch.substages.map((substage, index) => {
                            const isExpanded = !!expandedRows[index];
                            const readingCount = substage.temperatureReadings?.length || 0;
                            const avg = calcAvgTemperature(substage.temperatureReadings);

                            return (
                                <React.Fragment key={index}>
                                    <tr>
                                        <td className="substage-name">{substage.name}</td>
                                        <td>
                                            <input
                                                type="date"
                                                value={substage.startDate || ''}
                                                onChange={e => handleInputChange(index, 'startDate', e.target.value)}
                                                className="table-input"
                                                disabled={readOnly}
                                                max={substage.endDate || undefined}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="time"
                                                value={substage.startTime || ''}
                                                onChange={e => handleInputChange(index, 'startTime', e.target.value)}
                                                className="table-input"
                                                disabled={readOnly}
                                                max={substage.startDate === substage.endDate ? substage.endTime : undefined}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="date"
                                                value={substage.endDate || ''}
                                                onChange={e => handleInputChange(index, 'endDate', e.target.value)}
                                                className="table-input"
                                                disabled={readOnly}
                                                min={substage.startDate || undefined}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="time"
                                                value={substage.endTime || ''}
                                                onChange={e => handleInputChange(index, 'endTime', e.target.value)}
                                                className="table-input"
                                                disabled={readOnly}
                                                min={substage.startDate === substage.endDate ? substage.startTime : undefined}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={substage.totalHours || ''}
                                                readOnly
                                                className="table-input hours-input"
                                                placeholder="Auto"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                value={substage.moisture || ''}
                                                onChange={e => handleInputChange(index, 'moisture', e.target.value)}
                                                className="table-input moisture-input"
                                                placeholder="%" min="0" max="100" step="0.1"
                                                disabled={readOnly}
                                            />
                                        </td>

                                        {/* ── Temperature cell with sensor expand button ── */}
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    type="number"
                                                    value={avg !== '' ? avg : substage.temperature || ''}
                                                    onChange={e => {
                                                        if (readingCount === 0)
                                                            handleInputChange(index, 'temperature', e.target.value);
                                                    }}
                                                    readOnly={readingCount > 0}
                                                    className="table-input temperature-input"
                                                    placeholder={readingCount > 0 ? 'Avg' : '°C'}
                                                    min="0" max="100" step="0.1"
                                                    disabled={readOnly}
                                                    title={readingCount > 0
                                                        ? 'Average computed from sensor readings'
                                                        : 'Enter temperature manually or add sensor readings below'}
                                                    style={{ flex: 1, minWidth: '60px' }}
                                                />
                                                <button
                                                    onClick={() => toggleExpand(index)}
                                                    title={isExpanded ? 'Hide sensor readings' : `Sensor readings (${readingCount})`}
                                                    style={{
                                                        background: isExpanded ? '#c53030' : (readingCount > 0 ? '#2b6cb0' : '#718096'),
                                                        color: '#fff', border: 'none', borderRadius: '4px',
                                                        padding: '3px 5px', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '2px',
                                                        fontSize: '10px', fontWeight: 700,
                                                        whiteSpace: 'nowrap', flexShrink: 0
                                                    }}
                                                >
                                                    <ThermostatIcon style={{ fontSize: '12px' }} />
                                                    {readingCount > 0 && <span>{readingCount}</span>}
                                                    {isExpanded
                                                        ? <ExpandLessIcon style={{ fontSize: '12px' }} />
                                                        : <ExpandMoreIcon style={{ fontSize: '12px' }} />
                                                    }
                                                </button>
                                            </div>
                                        </td>

                                        <td>
                                            <input
                                                type="text"
                                                value={substage.remarks || ''}
                                                onChange={e => handleInputChange(index, 'remarks', e.target.value)}
                                                className="table-input remarks-input"
                                                placeholder="Add remarks..."
                                                disabled={readOnly}
                                            />
                                        </td>
                                    </tr>

                                    {/* ── Expandable sensor readings row ── */}
                                    {isExpanded && (
                                        <TemperatureReadingsPanel
                                            substage={substage}
                                            substageIndex={index}
                                            onUpdate={handleInputChange}
                                            readOnly={readOnly}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

TunnelTable.displayName = 'TunnelTable';

// ─── Batch Selection Screen ───────────────────────────────────────────────────

function BatchSelection({ onSelectBatch, loading, error, initialBatchNumber, initialBatchId }) {
    const [batchNumber, setBatchNumber] = useState(initialBatchNumber || '');
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        if (initialBatchNumber && !hasLoadedRef.current && !loading) {
            setBatchNumber(initialBatchNumber);
            handleLoadBatch(initialBatchNumber, initialBatchId);
            hasLoadedRef.current = true;
        }
    }, [initialBatchNumber, initialBatchId, loading]);

    const getMaterialsFromBatch = (batchData) => {
        const materials = new Set();
        if (batchData?.formulation_entries) {
            batchData.formulation_entries.forEach(entry => {
                const name = entry.name.toUpperCase();
                if (MATERIAL_TYPES[name] !== undefined) materials.add(name);
            });
        }
        return Array.from(materials);
    };

    const handleLoadBatch = async (batchNum, batchId) => {
        if (!batchNum?.trim()) { toast.error('Please enter a batch number'); return; }
        setIsLoading(true);
        try {
            let selectedBatch = null;
            let batchIdToUse = batchId;

            if (batchIdToUse) {
                const res = await fetch(`${BATCH_FETCH_ENDPOINT}/${batchIdToUse}`);
                if (res.ok) {
                    const r = await res.json();
                    selectedBatch = r.data || r;
                } else {
                    const allRes = await fetch(BATCH_FETCH_ENDPOINT);
                    if (allRes.ok) {
                        const allResult = await allRes.json();
                        const batches = Array.isArray(allResult) ? allResult : (allResult.data || []);
                        selectedBatch = batches.find(b => b.id === batchIdToUse);
                    }
                }
            } else {
                const res = await fetch(BATCH_FETCH_ENDPOINT);
                if (!res.ok) throw new Error('Failed to fetch batches');
                const result = await res.json();
                const batches = Array.isArray(result) ? result : (result.data || []);
                selectedBatch = batches.find(b => b.batch_number === batchNum.trim());
            }

            if (!selectedBatch) { toast.error('Batch number not found'); return; }

            const materials = getMaterialsFromBatch(selectedBatch);
            if (materials.length === 0) {
                toast.error('No suitable materials (Bagasse, Wheat Straw, or Paddy Straw) found in this batch');
                return;
            }

            const newBatch = createEmptyBatch(batchNum, materials, selectedBatch.id);
            newBatch.batchData = selectedBatch;

            const strawResult = await fetchBatchData(selectedBatch.id);
            if (strawResult.success && strawResult.data?.length > 0) {
                onSelectBatch(convertApiResponseToUI(strawResult.data, newBatch));
                toast.success(`Loaded batch ${batchNum} with existing data`);
            } else {
                onSelectBatch(newBatch);
                toast.success(`Loaded batch ${batchNum} (${materials.length} material${materials.length > 1 ? 's' : ''} — no existing data)`);
            }
        } catch (err) {
            toast.error('Error loading batch details. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="batch-selection">
            <h2>Tunnel Management Process Entry</h2>
            {error && <div className="error-message">Error: {error}</div>}
            <div className="selection-panel">
                <div className="new-batch-section">
                    <h3>Enter Batch Number</h3>
                    <div className="batch-input-group">
                        <input
                            type="text"
                            placeholder="Enter Batch Number (e.g., BATCH-001)"
                            value={batchNumber}
                            onChange={e => setBatchNumber(e.target.value)}
                            className="batch-input"
                            disabled={isLoading || loading}
                        />
                        <button
                            onClick={() => handleLoadBatch(batchNumber, initialBatchId)}
                            className="btn-primary"
                            disabled={isLoading || loading}
                        >
                            {isLoading || loading ? 'Loading...' : 'Load Batch'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TunnelManagementContent() {
    const router = useRouter();
    const toast = useToast();
    const searchParams = useSearchParams();
    const [currentBatch, setCurrentBatch] = useState(null);
    const [loading, setLoading] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [error, setError] = useState(null);
    const [initialBatchNumber, setInitialBatchNumber] = useState(null);
    const [initialBatchId, setInitialBatchId] = useState(null);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const isSavingRef = useRef(false);
    const isCompletingRef = useRef(false);

    useEffect(() => {
        const batchNum = searchParams.get('batch');
        const batchId = searchParams.get('batchId');
        if (batchNum) { setInitialBatchNumber(batchNum); setInitialBatchId(batchId); }
    }, [searchParams]);

    const handleSelectBatch = (batch) => setCurrentBatch(batch);
    const handleUpdateBatch = useCallback((updatedBatch) => setCurrentBatch(updatedBatch), []);

    const handleSave = async () => {
        if (!currentBatch || isSavingRef.current) return;
        isSavingRef.current = true;
        setLoading(true);

        try {
            if (!hasCompleteData(currentBatch.substages)) {
                toast.info('No complete data to save. Please fill in all required fields.');
                return;
            }

            let successCount = 0, failCount = 0, hasAnyDataToSave = false;

            for (const materialType of currentBatch.materialTypes) {
                const displayName = MATERIAL_DISPLAY_NAMES[materialType];
                const payload = convertToApiPayload(currentBatch, materialType, true);
                if (payload && Object.keys(payload).length > 2) {
                    hasAnyDataToSave = true;
                    const result = await sendToApi(payload, materialType, displayName);
                    if (result.success) { successCount++; toast.success(`${displayName} data saved successfully!`); }
                    else { failCount++; toast.error(`Failed to save ${displayName} data: ${result.error}`); }
                }
            }

            if (!hasAnyDataToSave) { toast.info('No data to save.'); return; }

            if (successCount > 0 && failCount === 0)
                toast.success(`All ${successCount} material(s) saved successfully!`);
            else if (failCount > 0)
                toast.warning(`${successCount} saved, ${failCount} failed`);
        } catch (err) {
            toast.error('Failed to save batch data');
        } finally {
            setLoading(false);
            setTimeout(() => { isSavingRef.current = false; }, 1000);
        }
    };

    const handleCompleteProcess = async () => {
        if (!currentBatch || isCompletingRef.current) return;
        setCompleteDialogOpen(false);
        isCompletingRef.current = true;
        setCompleting(true);

        try {
            const result = await completeBatch(currentBatch.id);
            if (result.success) {
                toast.success('Batch marked as completed successfully!');
                if (result.data?.data) {
                    setCurrentBatch(prev => ({ ...prev, batchData: { ...prev.batchData, ...result.data.data } }));
                }
                setTimeout(() => { router.push(`/batch-reports?batchId=${currentBatch.id}`); }, 1500);
            } else {
                toast.error(`Failed to complete batch: ${result.error}`);
            }
        } catch (err) {
            toast.error('Error completing batch');
        } finally {
            setCompleting(false);
            setTimeout(() => { isCompletingRef.current = false; }, 1000);
        }
    };

    const handleBackToSelection = () => {
        setCurrentBatch(null);
        router.push('/tunnel-management');
        setError(null);
        setInitialBatchNumber(null);
        setInitialBatchId(null);
    };

    if (!currentBatch) {
        return (
            <AppLayout title="Tunnel Management">
                <div className="unified-platform-container">
                    <BatchSelection
                        onSelectBatch={handleSelectBatch}
                        loading={loading}
                        error={error}
                        initialBatchNumber={initialBatchNumber}
                        initialBatchId={initialBatchId}
                    />
                </div>
            </AppLayout>
        );
    }

    const materialsDisplay = currentBatch.materialDisplayNames?.join(' + ') || 'Unknown';

    return (
        <AppLayout title="Tunnel Management">
            <div className="unified-platform-container">
                <div className="entry-header">
                    <div className="header-left">
                        <button onClick={handleBackToSelection} className="back-button">
                            <ArrowBackIcon />
                        </button>
                        <h2>{currentBatch.batchNumber}</h2>
                        <span className="material-count">({materialsDisplay})</span>
                    </div>
                    <div className="header-actions">
                        <button onClick={handleSave} className="btn-save" disabled={loading || completing}>
                            <SaveIcon fontSize="small" />
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            onClick={() => setCompleteDialogOpen(true)}
                            className="btn-complete"
                            disabled={completing || loading}
                            style={{
                                marginLeft: '10px', backgroundColor: '#4caf50', color: 'white',
                                border: 'none', padding: '8px 16px', borderRadius: '4px',
                                cursor: completing ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '5px'
                            }}
                        >
                            <CheckCircleIcon fontSize="small" />
                            {completing ? 'Completing...' : 'Complete Process'}
                        </button>
                    </div>
                </div>

                <TunnelTable
                    batch={currentBatch}
                    onUpdate={handleUpdateBatch}
                    readOnly={false}
                />

                <Dialog
                    open={completeDialogOpen}
                    onClose={() => setCompleteDialogOpen(false)}
                    aria-labelledby="complete-dialog-title"
                    aria-describedby="complete-dialog-description"
                >
                    <DialogTitle id="complete-dialog-title">
                        <strong>Confirm Batch Completion</strong>
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="complete-dialog-description">
                            Are you sure you want to mark this batch as completed?
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCompleteDialogOpen(false)} color="primary">
                            Cancel
                        </Button>
                        <Button onClick={handleCompleteProcess} color="primary" variant="contained" autoFocus>
                            Confirm
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        </AppLayout>
    );
}