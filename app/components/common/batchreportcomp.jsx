"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { ToastProvider, useToast } from "../../components/common/Toaster";
import "../../styles/pages/batch-reports.css";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import PropTypes from 'prop-types';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar
} from 'recharts';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import DeviceThermostatIcon from '@mui/icons-material/DeviceThermostat';
import OpacityIcon from '@mui/icons-material/Opacity';

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
    // { id: 2, name: "RESOAKING 1", apiKey: "resoaking_one" },
    // { id: 3, name: "RESOAKING 2", apiKey: "resoaking_two" },
    { id: 3, name: "PLAIN BUNKER", apiKey: "plain_bunker" },
    { id: 4, name: "LONG HEAP", apiKey: "long_heap" },
    { id: 5, name: "DRY MIXING", apiKey: "dry_mixing" },
    { id: 6, name: "1st BP ", apiKey: "bunker_process1" },
    { id: 7, name: "2nd BP", apiKey: "bunker_process2" },
    { id: 8, name: "3rd BP", apiKey: "bunker_process3" },
    { id: 9, name: "TP", apiKey: "tunnel_process" }
];

const MAIN_STAGES = [
    { id: 1, name: "Soaking", key: "soaking" },
    { id: 2, name: "Unified Process", key: "unified_process" },
    { id: 3, name: "Flip Process", key: "flip_process" },
    { id: 4, name: "Bunker Process", key: "bunker_process" },
    { id: 5, name: "Tunnel Management", key: "tunnel_process" }
];

const STAGE_TABS = [
    { id: 'bunker_process1', label: '1st BP', color: '#e53e3e' },
    { id: 'bunker_process1_rest', label: '1st BP Rest', color: '#dd6b20' },
    { id: 'bunker_process2', label: '2nd BP', color: '#3182ce' },
    { id: 'bunker_process2_rest', label: '2nd BP Rest', color: '#805ad5' },
    { id: 'bunker_process3', label: '3rd BP', color: '#38a169' },
    { id: 'bunker_process3_rest', label: '3rd BP Rest', color: '#319795' }
];

const STAGE_DISPLAY_NAMES = {
    'bunker_process1': '1st BP',
    'bunker_process1_rest': '1st BP Rest',
    'bunker_process2': '2nd BP',
    'bunker_process2_rest': '2nd BP Rest',
    'bunker_process3': '3rd BP',
    'bunker_process3_rest': '3rd BP Rest'
};

const STAGE_ORDER = [
    'bunker_process1',
    'bunker_process1_rest',
    'bunker_process2',
    'bunker_process2_rest',
    'bunker_process3',
    'bunker_process3_rest'
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
        return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
    } catch (error) {
        console.error('Error parsing datetime:', error);
        return { date: '', time: '' };
    }
}

