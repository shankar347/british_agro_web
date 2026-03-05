"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { ToastProvider, useToast } from "../../components/common/Toaster";
import "../../styles/pages/flip-process.css";

import SaveIcon from '@mui/icons-material/Save';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

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
const API_ENDPOINT = `${API_BASE_URL}/flip-process-logs`;
const API_FETCH_ENDPOINT = `${API_BASE_URL}/flip-process-logs/batch`;
const BATCH_FETCH_ENDPOINT = `${API_BASE_URL}/batches`;

const STAGE_NAMES = [
    "Flip Stage 1",
    "Flip Stage 1 Rest",
    "Flip Stage 2",
    "Flip Stage 2 Rest",
    "Flip Stage 3",
    "Flip Stage 3 Rest"
];

const STAGE_FIELD_NAMES = {
    "Flip Stage 1": "flip_stage1",
    "Flip Stage 1 Rest": "flip_stage1_rest",
    "Flip Stage 2": "flip_stage2",
    "Flip Stage 2 Rest": "flip_stage2_rest",
    "Flip Stage 3": "flip_stage3",
    "Flip Stage 3 Rest": "flip_stage3_rest"
};

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
    const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    return avg.toFixed(1);
};

const createEmptySubstage = (name) => ({
    name: name,
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
        overallStartDate: '',
        overallStartTime: '',
        overallEndDate: '',
        overallEndTime: '',
        isCompleted: true,
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

const hasSubstageData = (substage) =>
    substage.startDate || substage.startTime || substage.endDate || substage.endTime ||
    substage.moisture || substage.temperature || substage.remarks;

const validateStageSequencing = (substages, toast) => {
    for (let i = 0; i < substages.length - 1; i++) {
        const cur = substages[i];
        const next = substages[i + 1];
        if (!cur.endDate || !cur.endTime || !next.startDate || !next.startTime) continue;
        const curEnd = combineDateTime(cur.endDate, cur.endTime);
        const nextStart = combineDateTime(next.startDate, next.startTime);
        if (curEnd && nextStart && new Date(curEnd) > new Date(nextStart)) {
            toast.error(`${next.name} must start after ${cur.name} ends`);
            return false;
        }
    }
    return true;
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

const convertToApiPayload = (batch, materialType, isCompleted) => {
    const s = batch.substages;

    const stageMapping = [
        { index: 0, field: 'flip_stage1' },
        { index: 1, field: 'flip_stage1_rest' },
        { index: 2, field: 'flip_stage2' },
        { index: 3, field: 'flip_stage2_rest' },
        { index: 4, field: 'flip_stage3' },
        { index: 5, field: 'flip_stage3_rest' }
    ];

    // Calculate overall start and end times from all stages
    let overallStartTime = null;
    let overallEndTime = null;

    stageMapping.forEach(({ index }) => {
        const substage = s[index];
        if (substage.startDate && substage.startTime) {
            const startTime = combineDateTime(substage.startDate, substage.startTime);
            if (startTime && (!overallStartTime || new Date(startTime) < new Date(overallStartTime))) {
                overallStartTime = startTime;
            }
        }
        if (substage.endDate && substage.endTime) {
            const endTime = combineDateTime(substage.endDate, substage.endTime);
            if (endTime && (!overallEndTime || new Date(endTime) > new Date(overallEndTime))) {
                overallEndTime = endTime;
            }
        }
    });

    // If no overall times from stages, use batch-level times
    if (!overallStartTime && batch.overallStartDate && batch.overallStartTime) {
        overallStartTime = combineDateTime(batch.overallStartDate, batch.overallStartTime);
    }
    if (!overallEndTime && batch.overallEndDate && batch.overallEndTime) {
        overallEndTime = combineDateTime(batch.overallEndDate, batch.overallEndTime);
    }

    const payload = {
        batch_id: batch.id,
        straw_type: materialType,
        start_time: overallStartTime ? formatDateTime(new Date(overallStartTime)) : null,
        end_time: overallEndTime ? formatDateTime(new Date(overallEndTime)) : null,
        iscompleted: isCompleted
    };

    stageMapping.forEach(({ index, field }) => {
        const substage = s[index];
        const start = substage.startDate && substage.startTime
            ? formatDateTime(combineDateTime(substage.startDate, substage.startTime)) : null;
        const end = substage.endDate && substage.endTime
            ? formatDateTime(combineDateTime(substage.endDate, substage.endTime)) : null;

        const avgTemp = calcAvgTemperature(substage.temperatureReadings);
        const tempValue = avgTemp !== '' ? parseFloat(avgTemp)
            : substage.temperature ? parseFloat(substage.temperature) : null;

        const block = {
            start_time: start,
            end_time: end,
            moisture: substage.moisture ? parseFloat(substage.moisture) : null,
            temperature: tempValue,
            remarks: substage.remarks || null
        };

        // Remove null/undefined values
        Object.keys(block).forEach(k => {
            if (block[k] === null || block[k] === undefined) delete block[k];
        });

        // Only add if there's any data
        if (Object.keys(block).length > 0) {
            payload[field] = block;
        }
    });

    // Remove null top-level keys
    Object.keys(payload).forEach(k => {
        if (payload[k] === null || payload[k] === undefined) delete payload[k];
    });

    return payload;
};

const convertApiResponseToUI = (apiData, batch) => {
    if (!apiData || !Array.isArray(apiData)) return batch;

    const materialDataMap = {};
    apiData.forEach(item => { 
        if (item.straw_type) materialDataMap[item.straw_type] = item; 
    });

    const stageMapping = [
        { index: 0, field: 'flip_stage1' },
        { index: 1, field: 'flip_stage1_rest' },
        { index: 2, field: 'flip_stage2' },
        { index: 3, field: 'flip_stage2_rest' },
        { index: 4, field: 'flip_stage3' },
        { index: 5, field: 'flip_stage3_rest' }
    ];

    // Set overall times from first material with data
    for (const materialType of batch.materialTypes) {
        const materialData = materialDataMap[materialType];
        if (materialData) {
            if (materialData.start_time && !batch.overallStartDate) {
                const { date, time } = parseDateTime(materialData.start_time);
                batch.overallStartDate = date;
                batch.overallStartTime = time;
            }
            if (materialData.end_time && !batch.overallEndDate) {
                const { date, time } = parseDateTime(materialData.end_time);
                batch.overallEndDate = date;
                batch.overallEndTime = time;
            }
            if (materialData.iscompleted !== undefined) {
                batch.isCompleted = materialData.iscompleted;
            }
            break;
        }
    }

    stageMapping.forEach(({ index, field }) => {
        for (const materialType of batch.materialTypes) {
            const materialData = materialDataMap[materialType];
            if (!materialData) continue;
            
            const stageData = materialData[field];
            if (stageData && batch.substages[index]) {
                const sub = batch.substages[index];
                
                if (!sub.startDate && stageData.start_time) {
                    const { date, time } = parseDateTime(stageData.start_time);
                    sub.startDate = date; 
                    sub.startTime = time;
                }
                if (!sub.endDate && stageData.end_time) {
                    const { date, time } = parseDateTime(stageData.end_time);
                    sub.endDate = date; 
                    sub.endTime = time;
                }
                if (!sub.totalHours && stageData.duration_hours != null) {
                    sub.totalHours = stageData.duration_hours.toFixed(1);
                }
                if (!sub.moisture && stageData.moisture != null) {
                    sub.moisture = stageData.moisture.toString();
                }
                if (!sub.temperature && stageData.temperature != null) {
                    sub.temperature = stageData.temperature.toString();
                }
                if (!sub.remarks && stageData.remarks) {
                    sub.remarks = stageData.remarks;
                }
            }
        }
    });

    return batch;
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

const TemperatureReadingsPanel = ({ substage, substageIndex, onUpdate, readOnly }) => {
    const readings = substage.temperatureReadings || [];

    const addReading = () => {
        onUpdate(substageIndex, 'temperatureReadings', [...readings, createEmptyTempReading()]);
    };

    const removeReading = (id) => {
        const updated = readings.filter(r => r.id !== id);
        onUpdate(substageIndex, 'temperatureReadings', updated);
    };

    const updateReading = (id, field, value) => {
        const updated = readings.map(r => r.id === id ? { ...r, [field]: value } : r);
        onUpdate(substageIndex, 'temperatureReadings', updated);
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
                                width: '100%', borderCollapse: 'collapse',
                                background: '#fff', borderRadius: '6px', overflow: 'hidden',
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
                                                        type="date"
                                                        value={r.date}
                                                        onChange={e => updateReading(r.id, 'date', e.target.value)}
                                                        disabled={readOnly}
                                                        style={inputStyle}
                                                    />
                                                </td>
                                                <td style={tdStyle}>
                                                    <input
                                                        type="time"
                                                        value={r.time}
                                                        onChange={e => updateReading(r.id, 'time', e.target.value)}
                                                        disabled={readOnly}
                                                        style={inputStyle}
                                                    />
                                                </td>
                                                {['sensor1', 'sensor2', 'sensor3', 'sensor4'].map(sKey => (
                                                    <td key={sKey} style={tdStyle}>
                                                        <input
                                                            type="number"
                                                            value={r[sKey]}
                                                            onChange={e => updateReading(r.id, sKey, e.target.value)}
                                                            disabled={readOnly}
                                                            placeholder="°C"
                                                            min="0"
                                                            max="100"
                                                            step="0.1"
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

const thStyle = {
    padding: '7px 10px', textAlign: 'center', fontWeight: 600,
    fontSize: '11px', color: '#4a5568', borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap'
};
const tdStyle = {
    padding: '5px 8px', textAlign: 'center', borderBottom: '1px solid #edf2f7',
    verticalAlign: 'middle'
};
const inputStyle = {
    border: '1px solid #e2e8f0', borderRadius: '4px', padding: '3px 6px',
    fontSize: '12px', background: '#fff', outline: 'none'
};

const FlipTable = React.memo(({ batch, onUpdate, readOnly = false }) => {
    const toast = useToast();
    const [expandedRows, setExpandedRows] = useState({});

    const toggleExpand = (index) => {
        setExpandedRows(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const validateDateRange = (substage, field, newValue) => {
        if (field === 'startDate' || field === 'startTime') {
            if (substage.endDate && substage.endTime) {
                const newStart = field === 'startDate'
                    ? combineDateTime(newValue, substage.startTime)
                    : combineDateTime(substage.startDate, newValue);
                const end = combineDateTime(substage.endDate, substage.endTime);
                if (newStart && end && new Date(newStart) > new Date(end)) {
                    toast.error(`${substage.name}: Start date/time cannot be after end date/time`);
                    return false;
                }
            }
        } else if (field === 'endDate' || field === 'endTime') {
            if (substage.startDate && substage.startTime) {
                const start = combineDateTime(substage.startDate, substage.startTime);
                const newEnd = field === 'endDate'
                    ? combineDateTime(newValue, substage.endTime)
                    : combineDateTime(substage.endDate, newValue);
                if (start && newEnd && new Date(start) > new Date(newEnd)) {
                    toast.error(`${substage.name}: End date/time cannot be before start date/time`);
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

        // Auto-calc total hours
        if (substage.startDate && substage.startTime && substage.endDate && substage.endTime) {
            const start = new Date(`${substage.startDate}T${substage.startTime}`);
            const end = new Date(`${substage.endDate}T${substage.endTime}`);
            substage.totalHours = ((end - start) / 3_600_000).toFixed(1);
        }

        if (field === 'temperatureReadings') {
            const avg = calcAvgTemperature(value);
            substage.temperature = avg;
        }

        onUpdate(updatedBatch);
    };

    const handleOverallTimeChange = (field, value) => {
        const updatedBatch = { ...batch };
        if (field === 'overallStartDate' || field === 'overallStartTime') {
            updatedBatch[field] = value;
        } else if (field === 'overallEndDate' || field === 'overallEndTime') {
            updatedBatch[field] = value;
        }
        onUpdate(updatedBatch);
    };

    const getMinEndDate = (substage) => substage.startDate || undefined;
    const getMinEndTime = (substage) =>
        substage.startDate === substage.endDate ? substage.startTime : undefined;

    const getMaterialsDisplay = () =>
        batch.materialDisplayNames?.length > 0
            ? batch.materialDisplayNames.join(' + ')
            : 'Flip Process';

    return (
        <div className="table-section">
            <h3 className="table-title">Flip Process — {getMaterialsDisplay()}</h3>

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
                                    {/* Main data row */}
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
                                                min={getMinEndDate(substage)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="time"
                                                value={substage.endTime || ''}
                                                onChange={e => handleInputChange(index, 'endTime', e.target.value)}
                                                className="table-input"
                                                disabled={readOnly}
                                                min={getMinEndTime(substage)}
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
                                                placeholder="%"
                                                min="0" max="100" step="0.1"
                                                disabled={readOnly}
                                            />
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    type="number"
                                                    value={avg !== '' ? avg : substage.temperature || ''}
                                                    onChange={e => {
                                                        if (readingCount === 0) {
                                                            handleInputChange(index, 'temperature', e.target.value);
                                                        }
                                                    }}
                                                    readOnly={readingCount > 0}
                                                    className="table-input temperature-input"
                                                    placeholder={readingCount > 0 ? 'Avg' : '°C'}
                                                    min="0" max="100" step="0.1"
                                                    disabled={readOnly}
                                                    title={readingCount > 0 ? 'Average computed from sensor readings' : 'Enter temperature manually or add sensor readings below'}
                                                    style={{ flex: 1, minWidth: '60px' }}
                                                />
                                                <button
                                                    onClick={() => toggleExpand(index)}
                                                    title={isExpanded ? 'Hide sensor readings' : `Sensor readings (${readingCount})`}
                                                    style={{
                                                        background: isExpanded ? '#c53030' : (readingCount > 0 ? '#2b6cb0' : '#718096'),
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '3px 5px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '2px',
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        whiteSpace: 'nowrap',
                                                        flexShrink: 0
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

                                    {/* Expandable sensor readings row */}
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

FlipTable.displayName = 'FlipTable';

function BatchSelection({ onSelectBatch, loading, error, initialBatchNumber, initialBatchId }) {
    const [batchNumber, setBatchNumber] = useState(initialBatchNumber || '');
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();
    const router = useRouter();
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
                const populated = convertApiResponseToUI(strawResult.data, newBatch);
                onSelectBatch(populated);
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
            <h2>Flip Process Management Entry</h2>
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

const fetchBatchData = async (batchId) => {
    try {
        const response = await fetch(`${API_FETCH_ENDPOINT}/${batchId}`);
        if (!response.ok) {
            if (response.status === 404) return { success: true, data: [] };
            throw new Error(`Failed to fetch flip process data: ${response.status}`);
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

function FlipProcessContent() {
    const router = useRouter();
    const toast = useToast();
    const searchParams = useSearchParams();
    const [currentBatch, setCurrentBatch] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [initialBatchNumber, setInitialBatchNumber] = useState(null);
    const [initialBatchId, setInitialBatchId] = useState(null);
    const isSavingRef = useRef(false);

    useEffect(() => {
        const batchNum = searchParams.get('batch');
        const batchId = searchParams.get('batchId');
        if (batchNum) { setInitialBatchNumber(batchNum); setInitialBatchId(batchId); }
    }, [searchParams]);

    const handleSelectBatch = (batch) => setCurrentBatch(batch);

    const handleUpdateBatch = useCallback((updatedBatch) => setCurrentBatch(updatedBatch), []);

    const validateBatchData = (batch) => {
        if (!validateStageSequencing(batch.substages, toast)) return false;

        for (const substage of batch.substages) {
            if (substage.startDate && substage.startTime && substage.endDate && substage.endTime) {
                const start = new Date(`${substage.startDate}T${substage.startTime}`);
                const end = new Date(`${substage.endDate}T${substage.endTime}`);
                if (start > end) {
                    toast.error(`${substage.name}: End date/time cannot be before start date/time`);
                    return false;
                }
            }
            if ((substage.startDate || substage.startTime) && (!substage.startDate || !substage.startTime)) {
                toast.error(`Please complete both date and time for ${substage.name} start`);
                return false;
            }
            if ((substage.endDate || substage.endTime) && (!substage.endDate || !substage.endTime)) {
                toast.error(`Please complete both date and time for ${substage.name} end`);
                return false;
            }
        }
        return true;
    };

    const handleSave = async () => {
        if (!currentBatch || isSavingRef.current) return;
        isSavingRef.current = true;
        setLoading(true);

        try {
            if (!hasCompleteData(currentBatch.substages)) {
                toast.info('No complete data to save. Please fill in all required fields.');
                return;
            }
            if (!validateBatchData(currentBatch)) return;

            let successCount = 0, failCount = 0;

            for (const materialType of currentBatch.materialTypes) {
                const displayName = MATERIAL_DISPLAY_NAMES[materialType];
                const payload = convertToApiPayload(currentBatch, materialType, currentBatch.isCompleted);
                if (!payload) continue;

                const result = await sendToApi(payload, materialType, displayName);
                if (result.success) {
                    successCount++;
                    toast.success(`${displayName} data saved successfully!`);
                } else {
                    failCount++;
                    toast.error(`Failed to save ${displayName} data: ${result.error}`);
                }
            }

            if (successCount > 0 && failCount === 0) {
                toast.success(`All ${successCount} material(s) saved successfully!`);
            } else if (failCount > 0) {
                toast.warning(`${successCount} saved, ${failCount} failed`);
            }
        } catch (err) {
            toast.error('Failed to save batch data');
        } finally {
            setLoading(false);
            setTimeout(() => { isSavingRef.current = false; }, 1000);
        }
    };

    const handleBackToSelection = () => {
        setCurrentBatch(null);
        router.push('/flip-process');
        setError(null);
        setInitialBatchNumber(null);
        setInitialBatchId(null);
    };

    if (!currentBatch) {
        return (
            <AppLayout title="Flip Process">
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
        <AppLayout title="Flip Process">
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
                        <button onClick={handleSave} className="btn-save" disabled={loading}>
                            <SaveIcon fontSize="small" />
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>

                <FlipTable
                    batch={currentBatch}
                    onUpdate={handleUpdateBatch}
                    readOnly={false}
                />
            </div>
        </AppLayout>
    );
}

export default function Page() {
    return (
        <ToastProvider>
            <FlipProcessContent />
        </ToastProvider>
    );
}