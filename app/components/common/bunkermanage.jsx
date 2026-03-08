"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { ToastProvider, useToast } from "../../components/common/Toaster";
import "../../styles/pages/bunker-management.css";

import SaveIcon from '@mui/icons-material/Save';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LockOutlineIcon from '@mui/icons-material/LockOutline';


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
const API_ENDPOINT = `${API_BASE_URL}/bunker-process-logs`;
const API_FETCH_ENDPOINT = `${API_BASE_URL}/bunker-process-logs/batch`;
const BATCH_FETCH_ENDPOINT = `${API_BASE_URL}/batches`;



const STAGE_DEFS = [
    { name: '1 BP',          isRest: false, apiField: 'bunker_process1'      },
    { name: '1 BP Rest',     isRest: true,  apiField: 'bunker_process1_rest' },
    { name: '1 BP (2)',      isRest: false, apiField: 'bp_1_2'               },
    { name: '1 BP (2) Rest', isRest: true,  apiField: 'bp_1_2_rest'          },
    { name: '1 BP (3)',      isRest: false, apiField: 'bp_1_3'               },
    { name: '1 BP (3) Rest', isRest: true,  apiField: 'bp_1_3_rest'          },
    { name: '2 BP',          isRest: false, apiField: 'bunker_process2'      },
    { name: '2 BP Rest',     isRest: true,  apiField: 'bunker_process2_rest' },
    { name: '2 BP (2)',      isRest: false, apiField: 'bp_2_2'               },
    { name: '2 BP (2) Rest', isRest: true,  apiField: 'bp_2_2_rest'          },
    { name: '2 BP (3)',      isRest: false, apiField: 'bp_2_3'               },
    { name: '2 BP (3) Rest', isRest: true,  apiField: 'bp_2_3_rest'          },
    { name: '3 BP',          isRest: false, apiField: 'bunker_process3'      },
    { name: '3 BP Rest',     isRest: true,  apiField: 'bunker_process3_rest' },
    { name: '3 BP (2)',      isRest: false, apiField: 'bp_3_2'               },
    { name: '3 BP (2) Rest', isRest: true,  apiField: 'bp_3_2_rest'          },
    { name: '3 BP (3)',      isRest: false, apiField: 'bp_3_3'               },
    { name: '3 BP (3) Rest', isRest: true,  apiField: 'bp_3_3_rest'          },
    { name: 'BP 4',          isRest: false, apiField: 'bunker_process4'      },
    { name: 'BP 4 Rest',     isRest: true,  apiField: 'bunker_process4_rest' },
];


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