function formatDateTimeForDisplay(dateTimeStr) {
    if (!dateTimeStr) return '';
    try {
        const date = new Date(dateTimeStr);
        if (isNaN(date.getTime())) return '';
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${month}/${day} ${hours}:${minutes}`;
    } catch { return ''; }
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
    return entries.find(entry => entry.name && entry.name.toUpperCase() === materialName);
}


const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <p style={{ fontWeight: 700, marginBottom: '6px', color: '#2d3748' }}>{label}</p>
            {payload.map(p => (
                <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                    <span style={{ color: '#4a5568' }}>{p.name}:</span>
                    <span style={{ fontWeight: 600, color: p.color }}>{p.value}°C</span>
                </div>
            ))}
        </div>
    );
};

const CustomBarTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <p style={{ fontWeight: 700, marginBottom: '6px', color: '#2d3748' }}>{label}</p>
            {payload.map(p => (
                <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                    <span style={{ color: '#4a5568' }}>{p.name}:</span>
                    <span style={{ fontWeight: 600, color: p.color }}>{p.value}°C</span>
                </div>
            ))}
            {payload[0]?.payload?.moisture && (
                <div style={{ marginTop: '6px', color: '#718096', fontSize: '11px' }}>Moisture: {payload[0].payload.moisture}%</div>
            )}
        </div>
    );
};


function TemperatureChart({ data, selectedStage, onStageChange }) {
    const filteredData = data.filter(d => d.stageKey === selectedStage);
    const availableStages = STAGE_TABS.filter(tab => data.some(d => d.stageKey === tab.id));
    const allValues = filteredData.map(d => d.avg).filter(v => v != null);

    const tabBar = (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
            {availableStages.map(tab => (
                <button key={tab.id} onClick={() => onStageChange(tab.id)} style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', background: selectedStage === tab.id ? tab.color : '#f0f4f8', color: selectedStage === tab.id ? '#fff' : '#4a5568', boxShadow: selectedStage === tab.id ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>
                    {tab.label}
                </button>
            ))}
        </div>
    );

    if (filteredData.length === 0) {
        return (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginTop: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ color: 'red' }}><DeviceThermostatIcon /></span>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#2d3748' }}>Temperature Trend — Bunker Process</h3>
                </div>
                {tabBar}
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: '#718096' }}>No temperature data available for this stage</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginTop: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ color: 'red' }}><DeviceThermostatIcon /></span>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#2d3748' }}>Temperature Trend — Bunker Process</h3>
            </div>
            {tabBar}
            <ResponsiveContainer width="100%" height={320}>
                <LineChart data={filteredData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="datetime" tick={{ fontSize: 11, fill: '#718096' }} tickLine={false} angle={-30} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11, fill: '#718096' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={v => `${v}°`} label={{ value: '°C', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fill: '#718096' } }} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={30} stroke="#f6ad55" strokeDasharray="4 4" label={{ value: 'Min optimal', position: 'right', fontSize: 10, fill: '#f6ad55' }} />
                    <ReferenceLine y={80} stroke="#fc8181" strokeDasharray="4 4" label={{ value: 'Max optimal', position: 'right', fontSize: 10, fill: '#fc8181' }} />
                    <Line type="monotone" dataKey="avg" name="Temperature" stroke="#e53e3e" strokeWidth={2.5} dot={{ r: 4, fill: '#e53e3e' }} activeDot={{ r: 6 }} connectNulls />
                </LineChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                {[
                    { label: 'Readings', value: filteredData.length },
                    { label: 'Min Temp', value: allValues.length > 0 ? `${Math.min(...allValues).toFixed(1)}°C` : '—' },
                    { label: 'Max Temp', value: allValues.length > 0 ? `${Math.max(...allValues).toFixed(1)}°C` : '—' },
                    { label: 'Average', value: allValues.length > 0 ? `${(allValues.reduce((a, b) => a + b, 0) / allValues.length).toFixed(1)}°C` : '—' }
                ].map(({ label, value }) => (
                    <div key={label} style={{ flex: '1', minWidth: '80px', background: '#f8fafc', borderRadius: '6px', padding: '8px 12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#718096', marginBottom: '2px' }}>{label}</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#2d3748' }}>{value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

TemperatureChart.propTypes = { data: PropTypes.array, selectedStage: PropTypes.string, onStageChange: PropTypes.func };

function AverageTemperatureChart({ stageAverages }) {
    if (!stageAverages || stageAverages.length === 0) {
        return (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '30px', marginTop: '30px', textAlign: 'center' }}>
                <DeviceThermostatIcon style={{ fontSize: '40px', color: '#a0aec0', marginBottom: '10px' }} />
                <h3 style={{ fontSize: '16px', color: '#4a5568', marginBottom: '5px' }}>No Average Temperature Data Available</h3>
                <p style={{ fontSize: '13px', color: '#718096' }}>No stage average temperatures found for this batch.</p>
            </div>
        );
    }

    const sortedData = [...stageAverages].sort((a, b) => STAGE_ORDER.indexOf(a.stageKey) - STAGE_ORDER.indexOf(b.stageKey));
    const validTemps = sortedData.map(d => d.avgTemp).filter(v => v != null);

    return (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginTop: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ color: 'red' }}><DeviceThermostatIcon /></span>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#2d3748' }}>Average Temperature by Stage</h3>
            </div>
            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#718096' }} tickLine={false} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11, fill: '#718096' }} tickLine={false} axisLine={false} domain={[0, 'auto']} tickFormatter={v => `${v}°`} label={{ value: '°C', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fill: '#718096' } }} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <ReferenceLine y={30} stroke="#f6ad55" strokeDasharray="4 4" label={{ value: 'Min optimal', position: 'right', fontSize: 10, fill: '#f6ad55' }} />
                    <ReferenceLine y={80} stroke="#fc8181" strokeDasharray="4 4" label={{ value: 'Max optimal', position: 'right', fontSize: 10, fill: '#fc8181' }} />
                    <Bar dataKey="avgTemp" name="Avg Temperature" fill="#e53e3e" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                {[
                    { label: 'Stages with Data', value: validTemps.length },
                    { label: 'Min Stage Avg', value: validTemps.length > 0 ? `${Math.min(...validTemps).toFixed(1)}°C` : '—' },
                    { label: 'Max Stage Avg', value: validTemps.length > 0 ? `${Math.max(...validTemps).toFixed(1)}°C` : '—' },
                    { label: 'Overall Avg', value: validTemps.length > 0 ? `${(validTemps.reduce((a, b) => a + b, 0) / validTemps.length).toFixed(1)}°C` : '—' }
                ].map(({ label, value }) => (
                    <div key={label} style={{ flex: '1', minWidth: '80px', background: '#f8fafc', borderRadius: '6px', padding: '8px 12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#718096', marginBottom: '2px' }}>{label}</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#2d3748' }}>{value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

AverageTemperatureChart.propTypes = { stageAverages: PropTypes.array };

function TunnelTemperatureChart({ tunnelData }) {
    const tunnelArray = Array.isArray(tunnelData) ? tunnelData : [];
    const [selectedTunnel, setSelectedTunnel] = useState(0);

    if (tunnelArray.length === 0) {
        return (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '30px', marginTop: '30px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '16px', color: '#4a5568', marginBottom: '5px' }}>No Tunnel Process Data Available</h3>
                <p style={{ fontSize: '13px', color: '#718096' }}>No tunnel process temperature readings found for this batch.</p>
            </div>
        );
    }

    const tunnelReadings = tunnelArray.map((tunnel, index) => {
        const readings = [];
        if (tunnel.tunnel_process?.temp_list && Array.isArray(tunnel.tunnel_process.temp_list)) {
            tunnel.tunnel_process.temp_list.forEach(reading => {
                if (reading.date_time && reading.row_avg != null) {
                    readings.push({
                        datetime: formatDateTimeForDisplay(reading.date_time),
                        raw_datetime: reading.date_time,
                        avg: reading.row_avg,
                        sensor1: reading.sensor1,
                        sensor2: reading.sensor2,
                        sensor3: reading.sensor3,
                        sensor4: reading.sensor4,
                    });
                }
            });
        }
        readings.sort((a, b) => new Date(a.raw_datetime) - new Date(b.raw_datetime));
        return {
            label: `Tunnel ${index + 1}`,
            readings,
            avgTemp: tunnel.tunnel_process?.avg_temp,
            moisture: tunnel.tunnel_process?.moisture,
            duration: tunnel.tunnel_process?.duration_hours,
        };
    });

    const TAB_COLORS = ['#3182ce', '#805ad5', '#38a169', '#dd6b20', '#e53e3e', '#319795'];
    const active = tunnelReadings[selectedTunnel];
    const activeColor = TAB_COLORS[selectedTunnel % TAB_COLORS.length];
    const avgValues = active.readings.map(d => d.avg).filter(v => v != null);

    return (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginTop: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ color: '#3182ce', fontSize: '20px' }}>🌡</span>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#2d3748' }}>Tunnel Process Temperature Trend</h3>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                {tunnelReadings.map((t, i) => {
                    const color = TAB_COLORS[i % TAB_COLORS.length];
                    return (
                        <button key={i} onClick={() => setSelectedTunnel(i)} style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', background: selectedTunnel === i ? color : '#f0f4f8', color: selectedTunnel === i ? '#fff' : '#4a5568', boxShadow: selectedTunnel === i ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>
                            {t.label}
                        </button>
                    );
                })}
            </div>
            {active.readings.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={active.readings} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="datetime" tick={{ fontSize: 11, fill: '#718096' }} tickLine={false} angle={-30} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 11, fill: '#718096' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={v => `${v}°`} label={{ value: '°C', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fill: '#718096' } }} />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={25} stroke="#f6ad55" strokeDasharray="4 4" label={{ value: 'Min optimal', position: 'right', fontSize: 10, fill: '#f6ad55' }} />
                        <ReferenceLine y={45} stroke="#fc8181" strokeDasharray="4 4" label={{ value: 'Max optimal', position: 'right', fontSize: 10, fill: '#fc8181' }} />
                        <Line type="monotone" dataKey="avg" name="Temperature" stroke={activeColor} strokeWidth={2.5} dot={{ r: 4, fill: activeColor }} activeDot={{ r: 6 }} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '8px' }}>
                    <p style={{ color: '#718096' }}>No temperature readings for this tunnel</p>
                </div>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                {[
                    { label: 'Readings', value: active.readings.length },
                    { label: 'Min Temp', value: avgValues.length ? `${Math.min(...avgValues).toFixed(1)}°C` : '—' },
                    { label: 'Max Temp', value: avgValues.length ? `${Math.max(...avgValues).toFixed(1)}°C` : '—' },
                    { label: 'Average', value: avgValues.length ? `${(avgValues.reduce((a, b) => a + b, 0) / avgValues.length).toFixed(1)}°C` : '—' },
                    { label: 'Moisture', value: active.moisture != null ? `${active.moisture.toFixed(1)}%` : '—' },
                    { label: 'Duration', value: active.duration != null ? `${active.duration.toFixed(1)} hrs` : '—' },
                ].map(({ label, value }) => (
                    <div key={label} style={{ flex: '1', minWidth: '80px', background: '#f8fafc', borderRadius: '6px', padding: '8px 12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#718096', marginBottom: '2px' }}>{label}</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#2d3748' }}>{value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

TunnelTemperatureChart.propTypes = { tunnelData: PropTypes.array };


function StageStatus({ batchData }) {
    if (!batchData) return null;
    const { current_stage, status } = batchData;

    if (status === "completed") {
        return (
            <div className="stage-status-section">
                <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '15px' }}>Batch Progress Status</h3>
                <div className="status-card completed">
                    <div className="status-header"><span className="status-badge completed">Completed</span></div>
                    <p className="status-message">This batch has been completed successfully</p>
                </div>
            </div>
        );
    }

    const currentStageIndex = MAIN_STAGES.findIndex(stage => stage.name.toLowerCase() === current_stage?.toLowerCase());
    const previousStage = currentStageIndex > 0 ? MAIN_STAGES[currentStageIndex - 1] : null;
    const nextStage = currentStageIndex < MAIN_STAGES.length - 1 ? MAIN_STAGES[currentStageIndex + 1] : null;

    return (
        <div className="stage-status-section">
            <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '15px' }}>Batch Progress Status</h3>
            <div className="status-container">
                <div className="status-card current">
                    <div className="status-header"><span className="status-badge in-progress">In Progress</span></div>
                    <div className="stage-info">
                        <span className="stage-label">Current Stage:</span>
                        <span className="stage-value current">{current_stage || 'Not started'}</span>
                    </div>
                </div>
                {(previousStage || nextStage) && (
                    <div className="stage-navigation">
                        {previousStage && (
                            <div className="stage-card previous">
                                <div className="stage-details">
                                    <ArrowForwardIcon className="nav-icon" />
                                    <span className="stage-label">Previous Stage</span>
                                    <span className="stage-name">{previousStage.name}</span>
                                </div>
                            </div>
                        )}
                        {nextStage && (
                            <div className="stage-card next">
                                <div className="stage-details">
                                    <ArrowBackIcon className="nav-icon" />
                                    <span className="stage-label">Next Stage</span>
                                    <span className="stage-name">{nextStage.name}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

StageStatus.propTypes = { batchData: PropTypes.object };

function FormulationTable({ entries = [], batchData = {} }) {
    const readOnlyStyle = { background: "#f0f4f8", cursor: "not-allowed" };
    const totalCellStyle = { border: "1px solid", fontWeight: "bold", padding: "2px 3px", textAlign: "center", fontSize: "0.92em" };

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
                            <th>S.NO</th><th>RAW MATERIALS</th><th>FRESH WEIGHT</th><th>MOIST %</th>
                            <th>DRY WT</th><th>N2 %</th><th>TOTAL N2</th><th>ASH %</th><th>TOTAL ASH</th><th>%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ALL_MATERIALS.map((material) => {
                            const entry = findMatchingEntry(entries, material.name);
                            return (
                                <tr key={material.id}>
                                    <td>{material.id}</td>
                                    <td>{material.name}</td>
                                    <td><input type="text" value={entry?.wet_weight ? formatWithCommas(entry.wet_weight) : "-"} readOnly className="table-input" style={readOnlyStyle} /></td>
                                    <td><input type="text" value={entry?.moisture_percent || "-"} readOnly className="table-input" style={readOnlyStyle} /></td>
                                    <td><input type="text" value={entry?.dry_weight ? formatWithCommas(entry.dry_weight) : "-"} readOnly className="table-input" style={readOnlyStyle} /></td>
                                    <td><input type="text" value={entry?.nitrogen_percent || "-"} readOnly className="table-input" style={readOnlyStyle} /></td>
                                    <td><input type="text" value={entry?.nitrogen_total ? formatWithCommas(entry.nitrogen_total) : "-"} readOnly className="table-input" style={readOnlyStyle} /></td>
                                    <td><input type="text" value={entry?.ash_percent || "-"} readOnly className="table-input" style={readOnlyStyle} /></td>
                                    <td><input type="text" value={entry?.ash_total ? formatWithCommas(entry.ash_total) : "-"} readOnly className="table-input" style={readOnlyStyle} /></td>
                                    <td><input type="text" value={entry?.total_percent || "-"} readOnly className="table-input" style={readOnlyStyle} /></td>
                                </tr>
                            );
                        })}
                        <tr className="totals-row">
                            <td colSpan={4} style={{ textAlign: "center", fontWeight: "bolder", color: "black" }}>TOTAL</td>
                            <td style={totalCellStyle}>{totals.totalDryWt > 0 ? formatWithCommas(totals.totalDryWt) : ""}</td>
                            <td></td>
                            <td style={totalCellStyle}>{totals.totalN2 > 0 ? formatWithCommas(totals.totalN2) : ""}</td>
                            <td></td>
                            <td style={totalCellStyle}>{totals.totalAsh > 0 ? formatWithCommas(totals.totalAsh) : ""}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="totals-container">
                <div className="total-item"><span className="total-label">C/M % =</span><input type="text" readOnly value={batchData?.cm_ratio || ""} className="total-input" style={readOnlyStyle} /></div>
                <div className="total-item"><span className="total-label">N2 =</span><input type="text" readOnly value={batchData?.n2_ratio || ""} className="total-input" style={readOnlyStyle} /></div>
                <div className="total-item"><span className="total-label">ASH =</span><input type="text" readOnly value={batchData?.ash_ratio || ""} className="total-input" style={readOnlyStyle} /></div>
                <br />
                <div className="total-item"><span className="total-label">C:N =</span><input type="text" readOnly value={batchData?.cn_ratio || ""} className="total-input" style={readOnlyStyle} /></div>
            </div>
        </div>
    );
}

FormulationTable.propTypes = { entries: PropTypes.array, batchData: PropTypes.object };

function OperationTimelineTable({ operationData = {} }) {
    const readOnlyStyle = { background: "#f0f4f8", cursor: "not-allowed" };
    const totalCellStyle = { border: "1px solid", fontWeight: "bold", padding: "2px 3px", textAlign: "center", fontSize: "0.92em" };

    const totals = Object.values(operationData).reduce((acc, op) => {
        acc.totalOperation += (op.operation_hours || 0);
        acc.totalResting += (op.rest_hours || 0);
        return acc;
    }, { totalOperation: 0, totalResting: 0 });

    return (
        <div className="formulation-table-container" style={{ marginTop: "30px" }}>
            <h3 className="table-title">Operation Timeline</h3>
            <div className="table-wrapper">
                <table className="materials-table">
                    <thead>
                        <tr>
                            <th>S.NO</th><th>OPERATION STAGE</th><th>OPERATION TIME (hrs)</th><th>RESTING TIME (hrs)</th><th>REMARKS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {OPERATION_STAGES.map((stage) => {
                            const operation = operationData[stage.apiKey] || { operation_hours: 0, rest_hours: 0 };
                            return (
                                <tr key={stage.id}>
                                    <td>{stage.id}</td>
                                    <td>{stage.name}</td>
                                    <td><input type="text" value={operation.operation_hours?.toFixed(1) || "0.0"} readOnly className="table-input" style={readOnlyStyle} /></td>
                                    <td><input type="text" value={operation.rest_hours?.toFixed(1) || "0.0"} readOnly className="table-input" style={readOnlyStyle} /></td>
                                    <td><input type="text" readOnly className="table-input" style={readOnlyStyle} /></td>
                                </tr>
                            );
                        })}
                        <tr className="totals-row">
                            <td colSpan={2} style={{ textAlign: "center", fontWeight: "bolder", color: "black" }}>TOTAL</td>
                            <td style={totalCellStyle}>{totals.totalOperation > 0 ? totals.totalOperation.toFixed(1) : "0.0"}</td>
                            <td style={totalCellStyle}>{totals.totalResting > 0 ? totals.totalResting.toFixed(1) : "0.0"}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

OperationTimelineTable.propTypes = { operationData: PropTypes.object };

function BatchSummary({ batchData }) {
    if (!batchData) return null;
    const startDateTime = batchData.start_date || batchData.start_time;
    const plannedDateTime = batchData.planned_comp_date || batchData.planned_comp_time;
    const { date: startDate, time: startTime } = parseDateTime(startDateTime);
    const { date: plannedDate, time: plannedTime } = parseDateTime(plannedDateTime);
    const totalHours = calculateTotalHours(startDateTime, plannedDateTime);
    const formatDisplayDateTime = (dateStr, timeStr) => !dateStr ? 'Not set' : `${dateStr} ${timeStr || ''}`;

    return (
        <div className="batch-summary-section">
            <h2 className="section-title">Batch Summary</h2>
            <div className="batch-info-grid">
                <div className="form-group">
                    <label className="form-label">Batch Number</label>
                    <input type="text" value={batchData.batch_number || ''} readOnly className="form-input" style={{ background: "#f0f4f8" }} />
                </div>
                <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input type="text" value={formatDisplayDateTime(startDate, startTime)} readOnly className="form-input" style={{ background: "#f0f4f8" }} />
                </div>
                <div className="form-group">
                    <label className="form-label">Planned Completion</label>
                    <input type="text" value={formatDisplayDateTime(plannedDate, plannedTime)} readOnly className="form-input" style={{ background: "#f0f4f8" }} />
                </div>
                <div className="form-group">
                    <label className="form-label">Total Hours</label>
                    <input type="text" value={totalHours ? `${totalHours} hrs` : 'Not calculated'} readOnly className="form-input" style={{ background: "#f0f4f8" }} />
                </div>
            </div>
            {batchData.remarks && (
                <div className="comments-group">
                    <label className="form-label">Remarks</label>
                    <textarea value={batchData.remarks} readOnly className="form-textarea" rows="2" style={{ background: "#f0f4f8" }} />
                </div>
            )}
        </div>
    );
}

BatchSummary.propTypes = { batchData: PropTypes.object };


export default function BatchReportsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const toast = useToast();
    const reportContentRef = useRef(null);

    const bunkerChartRef = useRef(null);
    const avgChartRef    = useRef(null);
    const tunnelChartRef = useRef(null);

    const [batchId, setBatchId] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [batchData, setBatchData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [temperatureData, setTemperatureData] = useState([]);
    const [stageAverages, setStageAverages] = useState([]);
    const [tunnelData, setTunnelData] = useState([]);
    const [selectedStage, setSelectedStage] = useState('bunker_process1');

    useEffect(() => {
        const urlBatchId = searchParams.get('batchId');
        const urlBatchName = searchParams.get('name');
        if (urlBatchId) {
            setSearchInput(urlBatchId);
            if (urlBatchName) console.log('Loading batch:', urlBatchName);
            fetchBatchReport(urlBatchId);
        }
    }, [searchParams]);

    useEffect(() => {
        if (temperatureData.length > 0) {
            const availableStages = [...new Set(temperatureData.map(d => d.stageKey))];
            if (availableStages.length > 0 && !availableStages.includes(selectedStage)) {
                setSelectedStage(availableStages[0]);
            }
        }
    }, [temperatureData]);

    const fetchBunkerProcessLogs = async (batchId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/bunker-process-logs/batch/${batchId}`);
            if (!response.ok) { if (response.status === 404) return []; throw new Error(`Failed: ${response.status}`); }
            const responseData = await response.json();
            const tempReadings = [];
            const avgTemperatures = [];

            if (responseData.success && responseData.data && responseData.data.items) {
                responseData.data.items.forEach(item => {
                    const stages = ['bunker_process1', 'bunker_process1_rest', 'bunker_process2', 'bunker_process2_rest', 'bunker_process3', 'bunker_process3_rest'];
                    stages.forEach(stageKey => {
                        const stage = item[stageKey];
                        if (stage) {
                            if (stage.avg_temp != null) {
                                avgTemperatures.push({ stageKey, stage: STAGE_DISPLAY_NAMES[stageKey] || stageKey, avgTemp: stage.avg_temp, moisture: stage.moisture });
                            }
                            if (stage.temp_list && Array.isArray(stage.temp_list)) {
                                stage.temp_list.forEach(reading => {
                                    if (reading.date_time && reading.row_avg) {
                                        tempReadings.push({ datetime: formatDateTimeForDisplay(reading.date_time), raw_datetime: reading.date_time, avg: reading.row_avg, stage: STAGE_DISPLAY_NAMES[stageKey] || stageKey, stageKey, sensor1: reading.sensor1, sensor2: reading.sensor2, sensor3: reading.sensor3, sensor4: reading.sensor4 });
                                    }
                                });
                            }
                        }
                    });
                });
            }

            tempReadings.sort((a, b) => new Date(a.raw_datetime) - new Date(b.raw_datetime));
            setStageAverages(avgTemperatures);
            return tempReadings;
        } catch (error) {
            console.error('Error fetching bunker logs:', error);
            return [];
        }
    };

    const fetchTunnelProcessLogs = async (batchId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/tunnel-process-logs/batch/${batchId}`);
            if (!response.ok) { if (response.status === 404) return []; throw new Error(`Failed: ${response.status}`); }
            const responseData = await response.json();
            if (responseData.success) {
                if (Array.isArray(responseData.data)) return responseData.data;
                if (responseData.data?.items && Array.isArray(responseData.data.items)) return responseData.data.items;
            }
            return [];
        } catch (error) {
            console.error('Error fetching tunnel logs:', error);
            return [];
        }
    };

    const fetchBatchReport = async (id) => {
        if (!id) return;
        try {
            setLoading(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;

            const batchResponse = await fetch(`${apiUrl}/batches/${id}`);
            let batchInfo = {};
            if (batchResponse.ok) { const r = await batchResponse.json(); batchInfo = r.data || r; }

            const timelineResponse = await fetch(`${apiUrl}/batches/reports/${id}`);
            let operationTimeline = {};
            if (timelineResponse.ok) { const r = await timelineResponse.json(); if (r.status && r.data) operationTimeline = r.data; }

            const tempData = await fetchBunkerProcessLogs(id);
            setTemperatureData(tempData);

            const tunnelLogs = await fetchTunnelProcessLogs(id);
            setTunnelData(tunnelLogs);

            const combinedData = { ...batchInfo, operation_timeline: operationTimeline, formulation_entries: batchInfo.formulation_entries || [] };
            setBatchData(combinedData);
            setBatchId(id);
            if (batchInfo.batch_number) setSearchInput(batchInfo.batch_number);

            let msg = 'Report loaded successfully';
            const parts = [];
            if (tempData.length > 0) parts.push(`${tempData.length} bunker readings`);
            if (tunnelLogs.length > 0) parts.push(`${tunnelLogs.length} tunnel records`);
            if (parts.length) msg = `Loaded ${parts.join(' and ')}`;
            toast.success(msg);
        } catch (error) {
            toast.error('Failed to load batch report');
            console.error('Error loading report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        if (!searchInput.trim()) { toast.error('Please enter a Batch ID or Number'); return; }
        router.push(`/batch-reports?batchId=${searchInput}`);
        fetchBatchReport(searchInput);
    };

    const handleKeyPress = (e) => { if (e.key === 'Enter') handleSearch(); };

    const captureChart = async (ref) => {
        if (!ref?.current) return null;
        try {
            const canvas = await html2canvas(ref.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });
            return canvas.toDataURL('image/png');
        } catch (e) {
            console.error('Chart capture failed:', e);
            return null;
        }
    };

    const handlePrint = async () => {
        if (!batchData) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) { toast.error('Please allow pop-ups to print'); return; }

        setPrinting(true);
        toast.info('Capturing charts, please wait…');

        // Capture all three chart divs as base64 images
        const [bunkerImg, avgImg, tunnelImg] = await Promise.all([
            captureChart(bunkerChartRef),
            captureChart(avgChartRef),
            captureChart(tunnelChartRef),
        ]);

        setPrinting(false);

        const fmt = (v) => v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
        const fmtNum = (v) => (v != null && v !== '' ? v : '—');

        const startDate   = batchData.start_date || batchData.start_time;
        const plannedDate = batchData.planned_comp_date || batchData.planned_comp_time;
        const totalHours  = calculateTotalHours(startDate, plannedDate);

        const imgTag = (src, label) => src
            ? `<div class="chart-block avoid-break">
                 <div class="chart-label">${label}</div>
                 <img src="${src}" class="chart-img" alt="${label}" />
               </div>`
            : `<div class="chart-block avoid-break">
                 <div class="chart-label">${label}</div>
                 <div class="chart-empty">No data available for this chart</div>
               </div>`;

        const materialRows = ALL_MATERIALS.map((m) => {
            const e = findMatchingEntry(batchData.formulation_entries || [], m.name);
            return `<tr>
              <td>${m.id}</td><td class="left">${m.name}</td>
              <td>${e?.wet_weight     ? formatWithCommas(e.wet_weight)     : '—'}</td>
              <td>${fmtNum(e?.moisture_percent)}</td>
              <td>${e?.dry_weight     ? formatWithCommas(e.dry_weight)     : '—'}</td>
              <td>${fmtNum(e?.nitrogen_percent)}</td>
              <td>${e?.nitrogen_total ? formatWithCommas(e.nitrogen_total) : '—'}</td>
              <td>${fmtNum(e?.ash_percent)}</td>
              <td>${e?.ash_total      ? formatWithCommas(e.ash_total)      : '—'}</td>
              <td>${fmtNum(e?.total_percent)}</td>
            </tr>`;
        }).join('');

        const totals = (batchData.formulation_entries || []).reduce((acc, e) => {
            acc.dw  += e.dry_weight     || 0;
            acc.n2  += e.nitrogen_total || 0;
            acc.ash += e.ash_total      || 0;
            return acc;
        }, { dw: 0, n2: 0, ash: 0 });

        const opRows = OPERATION_STAGES.map((s) => {
            const op    = batchData.operation_timeline?.[s.apiKey] || {};
            const opH   = op.operation_hours ?? 0;
            const restH = op.rest_hours      ?? 0;
            let remark  = '—';
            if (opH === 0 && restH === 0)    remark = 'Not started';
            else if (opH > 0 && restH === 0) remark = 'In progress';
            else if (opH > 0 && restH > 0)   remark = 'Completed';
            const badge = remark === 'Completed'   ? 'badge-done'
                        : remark === 'In progress' ? 'badge-wip'
                        : 'badge-pending';
            return `<tr>
              <td>${s.id}</td><td class="left">${s.name}</td>
              <td>${opH.toFixed(1)}</td><td>${restH.toFixed(1)}</td>
              <td><span class="badge ${badge}">${remark}</span></td>
            </tr>`;
        }).join('');

        const opTotals = OPERATION_STAGES.reduce((acc, s) => {
            const op = batchData.operation_timeline?.[s.apiKey] || {};
            acc.op   += op.operation_hours || 0;
            acc.rest += op.rest_hours      || 0;
            return acc;
        }, { op: 0, rest: 0 });

        const bpTemps = temperatureData.map(d => d.avg).filter(v => v != null);
        const bpMin   = bpTemps.length ? Math.min(...bpTemps).toFixed(1) : '—';
        const bpMax   = bpTemps.length ? Math.max(...bpTemps).toFixed(1) : '—';
        const bpAvg   = bpTemps.length ? (bpTemps.reduce((a, b) => a + b, 0) / bpTemps.length).toFixed(1) : '—';

        const tunnelTemps = (Array.isArray(tunnelData) ? tunnelData : []).map(t => t.tunnel_process?.avg_temp).filter(v => v != null);
        const tpMin = tunnelTemps.length ? Math.min(...tunnelTemps).toFixed(1) : '—';
        const tpMax = tunnelTemps.length ? Math.max(...tunnelTemps).toFixed(1) : '—';
        const tpAvg = tunnelTemps.length ? (tunnelTemps.reduce((a, b) => a + b, 0) / tunnelTemps.length).toFixed(1) : '—';

        const stageAvgRows = [...(stageAverages || [])]
            .sort((a, b) => STAGE_ORDER.indexOf(a.stageKey) - STAGE_ORDER.indexOf(b.stageKey))
            .map(s => `<tr><td class="left">${s.stage}</td><td>${s.avgTemp?.toFixed(1) ?? '—'}°C</td><td>${s.moisture?.toFixed(1) ?? '—'}%</td></tr>`)
            .join('');

        const tunnelRows = (Array.isArray(tunnelData) ? tunnelData : []).map((t, i) => {
            const tp = t.tunnel_process || {};
            return `<tr>
              <td>${i + 1}</td>
              <td>${fmt(tp.start_time)}</td>
              <td>${fmt(tp.end_time)}</td>
              <td>${tp.duration_hours?.toFixed(1) ?? '—'} hrs</td>
              <td>${tp.avg_temp?.toFixed(1)     ?? '—'}°C</td>
              <td>${tp.moisture?.toFixed(1)      ?? '—'}%</td>
              <td class="left">${tp.remarks || '—'}</td>
            </tr>`;
        }).join('');

        const statusHtml = batchData.status === 'completed'
            ? `<span class="status-pill done">✓ Completed</span>`
            : `<span class="status-pill wip">⟳ ${batchData.current_stage || 'In Progress'}</span>`;

        printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Batch Report — ${batchData.batch_number || batchId}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 11px; color: #1a202c; background: #fff; line-height: 1.5; }

    @page { size: A4 landscape; margin: 12mm 14mm; }

    /* Header */
    .report-header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #1a365d; padding-bottom: 10px; margin-bottom: 16px; }
    .brand-name { font-size: 20px; font-weight: 700; color: #1a365d; letter-spacing: 0.5px; text-transform: uppercase; }
    .brand-sub  { font-size: 10px; color: #718096; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px; }
    .report-meta { text-align: right; font-size: 10px; color: #4a5568; }
    .batch-no { font-size: 16px; font-weight: 700; color: #1a365d; }

    /* Section titles */
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #1a365d; border-left: 4px solid #2b6cb0; padding-left: 8px; margin: 18px 0 8px; }

    /* Summary grid */
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 4px; }
    .summary-card { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 10px; }
    .card-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; color: #718096; margin-bottom: 3px; }
    .card-value { font-size: 13px; font-weight: 700; color: #1a202c; }

    /* Pills */
    .status-pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; }
    .status-pill.done { background: #c6f6d5; color: #22543d; }
    .status-pill.wip  { background: #bee3f8; color: #1a365d; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #1a365d; color: #fff; padding: 5px 6px; text-align: center; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #2d3748; }
    td.left { text-align: left; }
    tr:nth-child(even) td { background: #f7fafc; }
    .totals-row td { background: #ebf8ff !important; font-weight: 700; color: #1a365d; border-top: 2px solid #2b6cb0; }

    /* Ratio chips */
    .ratio-row { display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
    .ratio-chip { background: #1a365d; color: #fff; border-radius: 4px; padding: 4px 12px; font-size: 10px; font-weight: 700; }
    .ratio-chip span { font-weight: 400; opacity: 0.8; }

    /* Badges */
    .badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 9px; font-weight: 700; }
    .badge-done    { background: #c6f6d5; color: #22543d; }
    .badge-wip     { background: #fefcbf; color: #744210; }
    .badge-pending { background: #e2e8f0; color: #4a5568; }

    /* Temperature stat panels */
    .temp-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 4px; }
    .temp-panel { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    .temp-panel-header { background: #2b6cb0; color: #fff; padding: 6px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .temp-panel-body { display: flex; }
    .temp-stat { flex: 1; padding: 8px 10px; border-right: 1px solid #e2e8f0; text-align: center; }
    .temp-stat:last-child { border-right: none; }
    .ts-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; color: #718096; margin-bottom: 3px; }
    .ts-value { font-size: 14px; font-weight: 700; color: #1a365d; }

    /* Chart images */
    .chart-block { margin-top: 16px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    .chart-label { background: #2b6cb0; color: #fff; padding: 6px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .chart-img { width: 100%; display: block; }
    .chart-empty { padding: 30px; text-align: center; color: #718096; font-size: 11px; background: #f8fafc; }

    /* Remarks */
    .remarks-box { background: #fffbeb; border: 1px solid #f6e05e; border-radius: 4px; padding: 8px 12px; font-size: 10px; color: #744210; margin-top: 6px; }

    /* Footer */
    .report-footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #a0aec0; }

    /* Page breaks */
    .page-break  { page-break-before: always; }
    .avoid-break { page-break-inside: avoid; }

    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="report-header">
    <div>
      <div class="brand-name">Mushroom Batch Report</div>
      <div class="brand-sub">Compost Management System — Detailed Analytics</div>
    </div>
    <div class="report-meta">
      <div class="batch-no">${batchData.batch_number || batchId}</div>
      <div>Generated: ${new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      <div style="margin-top:4px">${statusHtml}</div>
    </div>
  </div>

  <!-- BATCH SUMMARY -->
  <div class="section-title">Batch Summary</div>
  <div class="summary-grid avoid-break">
    <div class="summary-card"><div class="card-label">Batch Number</div><div class="card-value">${batchData.batch_number || '—'}</div></div>
    <div class="summary-card"><div class="card-label">Start Date</div><div class="card-value" style="font-size:11px">${fmt(startDate)}</div></div>
    <div class="summary-card"><div class="card-label">Planned Completion</div><div class="card-value" style="font-size:11px">${fmt(plannedDate)}</div></div>
    <div class="summary-card"><div class="card-label">Total Duration</div><div class="card-value">${totalHours ? totalHours + ' hrs' : '—'}</div></div>
  </div>
  ${batchData.remarks ? `<div class="remarks-box">📝 <strong>Remarks:</strong> ${batchData.remarks}</div>` : ''}

  <!-- RAW MATERIALS -->
  <div class="section-title">Raw Materials Formulation</div>
  <div class="avoid-break">
    <table>
      <thead>
        <tr>
          <th>#</th><th style="text-align:left">Raw Material</th><th>Fresh Wt</th><th>Moist %</th>
          <th>Dry Wt</th><th>N₂ %</th><th>Total N₂</th><th>Ash %</th><th>Total Ash</th><th>%</th>
        </tr>
      </thead>
      <tbody>
        ${materialRows}
        <tr class="totals-row">
          <td colspan="4" style="text-align:center">TOTAL</td>
          <td>${totals.dw  > 0 ? formatWithCommas(totals.dw)  : '—'}</td><td></td>
          <td>${totals.n2  > 0 ? formatWithCommas(totals.n2)  : '—'}</td><td></td>
          <td>${totals.ash > 0 ? formatWithCommas(totals.ash) : '—'}</td><td></td>
        </tr>
      </tbody>
    </table>
    <div class="ratio-row">
      <div class="ratio-chip"><span>C/M % = </span>${batchData.cm_ratio  ?? '—'}</div>
      <div class="ratio-chip"><span>N₂ = </span>${batchData.n2_ratio     ?? '—'}</div>
      <div class="ratio-chip"><span>ASH = </span>${batchData.ash_ratio   ?? '—'}</div>
      <div class="ratio-chip"><span>C:N = </span>${batchData.cn_ratio    ?? '—'}</div>
    </div>
  </div>

  <!-- OPERATION TIMELINE -->
  <div class="section-title page-break">Operation Timeline</div>
  <div class="avoid-break">
    <table>
      <thead>
        <tr><th>#</th><th style="text-align:left">Stage</th><th>Operation (hrs)</th><th>Resting (hrs)</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${opRows}
        <tr class="totals-row">
          <td colspan="2" style="text-align:center">TOTAL</td>
          <td>${opTotals.op.toFixed(1)}</td><td>${opTotals.rest.toFixed(1)}</td><td></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- TEMPERATURE STAT PANELS -->
  <div class="section-title">Temperature Summary</div>
  <div class="temp-grid avoid-break">
    <div class="temp-panel">
      <div class="temp-panel-header">🌡 Bunker Process — ${temperatureData.length} readings</div>
      <div class="temp-panel-body">
        <div class="temp-stat"><div class="ts-label">Min Temp</div><div class="ts-value">${bpMin}${bpMin !== '—' ? '°C' : ''}</div></div>
        <div class="temp-stat"><div class="ts-label">Max Temp</div><div class="ts-value">${bpMax}${bpMax !== '—' ? '°C' : ''}</div></div>
        <div class="temp-stat"><div class="ts-label">Average</div><div class="ts-value">${bpAvg}${bpAvg !== '—' ? '°C' : ''}</div></div>
        <div class="temp-stat"><div class="ts-label">Readings</div><div class="ts-value">${temperatureData.length}</div></div>
      </div>
    </div>
    <div class="temp-panel">
      <div class="temp-panel-header" style="background:#2c7a7b">🌡 Tunnel Process — ${tunnelTemps.length} records</div>
      <div class="temp-panel-body">
        <div class="temp-stat"><div class="ts-label">Min Avg</div><div class="ts-value">${tpMin}${tpMin !== '—' ? '°C' : ''}</div></div>
        <div class="temp-stat"><div class="ts-label">Max Avg</div><div class="ts-value">${tpMax}${tpMax !== '—' ? '°C' : ''}</div></div>
        <div class="temp-stat"><div class="ts-label">Overall Avg</div><div class="ts-value">${tpAvg}${tpAvg !== '—' ? '°C' : ''}</div></div>
        <div class="temp-stat"><div class="ts-label">Tunnels</div><div class="ts-value">${(Array.isArray(tunnelData) ? tunnelData : []).length}</div></div>
      </div>
    </div>
  </div>

  <!-- CHART IMAGES (base64) -->
  <div class="section-title page-break">Temperature Charts</div>
  ${imgTag(bunkerImg, '📈 Bunker Process — Temperature Trend by Stage')}
  ${imgTag(avgImg,    '📊 Bunker Process — Average Temperature by Stage')}
  ${imgTag(tunnelImg, '📈 Tunnel Process — Temperature Trend')}



  <!-- FOOTER -->
  <div class="report-footer">
    <span>Batch: ${batchData.batch_number || batchId} &nbsp;|&nbsp; ${new Date().toLocaleString()}</span>
    <span>System-generated — Compost Management System</span>
  </div>

</body>
</html>`);

        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 700);
    };

    const handleExportPDF = async () => {
        try {
            if (!batchData) return;
            const doc = new jsPDF();
            let yPos = 20;

            doc.setFontSize(16);
            doc.text(`Batch Report - ${batchData.batch_number || batchId}`, 14, yPos); yPos += 10;
            doc.setFontSize(14); doc.text('Batch Summary', 14, yPos); yPos += 7;
            doc.setFontSize(10);

            const startDate   = batchData.start_date || batchData.start_time;
            const plannedDate = batchData.planned_comp_date || batchData.planned_comp_time;
            const totalHours  = calculateTotalHours(startDate, plannedDate);

            doc.text(`Batch Number: ${batchData.batch_number || ''}`, 14, yPos); yPos += 6;
            doc.text(`Start Date: ${startDate ? new Date(startDate).toLocaleString() : 'Not set'}`, 14, yPos); yPos += 6;
            doc.text(`Planned Completion: ${plannedDate ? new Date(plannedDate).toLocaleString() : 'Not set'}`, 14, yPos); yPos += 6;
            doc.text(`Total Hours: ${totalHours || 'Not calculated'}`, 14, yPos); yPos += 6;
            if (batchData.remarks) { doc.text(`Remarks: ${batchData.remarks}`, 14, yPos); yPos += 10; } else { yPos += 4; }

            doc.setFontSize(14); doc.text('Raw Materials Formulation', 14, yPos); yPos += 5;

            const formulationColumn = ["S.No", "Material", "Fresh Wt", "Moist %", "Dry Wt", "N2 %", "Total N2", "Ash %", "Total Ash", "%"];
            const formulationRows = ALL_MATERIALS.map((material) => {
                const entry = findMatchingEntry(batchData.formulation_entries, material.name);
                return [material.id, material.name, entry?.wet_weight || '-', entry?.moisture_percent || '-', entry?.dry_weight || '-', entry?.nitrogen_percent || '-', entry?.nitrogen_total || '-', entry?.ash_percent || '-', entry?.ash_total || '-', entry?.total_percent || '-'];
            });

            doc.autoTable({ head: [formulationColumn], body: formulationRows, startY: yPos + 5, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [41, 128, 185], textColor: 255 } });
            yPos = doc.lastAutoTable.finalY + 10;

            doc.setFontSize(14); doc.text('Operation Timeline', 14, yPos);
            const operationColumn = ["S.No", "Operation Stage", "Operation Time", "Resting Time", "Remarks"];
            const operationRows = OPERATION_STAGES.map((stage) => {
                const operation = batchData.operation_timeline?.[stage.apiKey] || { operation_hours: 0, rest_hours: 0 };
                let remarks = "-";
                if (operation.operation_hours === 0 && operation.rest_hours === 0) remarks = "Not started";
                else if (operation.operation_hours > 0 && operation.rest_hours === 0) remarks = "In progress";
                else if (operation.operation_hours > 0 && operation.rest_hours > 0) remarks = "Completed";
                return [stage.id, stage.name, operation.operation_hours?.toFixed(1) || '0.0', operation.rest_hours?.toFixed(1) || '0.0', remarks];
            });

            doc.autoTable({ head: [operationColumn], body: operationRows, startY: yPos + 5, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [41, 128, 185], textColor: 255 } });

            // Embed chart images into PDF
            const chartsToCap = [
                { ref: bunkerChartRef, label: 'Bunker Process Temperature' },
                { ref: avgChartRef,    label: 'Average Temperature by Stage' },
                { ref: tunnelChartRef, label: 'Tunnel Process Temperature' },
            ];

            for (const { ref, label } of chartsToCap) {
                const img = await captureChart(ref);
                if (img) {
                    yPos = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : yPos + 15;
                    if (yPos > 240) { doc.addPage(); yPos = 20; }
                    doc.setFontSize(13); doc.text(label, 14, yPos); yPos += 5;
                    const pageW = doc.internal.pageSize.getWidth() - 28;
                    doc.addImage(img, 'PNG', 14, yPos, pageW, pageW * 0.38);
                    yPos += pageW * 0.38 + 8;
                }
            }

            doc.save(`batch-report-${batchData.batch_number || batchId}.pdf`);
            toast.success('PDF exported successfully');
        } catch (error) {
            console.error('PDF export error:', error);
            toast.error('Failed to export PDF');
        }
    };

    const handleExportExcel = () => {
        try {
            if (!batchData) return;
            const wb = XLSX.utils.book_new();

            const startDate   = batchData.start_date || batchData.start_time;
            const plannedDate = batchData.planned_comp_date || batchData.planned_comp_time;
            const totalHours  = calculateTotalHours(startDate, plannedDate);

            const summarySheet = XLSX.utils.aoa_to_sheet([
                ['Batch Summary'],
                ['Batch Number', batchData.batch_number || ''],
                ['Start Date', startDate ? new Date(startDate).toLocaleString() : 'Not set'],
                ['Planned Completion', plannedDate ? new Date(plannedDate).toLocaleString() : 'Not set'],
                ['Total Hours', totalHours || 'Not calculated'],
                ['Remarks', batchData.remarks || '']
            ]);
            XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

            const formulationSheet = XLSX.utils.aoa_to_sheet([
                ['S.No', 'Material', 'Fresh Weight', 'Moist %', 'Dry Wt', 'N2 %', 'Total N2', 'Ash %', 'Total Ash', '%'],
                ...ALL_MATERIALS.map((material) => {
                    const entry = findMatchingEntry(batchData.formulation_entries, material.name);
                    return [material.id, material.name, entry?.wet_weight || '-', entry?.moisture_percent || '-', entry?.dry_weight || '-', entry?.nitrogen_percent || '-', entry?.nitrogen_total || '-', entry?.ash_percent || '-', entry?.ash_total || '-', entry?.total_percent || '-'];
                })
            ]);
            XLSX.utils.book_append_sheet(wb, formulationSheet, 'Formulation');

            const operationSheet = XLSX.utils.aoa_to_sheet([
                ['S.No', 'Operation Stage', 'Operation Time (hrs)', 'Resting Time (hrs)', 'Remarks'],
                ...OPERATION_STAGES.map((stage) => {
                    const operation = batchData.operation_timeline?.[stage.apiKey] || { operation_hours: 0, rest_hours: 0 };
                    let remarks = "-";
                    if (operation.operation_hours === 0 && operation.rest_hours === 0) remarks = "Not started";
                    else if (operation.operation_hours > 0 && operation.rest_hours === 0) remarks = "In progress";
                    else if (operation.operation_hours > 0 && operation.rest_hours > 0) remarks = "Completed";
                    return [stage.id, stage.name, operation.operation_hours?.toFixed(1) || '0.0', operation.rest_hours?.toFixed(1) || '0.0', remarks];
                })
            ]);
            XLSX.utils.book_append_sheet(wb, operationSheet, 'Operation Timeline');

            if (temperatureData.length > 0) {
                const tempSheet = XLSX.utils.aoa_to_sheet([
                    ['Date/Time', 'Stage', 'Temperature (°C)', 'Sensor 1', 'Sensor 2', 'Sensor 3', 'Sensor 4'],
                    ...temperatureData.map(d => [d.datetime, d.stage, d.avg, d.sensor1 || '', d.sensor2 || '', d.sensor3 || '', d.sensor4 || ''])
                ]);
                XLSX.utils.book_append_sheet(wb, tempSheet, 'Bunker Temperature Data');
            }

            if (stageAverages.length > 0) {
                const avgSheet = XLSX.utils.aoa_to_sheet([
                    ['Stage', 'Average Temperature (°C)', 'Moisture (%)'],
                    ...stageAverages.map(d => [d.stage, d.avgTemp?.toFixed(1) || '-', d.moisture?.toFixed(1) || '-'])
                ]);
                XLSX.utils.book_append_sheet(wb, avgSheet, 'Stage Averages');
            }

            if (tunnelData.length > 0) {
                const tunnelSheet = XLSX.utils.aoa_to_sheet([
                    ['Tunnel #', 'Start Time', 'End Time', 'Duration (hrs)', 'Avg Temp (°C)', 'Moisture (%)', 'Remarks'],
                    ...(Array.isArray(tunnelData) ? tunnelData : []).map((tunnel, index) => {
                        const tp = tunnel.tunnel_process || {};
                        return [index + 1, tp.start_time ? new Date(tp.start_time).toLocaleString() : '-', tp.end_time ? new Date(tp.end_time).toLocaleString() : '-', tp.duration_hours?.toFixed(1) || '-', tp.avg_temp?.toFixed(1) || '-', tp.moisture?.toFixed(1) || '-', tp.remarks || '-'];
                    })
                ]);
                XLSX.utils.book_append_sheet(wb, tunnelSheet, 'Tunnel Process');
            }

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
                                <input type="text" placeholder="Enter Batch ID or Number" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyPress={handleKeyPress} style={{ border: 'none', outline: 'none', padding: '8px', width: '250px' }} disabled={loading} />
                            </div>
                            <button onClick={handleSearch} className="btn-primary" style={{ padding: '8px 20px' }} disabled={loading || !searchInput}>
                                {loading ? 'Loading...' : 'Generate'}
                            </button>
                        </div>
                    </div>

                    {batchData && (
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <button onClick={handlePrint} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }} disabled={printing}>
                                <PrintIcon /> {printing ? 'Capturing charts…' : 'Print'}
                            </button>
                            <button onClick={handleExportPDF} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                Export PDF
                            </button>
                            <button onClick={handleExportExcel} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                Export Excel
                            </button>
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
                            <FormulationTable entries={batchData.formulation_entries || []} batchData={batchData} />
                            <OperationTimelineTable operationData={batchData.operation_timeline || {}} />

                            <div ref={bunkerChartRef}>
                                {temperatureData.length > 0 ? (
                                    <TemperatureChart data={temperatureData} selectedStage={selectedStage} onStageChange={setSelectedStage} />
                                ) : (
                                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '30px', marginTop: '30px', textAlign: 'center' }}>
                                        <DeviceThermostatIcon style={{ fontSize: '40px', color: '#a0aec0', marginBottom: '10px' }} />
                                        <h3 style={{ fontSize: '16px', color: '#4a5568', marginBottom: '5px' }}>No Bunker Temperature Data Available</h3>
                                        <p style={{ fontSize: '13px', color: '#718096' }}>No bunker process temperature readings found for this batch.</p>
                                    </div>
                                )}
                            </div>

                            <div ref={avgChartRef}>
                                <AverageTemperatureChart stageAverages={stageAverages} />
                            </div>

                            <div ref={tunnelChartRef}>
                                <TunnelTemperatureChart tunnelData={tunnelData} />
                            </div>
                        </div>
                    ) : !loading && !batchData && (
                        <div style={{ textAlign: 'center', padding: '50px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
                            <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>No Report Generated</h3>
                            <p style={{ color: '#64748b' }}>Enter a Batch ID or Number above to generate a comprehensive batch report</p>
                        </div>
                    )}
                </form>
            </div>
        </AppLayout>
    );
}