const createEmptySubstage = (def) => ({
    name: def.name,
    isRest: def.isRest,
    apiField: def.apiField,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    totalHours: '',
    bunker: '',
    bunkerLocked: false,
    // Rest-only fields
    moisture: '',
    temperature: '',
    startTempHours: '',
    endTempHours: '',
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
        substages: STAGE_DEFS.map(def => createEmptySubstage(def))
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

const formatDateTimeWithZ = (dateTimeStr) => {
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
        return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
    } catch {
        return null;
    }
};

const hasCompleteData = (substages) => {
    return substages.some(s =>
        s.startDate || s.startTime || s.endDate || s.endTime ||
        s.moisture || s.temperature || s.remarks ||
        (s.temperatureReadings && s.temperatureReadings.length > 0) ||
        s.bunker
    );
    
    if (!hasAnyData) return false;
    
    for (const s of substages) {
        if (s.startDate && !s.startTime) return false;
        if (s.startTime && !s.startDate) return false;
        
        if (s.endDate && !s.endTime) return false;
        if (s.endTime && !s.endDate) return false;
        
        if (s.temperatureReadings && s.temperatureReadings.length > 0) {
            for (const reading of s.temperatureReadings) {
                if ((reading.date && !reading.time) || (!reading.date && reading.time)) {
                    return false;
                }
            }
        }
    }
    
    return true;
};

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


const convertToApiPayload = (batch, materialType, isCompleted) => {
    const s = batch.substages;

    const allStarts = s
        .filter(sub => sub.startDate && sub.startTime)
        .map(sub => new Date(combineDateTime(sub.startDate, sub.startTime)).getTime())
        .filter(t => !isNaN(t));

    const overall_start_time = allStarts.length > 0
        ? formatDateTimeWithZ(new Date(Math.min(...allStarts)))
        : null;

    const payload = {
        straw_type: materialType,
        batch_id: batch.id,
        start_time: overall_start_time,
    };

    const firstBunkerSub = s.find(sub => sub.bunker);
    if (firstBunkerSub) payload.bunker_id = firstBunkerSub.bunker;
    if (isCompleted !== undefined) payload.iscompleted = isCompleted;

    s.forEach(substage => {
        const temp_list = (substage.temperatureReadings || [])
            .filter(r => r.date && r.time)
            .map(r => {
                const dateTime = combineDateTime(r.date, r.time);
                if (!dateTime) return null;
                const vals = ['sensor1', 'sensor2', 'sensor3', 'sensor4']
                    .map(k => r[k] ? parseFloat(r[k]) : null);
                const filtered = vals.filter(v => v !== null);
                return {
                    date_time: formatDateTimeWithZ(dateTime),
                    sensor1: vals[0],
                    sensor2: vals[1],
                    sensor3: vals[2],
                    sensor4: vals[3],
                    row_avg: filtered.length > 0
                        ? parseFloat((filtered.reduce((a, b) => a + b, 0) / filtered.length).toFixed(2))
                        : null
                };
            })
            .filter(Boolean);

        const hasData = substage.startDate || substage.startTime || substage.endDate ||
            substage.endTime || substage.moisture || temp_list.length > 0 ||
            substage.remarks || substage.bunker;

        if (!hasData) return;

        const stageData = {};
        const start = substage.startDate && substage.startTime
            ? formatDateTimeWithZ(combineDateTime(substage.startDate, substage.startTime))
            : null;
        const end = substage.endDate && substage.endTime
            ? formatDateTimeWithZ(combineDateTime(substage.endDate, substage.endTime))
            : null;

        if (start) stageData.start_time = start;
        if (end) stageData.end_time = end;
        if (substage.bunker) stageData.bunker_id = substage.bunker;
        if (substage.remarks) stageData.remarks = substage.remarks;
        stageData.temp_list = temp_list;

        // Rest-only fields
        if (substage.isRest) {
            if (substage.moisture) stageData.moisture = parseFloat(substage.moisture);
            if (substage.startTempHours) stageData.start_temp_hours = parseFloat(substage.startTempHours);
            if (substage.endTempHours) stageData.end_temp_hours = parseFloat(substage.endTempHours);
        }

        payload[substage.apiField] = stageData;
    });

    return payload;
};

const convertApiResponseToUI = (apiData, batch) => {
    if (!apiData || !Array.isArray(apiData)) return batch;

    const materialDataMap = {};
    apiData.forEach(item => {
        if (!item.straw_type) return;
        let key = null;
        if (item.straw_type === 'PADDY') key = 'PADDY';
        else if (item.straw_type === 'Wheat' || item.straw_type === 'WHEAT') key = 'WHEAT';
        else if (item.straw_type === 'BAGASSE') key = 'BAGASSE';
        if (key) materialDataMap[key] = item;
    });

    batch.materialTypes.forEach(materialType => {
        const materialData = materialDataMap[materialType];
        if (!materialData) return;

        batch.substages.forEach(sub => {
            const stageData = materialData[sub.apiField];
            if (!stageData) return;

            if (stageData.start_time && !sub.startDate) {
                const { date, time } = parseDateTime(stageData.start_time);
                sub.startDate = date;
                sub.startTime = time;
            }
            if (stageData.end_time && !sub.endDate) {
                const { date, time } = parseDateTime(stageData.end_time);
                sub.endDate = date;
                sub.endTime = time;
            }
            if (stageData.duration_hours != null && !sub.totalHours) {
                sub.totalHours = stageData.duration_hours.toFixed(1);
            }
            if (stageData.bunker_id) {
                sub.bunker = stageData.bunker_id;
                sub.bunkerLocked = true;
            }
            if (stageData.remarks && !sub.remarks) {
                sub.remarks = stageData.remarks;
            }
            // Rest-only
            if (sub.isRest) {
                if (stageData.moisture != null && !sub.moisture) {
                    sub.moisture = stageData.moisture.toString();
                }
                if (stageData.start_temp_hours != null && !sub.startTempHours) {
                    sub.startTempHours = stageData.start_temp_hours.toString();
                }
                if (stageData.end_temp_hours != null && !sub.endTempHours) {
                    sub.endTempHours = stageData.end_temp_hours.toString();
                }
            }
            if (stageData.temp_list && Array.isArray(stageData.temp_list) && stageData.temp_list.length > 0) {
                sub.temperatureReadings = stageData.temp_list.map(r => {
                    const { date, time } = r.date_time ? parseDateTime(r.date_time) : { date: '', time: '' };
                    return {
                        id: Date.now() + Math.random(),
                        date,
                        time,
                        sensor1: r.sensor1 != null ? r.sensor1.toString() : '',
                        sensor2: r.sensor2 != null ? r.sensor2.toString() : '',
                        sensor3: r.sensor3 != null ? r.sensor3.toString() : '',
                        sensor4: r.sensor4 != null ? r.sensor4.toString() : ''
                    };
                });
                const avg = calcAvgTemperature(sub.temperatureReadings);
                if (avg !== '') sub.temperature = avg;
            }
        });
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
        console.error('API Error:', error);
        return { success: false, error: error.message, materialType, displayName };
    }
};


const thStyle = {
    padding: '7px 10px',
    textAlign: 'center',
    fontWeight: 600,
    fontSize: '11px',
    color: '#4a5568',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap'
};
const tdStyle = {
    padding: '5px 8px',
    textAlign: 'center',
    borderBottom: '1px solid #edf2f7',
    verticalAlign: 'middle'
};
const inputStyle = {
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    padding: '3px 6px',
    fontSize: '12px',
    background: '#fff',
    outline: 'none'
};


const TemperatureReadingsPanel = ({ substage, substageIndex, onUpdate, readOnly, selectedBunker }) => {
    const readings = substage.temperatureReadings || [];

    const addReading = () => {
        onUpdate(substageIndex, 'temperatureReadings', [...readings, createEmptyTempReading()]);
    };
    const removeReading = (id) => {
        onUpdate(substageIndex, 'temperatureReadings', readings.filter(r => r.id !== id));
    };
    const updateReading = (id, field, value) => {
        onUpdate(substageIndex, 'temperatureReadings', readings.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const avg = calcAvgTemperature(readings);

    return (
        <tr className="temp-readings-row">
            <td colSpan="12" style={{ padding: 0, background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <div style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ThermostatIcon style={{ fontSize: '16px', color: '#e53e3e' }} />
                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#2d3748' }}>
                                Sensor Temperature Readings — {substage.name}
                                {selectedBunker && (
                                    <>
                                        {' || '}
                                        <span
                                            style={{
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                background: '#bee3f8',
                                                color: '#2b6cb0',
                                                borderRadius: '8px',
                                                padding: '1px 7px',
                                                letterSpacing: '0.02em',
                                                border: '1px solid #90cdf4',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {selectedBunker.name}
                                        </span>
                                    </>
                                )}
                            </span>
                            {avg !== '' && (
                                <span style={{ background: '#fed7d7', color: '#c53030', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                                    Avg: {avg} °C
                                </span>
                            )}
                        </div>
                        {!readOnly && (
                            <button
                                onClick={addReading}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#2b6cb0', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                            >
                                <AddIcon style={{ fontSize: '14px' }} /> Add Reading
                            </button>
                        )}
                    </div>

                    {readings.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '16px', color: '#a0aec0', fontSize: '13px', background: '#fff', borderRadius: '6px', border: '1px dashed #cbd5e0' }}>
                            No temperature readings yet. Click "Add Reading" to log sensor data.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0', fontSize: '12px' }}>
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
                                                    <input type="date" value={r.date} onChange={e => updateReading(r.id, 'date', e.target.value)} disabled={readOnly} style={inputStyle} />
                                                </td>
                                                <td style={tdStyle}>
                                                    <input type="time" value={r.time} onChange={e => updateReading(r.id, 'time', e.target.value)} disabled={readOnly} style={inputStyle} />
                                                </td>
                                                {['sensor1', 'sensor2', 'sensor3', 'sensor4'].map(sKey => (
                                                    <td key={sKey} style={tdStyle}>
                                                        <input type="number" value={r[sKey]} onChange={e => updateReading(r.id, sKey, e.target.value)} disabled={readOnly} placeholder="°C" min="0" max="100" step="0.1" style={{ ...inputStyle, width: '80px', textAlign: 'center' }} />
                                                    </td>
                                                ))}
                                                <td style={{ ...tdStyle, fontWeight: 700, color: '#c53030', textAlign: 'center' }}>{rowAvg}</td>
                                                {!readOnly && (
                                                    <td style={tdStyle}>
                                                        <button onClick={() => removeReading(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', display: 'flex', alignItems: 'center' }} title="Remove reading">
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


const BunkerTable = React.memo(({ batch, onUpdate, readOnly = false, bunkers = [], bunkerLoading = false }) => {
    const toast = useToast();
    const [expandedRows, setExpandedRows] = useState({});

    const topScrollRef = useRef(null);
    const tableWrapperRef = useRef(null);
    const isSyncingRef = useRef(false);

    const syncFromTop = useCallback(() => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;
        if (tableWrapperRef.current && topScrollRef.current) {
            tableWrapperRef.current.scrollLeft = topScrollRef.current.scrollLeft;
        }
        isSyncingRef.current = false;
    }, []);

    const syncFromWrapper = useCallback(() => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;
        if (topScrollRef.current && tableWrapperRef.current) {
            topScrollRef.current.scrollLeft = tableWrapperRef.current.scrollLeft;
        }
        isSyncingRef.current = false;
    }, []);

    const phantomRef = useRef(null);
    useEffect(() => {
        const updatePhantomWidth = () => {
            if (tableWrapperRef.current && phantomRef.current) {
                phantomRef.current.style.width = tableWrapperRef.current.scrollWidth + 'px';
            }
        };
        updatePhantomWidth();
        const observer = new ResizeObserver(updatePhantomWidth);
        if (tableWrapperRef.current) observer.observe(tableWrapperRef.current);
        return () => observer.disconnect();
    }, [batch.substages]);

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

        const updatedSubstages = batch.substages.map(s => ({ ...s }));
        const substage = updatedSubstages[index];

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

        if (field === 'bunker') {
            if (!substage.isRest) {
                const nextRestIndex = updatedSubstages.findIndex(
                    (s, i) => i > index && s.isRest
                );
                if (nextRestIndex !== -1 && !updatedSubstages[nextRestIndex].bunkerLocked) {
                    updatedSubstages[nextRestIndex].bunker = value;
                }
            }
        }

        onUpdate({ ...batch, substages: updatedSubstages });
    };

    const getMinEndDate = (substage) => substage.startDate || undefined;
    const getMinEndTime = (substage) =>
        substage.startDate === substage.endDate ? substage.startTime : undefined;

    const getMaterialsDisplay = () =>
        batch.materialDisplayNames?.length > 0
            ? batch.materialDisplayNames.join(' + ')
            : 'Bunker Process';

    return (
        <div className="table-section">
            <h3 className="table-title">Bunker Process — {getMaterialsDisplay()}</h3>

            {/* Sticky top horizontal scrollbar */}
                    <div ref={topScrollRef}
                        onScroll={syncFromTop}
                        className="top-scroll-bar"   
                        style={{                     
                            position: 'sticky',
                            top: 0,
                            zIndex: 10,
                        }}>
                        <div ref={phantomRef} style={{ height: '1px' }} />
                    </div>

            <div
                className="entry-table-container"
                ref={tableWrapperRef}
                onScroll={syncFromWrapper}
                style={{ overflowX: 'auto' }}
            >
                <table className="entry-table unified-platform-table">
                    <thead>
                        <tr>
                            <th rowSpan="2" style={{ minWidth: '130px' }}>Substage</th>
                            <th colSpan="2">Start</th>
                            <th colSpan="2">End</th>
                            <th rowSpan="2">Total <br />Hrs</th>
                            <th rowSpan="2">Bunker</th>
                            <th rowSpan="2">Moist <br />(%)</th>
                            <th colSpan="3">Temperature (°C)</th>
                            {/* FIX 2: Remarks column gets full width */}
                            <th rowSpan="2" style={{ minWidth: '200px', width: '100%' }}>Remarks</th>
                        </tr>
                        <tr>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Initial <br />Temp Hrs</th>
                            <th>Final <br />Temp Hrs</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {batch.substages.map((substage, index) => {
                            const isExpanded = !!expandedRows[index];
                            const readingCount = substage.temperatureReadings?.length || 0;
                            const avg = calcAvgTemperature(substage.temperatureReadings);
                            const selectedBunker = bunkers.find(b => b.id === substage.bunker);
                            const isRest = substage.isRest;

                            const rowBg = isRest
                                ? (index % 2 === 0 ? '#f5f5f5' : '#eaeaea')
                                : (index % 2 === 0 ? '#fff' : '#f9fafb');

                            return (
                                <React.Fragment key={index}>
                                    <tr style={{ background: rowBg }}>
                                        <td className="substage-name" style={{ whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: isRest ? 500 : 600, color: isRest ? '#744210' : '#1a202c' }}>
                                                    {substage.name}
                                                </span>
                                                {selectedBunker && (
                                                    <span style={{
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        background: '#bee3f8',
                                                        color: '#2b6cb0',
                                                        borderRadius: '8px',
                                                        padding: '1px 7px',
                                                        letterSpacing: '0.02em',
                                                        border: '1px solid #90cdf4',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {selectedBunker.name}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

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
                                            {(readOnly || substage.bunkerLocked) ? (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    padding: '3px 8px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    color: selectedBunker ? '#276749' : '#718096',
                                                    borderRadius: '12px',
                                                    border: `1px solid ${selectedBunker ? '#9ae6b4' : '#e2e8f0'}`,
                                                    whiteSpace: 'nowrap',
                                                    cursor: 'default',
                                                    userSelect: 'none',
                                                    minWidth: '40px',
                                                }}>
                                                    {selectedBunker ? (
                                                        <><LockOutlineIcon style={{ fontSize: 16 }} /> {selectedBunker.name}</>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </span>
                                            ) : (
                                                <select
                                                    value={substage.bunker || ''}
                                                    onChange={e => handleInputChange(index, 'bunker', e.target.value)}
                                                    disabled={bunkerLoading}
                                                    className="table-input"
                                                    style={{
                                                        minWidth: '60px',
                                                        maxWidth: '90px',
                                                        padding: '3px 4px',
                                                        fontSize: '12px',
                                                        borderRadius: '4px',
                                                        border: '1px solid #e2e8f0',
                                                        background: '#fff',
                                                        cursor: 'pointer',
                                                        color: substage.bunker ? '#1a202c' : '#a0aec0',
                                                        outline: 'none',
                                                        height: '28px',
                                                        width: '100%',
                                                        textAlign: 'center',
                                                        textAlignLast: 'center',
                                                    }}
                                                >
                                                    <option value="">
                                                        {bunkerLoading ? 'Loading...' : 'Select'}
                                                    </option>
                                                    {bunkers.map(b => (
                                                        <option key={b.id} value={b.id} style={{ textAlign: 'center', textAlignLast: 'center', color: 'black' }}>
                                                            {b.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </td>

                                        <td style={{ width: '70px' }}>
                                            {isRest ? (
                                                <input
                                                    type="number"
                                                    value={substage.moisture || ''}
                                                    onChange={e => handleInputChange(index, 'moisture', e.target.value)}
                                                    className="table-input moisture-input"
                                                    placeholder="%"
                                                    min="0"
                                                    max="100"
                                                    step="0.1"
                                                    disabled={readOnly}
                                                    style={{ maxWidth: '65px' }}
                                                />
                                            ) : (
                                                <span style={{ color: '#cbd5e0', fontSize: '12px' }}>—</span>
                                            )}
                                        </td>

                                        <td style={{ width: '80px' }}>
                                            {isRest ? (
                                                <input
                                                    type="number"
                                                    value={substage.startTempHours || ''}
                                                    onChange={e => handleInputChange(index, 'startTempHours', e.target.value)}
                                                    className="table-input"
                                                    placeholder="hrs"
                                                    min="0"
                                                    step="0.1"
                                                    disabled={readOnly}
                                                    style={{ maxWidth: '70px' }}
                                                />
                                            ) : (
                                                <span style={{ color: '#cbd5e0', fontSize: '12px' }}>—</span>
                                            )}
                                        </td>

                                        <td style={{ width: '80px' }}>
                                            {isRest ? (
                                                <input
                                                    type="number"
                                                    value={substage.endTempHours || ''}
                                                    onChange={e => handleInputChange(index, 'endTempHours', e.target.value)}
                                                    className="table-input"
                                                    placeholder="hrs"
                                                    min="0"
                                                    step="0.1"
                                                    disabled={readOnly}
                                                    style={{ maxWidth: '70px' }}
                                                />
                                            ) : (
                                                <span style={{ color: '#cbd5e0', fontSize: '12px' }}>—</span>
                                            )}
                                        </td>

                                        <td style={{ width: '110px' }}>
                                            {isRest ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <input
                                                        type="number"
                                                        value={avg !== '' ? avg : substage.temperature || ''}
                                                        onChange={e => { if (readingCount === 0) handleInputChange(index, 'temperature', e.target.value); }}
                                                        readOnly={readingCount > 0}
                                                        className="table-input temperature-input"
                                                        placeholder={readingCount > 0 ? 'Avg' : '°C'}
                                                        min="0" max="100" step="0.1"
                                                        disabled={readOnly}
                                                        title={readingCount > 0 ? 'Average computed from sensor readings' : 'Enter manually or add sensor readings'}
                                                        style={{ flex: 1, minWidth: '45px', maxWidth: '55px' }}
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
                                                        {isExpanded ? <ExpandLessIcon style={{ fontSize: '12px' }} /> : <ExpandMoreIcon style={{ fontSize: '12px' }} />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#cbd5e0', fontSize: '12px' }}>—</span>
                                            )}
                                        </td>

                                        <td style={{ width: '100%' }}>
                                            <input
                                                type="text"
                                                value={substage.remarks || ''}
                                                onChange={e => handleInputChange(index, 'remarks', e.target.value)}
                                                className="table-input remarks-input"
                                                placeholder="Add remarks..."
                                                disabled={readOnly}
                                                style={{ width: '100%', minWidth: '180px', boxSizing: 'border-box' }}
                                            />
                                        </td>
                                    </tr>

                                    {isExpanded && isRest && (
                                        <TemperatureReadingsPanel
                                            substage={substage}
                                            substageIndex={index}
                                            onUpdate={handleInputChange}
                                            readOnly={readOnly}
                                            selectedBunker={selectedBunker}
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

BunkerTable.displayName = 'BunkerTable';


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
            <h2>Bunker Management Process Entry</h2>
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
            throw new Error(`Failed to fetch bunker data: ${response.status}`);
        }
        const responseData = await response.json();
        if (responseData.success && responseData.data) {
            if (responseData.data.items && Array.isArray(responseData.data.items)) {
                return { success: true, data: responseData.data.items };
            }
            if (Array.isArray(responseData.data)) {
                return { success: true, data: responseData.data };
            }
        }
        return { success: true, data: [] };
    } catch (error) {
        console.error('Fetch error:', error);
        return { success: false, error: error.message };
    }
};


export default function BunkerManagementContent() {
    const router = useRouter();
    const toast = useToast();
    const searchParams = useSearchParams();
    const [currentBatch, setCurrentBatch] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [initialBatchNumber, setInitialBatchNumber] = useState(null);
    const [initialBatchId, setInitialBatchId] = useState(null);
    const isSavingRef = useRef(false);
    const [isSaved, setIsSaved] = useState(false);

    const [tunnels, setTunnels] = useState([]);
    const [selectedTunnel, setSelectedTunnel] = useState('');
    const [tunnelLoading, setTunnelLoading] = useState(false);
    const [movingToTunnel, setMovingToTunnel] = useState(false);

    const [bunkers, setBunkers] = useState([]);
    const [bunkerLoading, setBunkerLoading] = useState(false);

    useEffect(() => {
        const fetchTunnels = async () => {
            setTunnelLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/tunnels`);
                if (!res.ok) throw new Error('Failed to fetch tunnels');
                const data = await res.json();
                setTunnels((data.data || []).filter(t => t.is_active === false));
            } catch (err) {
                console.error('Error fetching tunnels:', err);
            } finally {
                setTunnelLoading(false);
            }
        };
        fetchTunnels();
    }, []);

    useEffect(() => {
        const fetchBunkers = async () => {
            setBunkerLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/bunkers`);
                if (!res.ok) throw new Error('Failed to fetch bunkers');
                const data = await res.json();
                setBunkers(data.data || []);
            } catch (err) {
                console.error('Error fetching bunkers:', err);
            } finally {
                setBunkerLoading(false);
            }
        };
        fetchBunkers();
    }, []);

    useEffect(() => {
        const batchNum = searchParams.get('batch');
        const batchId = searchParams.get('batchId');
        if (batchNum) {
            setInitialBatchNumber(batchNum);
            setInitialBatchId(batchId);
        }
    }, [searchParams]);

    const handleSelectBatch = (batch) => {
        setCurrentBatch(batch);
        setIsSaved(false);
    };

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
                const payload = convertToApiPayload(currentBatch, materialType, false);
                if (Object.keys(payload).length > 2) {
                    const result = await sendToApi(payload, materialType, displayName);
                    if (result.success) {
                        successCount++;
                        toast.success(`${displayName} data saved successfully!`);
                    } else {
                        failCount++;
                        toast.error(`Failed to save ${displayName} data: ${result.error}`);
                    }
                }
            }

            if (successCount > 0 && failCount === 0) {
                toast.success(`All ${successCount} material(s) saved successfully!`);
                setCurrentBatch(prev => ({
                    ...prev,
                    substages: prev.substages.map(s => ({
                        ...s,
                        bunkerLocked: s.bunkerLocked || Boolean(s.bunker)
                    }))
                }));
                // setIsSaved(true);
            } else if (failCount > 0) {
                toast.warning(`${successCount} saved, ${failCount} failed`);
            } else {
                toast.info('No data to save');
            }
        } catch (err) {
            toast.error('Failed to save batch data');
        } finally {
            setLoading(false);
            setTimeout(() => { isSavingRef.current = false; }, 1000);
        }
    };

    const handleMoveToTunnel = async () => {
        if (!selectedTunnel) { toast.error('Please select a tunnel first'); return; }
        setMovingToTunnel(true);
        try {
            let successCount = 0, failCount = 0;
            for (const materialType of currentBatch.materialTypes) {
                const displayName = MATERIAL_DISPLAY_NAMES[materialType];
                const payload = convertToApiPayload(currentBatch, materialType, true);
                payload.tunnel_id = selectedTunnel;
                const result = await sendToApi(payload, materialType, displayName);
                if (result.success) { successCount++; toast.success(`${displayName} completed and moved to tunnel!`); }
                else { failCount++; toast.error(`Failed to update ${displayName}: ${result.error}`); }
            }
            if (successCount > 0) {
                toast.success(`Batch moved to ${tunnels.find(t => t.id === selectedTunnel)?.name || 'tunnel'} successfully!`);
                setSelectedTunnel('');
                const tunnelsRes = await fetch(`${API_BASE_URL}/tunnels`);
                if (tunnelsRes.ok) {
                    const tunnelsData = await tunnelsRes.json();
                    setTunnels((tunnelsData.data || []).filter(t => t.is_active === false));
                }
            } else {
                toast.error('Failed to move batch to tunnel');
            }
        } catch (err) {
            toast.error('Failed to move batch to tunnel');
        } finally {
            setMovingToTunnel(false);
        }
    };

    const handleBackToSelection = () => {
        setCurrentBatch(null);
        setIsSaved(false);
        router.push('/bunker-management');
        setError(null);
        setInitialBatchNumber(null);
        setInitialBatchId(null);
    };

    if (!currentBatch) {
        return (
            <AppLayout title="Bunker Management">
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
        <AppLayout title="Bunker Management">
            <div className="unified-platform-container">
                <div className="entry-header">
                    <div className="header-left">
                        <button onClick={handleBackToSelection} className="back-button">
                            <ArrowBackIcon />
                        </button>
                        <h2>{currentBatch.batchNumber}</h2>
                        <span className="material-count">({materialsDisplay})</span>
                    </div>

                    <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <select
                            value={selectedTunnel}
                            onChange={e => setSelectedTunnel(e.target.value)}
                            disabled={tunnelLoading || tunnels.length === 0}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e0',
                                fontSize: '13px',
                                color: selectedTunnel ? '#1a202c' : '#718096',
                                background: '#fff',
                                cursor: tunnels.length === 0 ? 'not-allowed' : 'pointer',
                                minWidth: '150px',
                                outline: 'none',
                                height: '36px',
                            }}
                        >
                            <option value="">
                                {tunnelLoading ? 'Loading tunnels...' : tunnels.length === 0 ? 'No tunnels available' : 'Select Tunnel'}
                            </option>
                            {tunnels.map(tunnel => (
                                <option key={tunnel.id} value={tunnel.id}>{tunnel.name}</option>
                            ))}
                        </select>

                        <button
                            onClick={handleMoveToTunnel}
                            disabled={movingToTunnel || tunnelLoading}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '6px 14px', borderRadius: '6px', border: 'none',
                                background: selectedTunnel ? '#2b6cb0' : '#a0aec0',
                                color: '#fff', fontSize: '13px', fontWeight: 600,
                                cursor: movingToTunnel ? 'wait' : 'pointer',
                                height: '36px', transition: 'background 0.15s', whiteSpace: 'nowrap',
                            }}
                        >
                            <ArrowForwardIcon style={{ fontSize: '16px' }} />
                            {movingToTunnel ? 'Moving...' : 'Move to Tunnel'}
                        </button>

                        <button onClick={handleSave} className="btn-save" disabled={loading}>
                            <SaveIcon fontSize="small" />
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>

                <BunkerTable
                    batch={currentBatch}
                    onUpdate={handleUpdateBatch}
                    readOnly={isSaved}
                    bunkers={bunkers}
                    bunkerLoading={bunkerLoading}
                />
            </div>
        </AppLayout>
    );
}
