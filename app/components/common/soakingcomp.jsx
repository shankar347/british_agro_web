"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { ToastProvider, useToast } from "../../components/common/Toaster";
import "../../styles/pages/soaking.css";

import SaveIcon from '@mui/icons-material/Save';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

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
const API_ENDPOINT = `${API_BASE_URL}/straw-preparation-log`;
const API_FETCH_ENDPOINT = `${API_BASE_URL}/straw-preparation-log/straws`;
const BATCH_UPDATE_ENDPOINT = `${API_BASE_URL}/batches`;
const BUNKERS_ENDPOINT = `${API_BASE_URL}/bunkers`;

// ✅ UPDATED: Correct stage names matching the API payload
const STAGE_NAMES = [
    "Soaking",
    "Soaking Rest",
    "Shifting",
    "Shifting Rest",
    "Re Soaking 1",
    "Re Soaking 1 Rest",
    "Re Soaking 2",
    "Re Soaking 2 Rest",
    "Shifting 2",
    "Shifting 2 Rest",
];

const PLAIN_BUNKER_STAGE = "Plain Bunker";

const createEmptySubstage = (name) => ({
    name: name,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    totalHours: '',
    remarks: ''
});

const createEmptyBatch = (batchNumber, materials = [], batchId = null) => {
    const batch = {
        id: batchId || Date.now(),
        batchNumber: batchNumber,
        materials: [],
        batchData: null,
        existingRecords: {},
        moveToPlainBunker: undefined
    };

    materials.forEach(material => {
        const apiStrawType = MATERIAL_TYPES[material];
        if (apiStrawType !== undefined) {
            batch.materials.push({
                type: apiStrawType,
                name: material,
                displayName: MATERIAL_DISPLAY_NAMES[apiStrawType] || material,
                recordId: null,
                hasExistingData: false,
                substages: STAGE_NAMES.map(name => createEmptySubstage(name)),
                plainBunkerSubstage: createEmptySubstage(PLAIN_BUNKER_STAGE)
            });
        }
    });

    return batch;
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

        return {
            date: `${year}-${month}-${day}`,
            time: `${hours}:${minutes}`
        };
    } catch (error) {
        console.error('Error parsing datetime:', error);
        return { date: '', time: '' };
    }
};

const calculateHours = (startDateTime, endDateTime) => {
    if (!startDateTime || !endDateTime) return '';
    try {
        const start = new Date(startDateTime);
        const end = new Date(endDateTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

        const diffHours = (end - start) / (1000 * 60 * 60);
        return diffHours.toFixed(1);
    } catch (error) {
        return '';
    }
};

const fetchBatchData = async (batchId) => {
    try {
        const response = await fetch(`${API_FETCH_ENDPOINT}/${batchId}`);

        if (!response.ok) {
            if (response.status === 404) {
                return { success: true, data: null };
            }
            throw new Error(`Failed to fetch batch data: ${response.status}`);
        }

        const responseData = await response.json();

        if (responseData.success && responseData.data && responseData.data.items) {
            return { success: true, data: responseData.data.items };
        }

        if (responseData.data && Array.isArray(responseData.data)) {
            return { success: true, data: responseData.data };
        }

        if (Array.isArray(responseData)) {
            return { success: true, data: responseData };
        }

        if (responseData.id || responseData.batch_id) {
            return { success: true, data: [responseData] };
        }

        return { success: true, data: null };
    } catch (error) {
        console.error('❌ Error fetching batch data:', error);
        return { success: false, error: error.message };
    }
};

const fetchBunkers = async () => {
    try {
        const response = await fetch(BUNKERS_ENDPOINT);
        if (!response.ok) {
            throw new Error(`Failed to fetch bunkers: ${response.status}`);
        }
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
            return { success: true, data: result.data };
        }
        return { success: true, data: [] };
    } catch (error) {
        console.error('Error fetching bunkers:', error);
        return { success: false, error: error.message, data: [] };
    }
};

const combineDateTime = (date, time) => {
    if (!date || !time) return null;
    try {
        const dateTimeStr = `${date}T${time}:00`;
        const datetime = new Date(dateTimeStr);

        if (isNaN(datetime.getTime())) return null;

        return datetime.toISOString();
    } catch (error) {
        console.error('Error combining datetime:', error);
        return null;
    }
};

const hasSubstageData = (substage) => {
    return substage.startDate || substage.startTime || substage.endDate || substage.endTime || substage.remarks;
};

const validateStageSequencing = (material, toast) => {
    for (let i = 0; i < material.substages.length - 1; i++) {
        const currentStage = material.substages[i];
        const nextStage = material.substages[i + 1];

        if (!currentStage.endDate || !currentStage.endTime || !nextStage.startDate || !nextStage.startTime) {
            continue;
        }

        const currentEnd = combineDateTime(currentStage.endDate, currentStage.endTime);
        const nextStart = combineDateTime(nextStage.startDate, nextStage.startTime);

        if (currentEnd && nextStart) {
            if (new Date(currentEnd) > new Date(nextStart)) {
                toast.error(`${material.displayName}: ${nextStage.name} must start after ${currentStage.name} ends`);
                return false;
            }
        }
    }
    return true;
};

const hasCompleteMaterialData = (material, includePlainBunker = false) => {
    const hasMainData = material.substages.some(substage =>
        substage.startDate || substage.startTime || substage.endDate || substage.endTime || substage.remarks
    );

    if (!hasMainData && !includePlainBunker) {
        return false;
    }

    for (const substage of material.substages) {
        if (substage.startDate && !substage.startTime) return false;
        if (substage.startTime && !substage.startDate) return false;
        if (substage.endDate && !substage.endTime) return false;
        if (substage.endTime && !substage.endDate) return false;
    }

    if (includePlainBunker && material.plainBunkerSubstage) {
        const pb = material.plainBunkerSubstage;
        const hasPbData = pb.startDate || pb.startTime || pb.endDate || pb.endTime || pb.remarks;

        if (hasPbData) {
            if (pb.startDate && !pb.startTime) return false;
            if (pb.startTime && !pb.startDate) return false;
            if (pb.endDate && !pb.endTime) return false;
            if (pb.endTime && !pb.endDate) return false;

            if (pb.startDate && pb.startTime && pb.endDate && pb.endTime) {
                const startDateTime = new Date(`${pb.startDate}T${pb.startTime}`);
                const endDateTime = new Date(`${pb.endDate}T${pb.endTime}`);
                if (startDateTime > endDateTime) return false;
            }
        }
    }

    return true;
};

const validatePlainBunkerData = (material) => {
    const pb = material.plainBunkerSubstage;
    if (!pb) return true;

    const hasPbData = pb.startDate || pb.startTime || pb.endDate || pb.endTime;

    if (hasPbData) {
        if (pb.startDate && !pb.startTime) return false;
        if (pb.startTime && !pb.startDate) return false;
        if (pb.endDate && !pb.endTime) return false;
        if (pb.endTime && !pb.endDate) return false;

        if (pb.startDate && pb.startTime && pb.endDate && pb.endTime) {
            const startDateTime = new Date(`${pb.startDate}T${pb.startTime}`);
            const endDateTime = new Date(`${pb.endDate}T${pb.endTime}`);
            if (startDateTime > endDateTime) return false;
        }
    }

    return true;
};

// ✅ UPDATED: Correct payload mapping matching actual API field names
// Stage index mapping:
// 0 = Soaking         → soaking
// 1 = Soaking Rest    → soaking_rest
// 2 = Shifting        → shifting
// 3 = Shifting Rest   → shifting_rest
// 4 = Re Soaking 1    → resoaking_one
// 5 = Re Soaking 1 Rest → resoaking_rest
// 6 = Re Soaking 2    → resoaking_two
// 7 = Re Soaking 2 Rest → resoaking_two_rest
// 8 = Shifting 2      → shifting_2
// 9 = Shifting 2 Rest → shifting_2_rest
const convertToApiPayload = (batch, material, isCompleted, selectedBunkerId = null) => {
    if (!material) return null;

    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return null;
        try {
            const date = new Date(dateTimeStr);
            if (isNaN(date.getTime())) return null;

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');

            return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        } catch (error) {
            console.error('Error formatting datetime:', error);
            return null;
        }
    };

    const getSubstageDateTime = (index, field) => {
        const substage = material.substages[index];
        if (!substage) return null;
        if (field === 'start') {
            return (substage.startDate && substage.startTime)
                ? combineDateTime(substage.startDate, substage.startTime)
                : null;
        }
        return (substage.endDate && substage.endTime)
            ? combineDateTime(substage.endDate, substage.endTime)
            : null;
    };

    const getSubstageRemarks = (index) => {
        const substage = material.substages[index];
        return substage?.remarks || null;
    };

    const plainBunker = material.plainBunkerSubstage || createEmptySubstage("Plain Bunker");
    const plain_bunker_start = (plainBunker.startDate && plainBunker.startTime)
        ? combineDateTime(plainBunker.startDate, plainBunker.startTime)
        : null;
    const plain_bunker_end = (plainBunker.endDate && plainBunker.endTime)
        ? combineDateTime(plainBunker.endDate, plainBunker.endTime)
        : null;

    // Determine overall end_time: last filled stage end or plain bunker end
    const lastStageEnd = getSubstageDateTime(9, 'end') || getSubstageDateTime(8, 'end') ||
        getSubstageDateTime(7, 'end') || getSubstageDateTime(6, 'end') ||
        getSubstageDateTime(5, 'end') || getSubstageDateTime(4, 'end') ||
        getSubstageDateTime(3, 'end') || getSubstageDateTime(2, 'end') ||
        getSubstageDateTime(1, 'end') || getSubstageDateTime(0, 'end');

    const overallEndTime = plain_bunker_end || lastStageEnd;

    const buildStageObject = (startDT, endDT, remarks) => {
        const obj = {};
        if (startDT) obj.start_time = formatDateTime(startDT);
        if (endDT) obj.end_time = formatDateTime(endDT);
        if (remarks) obj.remarks = remarks;
        return Object.keys(obj).length > 0 ? obj : null;
    };

    const payload = {
        batch_id: batch.id,
        straw_type: material.type,
        start_time: formatDateTime(getSubstageDateTime(0, 'start')),
        end_time: formatDateTime(overallEndTime),
    };

    // soaking (index 0)
    const soakingObj = buildStageObject(getSubstageDateTime(0, 'start'), getSubstageDateTime(0, 'end'), getSubstageRemarks(0));
    if (soakingObj) payload.soaking = soakingObj;

    // soaking_rest (index 1)
    const soakingRestObj = buildStageObject(getSubstageDateTime(1, 'start'), getSubstageDateTime(1, 'end'), getSubstageRemarks(1));
    if (soakingRestObj) payload.soaking_rest = soakingRestObj;

    // shifting (index 2)
    const shiftingObj = buildStageObject(getSubstageDateTime(2, 'start'), getSubstageDateTime(2, 'end'), getSubstageRemarks(2));
    if (shiftingObj) payload.shifting = shiftingObj;

    // shifting_rest (index 3)
    const shiftingRestObj = buildStageObject(getSubstageDateTime(3, 'start'), getSubstageDateTime(3, 'end'), getSubstageRemarks(3));
    if (shiftingRestObj) payload.shifting_rest = shiftingRestObj;

    // resoaking_one (index 4)
    const resoakingOneObj = buildStageObject(getSubstageDateTime(4, 'start'), getSubstageDateTime(4, 'end'), getSubstageRemarks(4));
    if (resoakingOneObj) payload.resoaking_one = resoakingOneObj;

    // resoaking_rest (index 5)
    const resoakingRestObj = buildStageObject(getSubstageDateTime(5, 'start'), getSubstageDateTime(5, 'end'), getSubstageRemarks(5));
    if (resoakingRestObj) payload.resoaking_rest = resoakingRestObj;

    // resoaking_two (index 6)
    const resoakingTwoObj = buildStageObject(getSubstageDateTime(6, 'start'), getSubstageDateTime(6, 'end'), getSubstageRemarks(6));
    if (resoakingTwoObj) payload.resoaking_two = resoakingTwoObj;

    // resoaking_two_rest (index 7)
    const resoakingTwoRestObj = buildStageObject(getSubstageDateTime(7, 'start'), getSubstageDateTime(7, 'end'), getSubstageRemarks(7));
    if (resoakingTwoRestObj) payload.resoaking_two_rest = resoakingTwoRestObj;

    // shifting_2 (index 8)
    const shifting2Obj = buildStageObject(getSubstageDateTime(8, 'start'), getSubstageDateTime(8, 'end'), getSubstageRemarks(8));
    if (shifting2Obj) payload.shifting_2 = shifting2Obj;

    // shifting_2_rest (index 9)
    const shifting2RestObj = buildStageObject(getSubstageDateTime(9, 'start'), getSubstageDateTime(9, 'end'), getSubstageRemarks(9));
    if (shifting2RestObj) payload.shifting_2_rest = shifting2RestObj;

    // plain_bunker
    const plainBunkerObj = buildStageObject(plain_bunker_start, plain_bunker_end, plainBunker.remarks || null);
    if (plainBunkerObj) payload.plain_bunker = plainBunkerObj;

    // Only add iscompleted if true
    if (isCompleted) {
        payload.iscompleted = true;
    }

    // Add bunker_id only on move
    if (selectedBunkerId) {
        payload.bunker_id = selectedBunkerId;
    }

    // Remove null top-level fields
    Object.keys(payload).forEach(key => {
        if (payload[key] === null || payload[key] === undefined) {
            delete payload[key];
        }
    });

    return payload;
};

// ✅ UPDATED: Correct API response → UI mapping
const convertApiResponseToUI = (apiData, batch) => {
    if (!apiData || !Array.isArray(apiData)) {
        return batch;
    }

    batch.materials.forEach(material => {
        const materialData = apiData.find(d =>
            d.straw_type && d.straw_type === material.type
        );

        if (!materialData) return;

        if (materialData.id) {
            material.recordId = materialData.id;
            material.hasExistingData = true;
        }

        // ✅ UPDATED: Correct mapping matching STAGE_NAMES order and API fields
        const substageMapping = [
            { name: "Soaking",           data: materialData.soaking },           // index 0
            { name: "Soaking Rest",      data: materialData.soaking_rest },      // index 1
            { name: "Shifting",          data: materialData.shifting },           // index 2
            { name: "Shifting Rest",     data: materialData.shifting_rest },     // index 3
            { name: "Re Soaking 1",      data: materialData.resoaking_one },     // index 4
            { name: "Re Soaking 1 Rest", data: materialData.resoaking_rest },    // index 5
            { name: "Re Soaking 2",      data: materialData.resoaking_two },     // index 6
            { name: "Re Soaking 2 Rest", data: materialData.resoaking_two_rest },// index 7
            { name: "Shifting 2",        data: materialData.shifting_2 },        // index 8
            { name: "Shifting 2 Rest",   data: materialData.shifting_2_rest },   // index 9
        ];

        substageMapping.forEach((mapping, index) => {
            if (mapping.data) {
                if (mapping.data.start_time) {
                    const { date: startDate, time: startTime } = parseDateTime(mapping.data.start_time);
                    material.substages[index].startDate = startDate;
                    material.substages[index].startTime = startTime;
                }

                if (mapping.data.end_time) {
                    const { date: endDate, time: endTime } = parseDateTime(mapping.data.end_time);
                    material.substages[index].endDate = endDate;
                    material.substages[index].endTime = endTime;
                }

                if (mapping.data.duration_hours !== undefined && mapping.data.duration_hours !== null) {
                    material.substages[index].totalHours = mapping.data.duration_hours.toString();
                }

                if (mapping.data.remarks) {
                    material.substages[index].remarks = mapping.data.remarks;
                }
            }
        });

        if (materialData.plain_bunker) {
            const pbData = materialData.plain_bunker;

            if (pbData.start_time) {
                const { date: startDate, time: startTime } = parseDateTime(pbData.start_time);
                material.plainBunkerSubstage.startDate = startDate;
                material.plainBunkerSubstage.startTime = startTime;
            }

            if (pbData.end_time) {
                const { date: endDate, time: endTime } = parseDateTime(pbData.end_time);
                material.plainBunkerSubstage.endDate = endDate;
                material.plainBunkerSubstage.endTime = endTime;
            }

            if (pbData.duration_hours !== undefined && pbData.duration_hours !== null) {
                material.plainBunkerSubstage.totalHours = pbData.duration_hours.toString();
            }

            if (pbData.remarks) {
                material.plainBunkerSubstage.remarks = pbData.remarks;
            }
        }
    });

    return batch;
};

const sendToApi = async (payload, materialType, displayName) => {
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            console.error('API Error Response:', errorData);

            let errorMessage = `API error: ${response.status}`;
            if (errorData.detail) {
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                    errorMessage = errorData.detail.map(err => err.msg).join(', ');
                } else if (typeof errorData.detail === 'object') {
                    errorMessage = JSON.stringify(errorData.detail);
                }
            }

            throw new Error(errorMessage);
        }

        const result = await response.json();
        return { success: true, data: result, materialType, displayName };
    } catch (error) {
        console.error(`ERROR sending ${displayName} data:`, error);
        return { success: false, error: error.message, materialType, displayName };
    }
};

const updateBatchPlainBunkerStatus = async (batchId, status) => {
    try {
        const url = `${BATCH_UPDATE_ENDPOINT}/${batchId}`;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                plain_bunker_mixed: status
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            console.error('API Error Response:', errorData);
            throw new Error(`Failed to update batch status: ${response.status}`);
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        console.error('Error updating batch status:', error);
        return { success: false, error: error.message };
    }
};

const MaterialTable = React.memo(({ material, onUpdate, showPlainBunker = false, readOnly = false }) => {
    const toast = useToast();

    const validateDateRange = (substage, field, newValue) => {
        if (field === 'startDate' || field === 'startTime') {
            if (substage.endDate && substage.endTime) {
                const newStartDateTime = field === 'startDate'
                    ? combineDateTime(newValue, substage.startTime)
                    : combineDateTime(substage.startDate, newValue);
                const endDateTime = combineDateTime(substage.endDate, substage.endTime);

                if (newStartDateTime && endDateTime && new Date(newStartDateTime) > new Date(endDateTime)) {
                    toast.error(`${material.displayName} - ${substage.name}: Start date/time cannot be after end date/time`);
                    return false;
                }
            }
        } else if (field === 'endDate' || field === 'endTime') {
            if (substage.startDate && substage.startTime) {
                const startDateTime = combineDateTime(substage.startDate, substage.startTime);
                const newEndDateTime = field === 'endDate'
                    ? combineDateTime(newValue, substage.endTime)
                    : combineDateTime(substage.endDate, newValue);

                if (startDateTime && newEndDateTime && new Date(startDateTime) > new Date(newEndDateTime)) {
                    toast.error(`${material.displayName} - ${substage.name}: End date/time cannot be before start date/time`);
                    return false;
                }
            }
        }
        return true;
    };

    const validateStageSequence = (index, field, value, updatedMaterial) => {
        const substage = updatedMaterial.substages[index];
        const tempSubstage = { ...substage, [field]: value };

        if (index > 0) {
            const prevStage = updatedMaterial.substages[index - 1];
            if (prevStage.endDate && prevStage.endTime && tempSubstage.startDate && tempSubstage.startTime) {
                const prevEnd = combineDateTime(prevStage.endDate, prevStage.endTime);
                const currentStart = combineDateTime(tempSubstage.startDate, tempSubstage.startTime);

                if (prevEnd && currentStart && new Date(prevEnd) > new Date(currentStart)) {
                    toast.error(`${material.displayName}: ${tempSubstage.name} must start after ${prevStage.name} ends`);
                    return false;
                }
            }
        }

        if (index < updatedMaterial.substages.length - 1) {
            const nextStage = updatedMaterial.substages[index + 1];
            if (tempSubstage.endDate && tempSubstage.endTime && nextStage.startDate && nextStage.startTime) {
                const currentEnd = combineDateTime(tempSubstage.endDate, tempSubstage.endTime);
                const nextStart = combineDateTime(nextStage.startDate, nextStage.startTime);

                if (currentEnd && nextStart && new Date(currentEnd) > new Date(nextStart)) {
                    toast.error(`${material.displayName}: ${nextStage.name} must start after ${tempSubstage.name} ends`);
                    return false;
                }
            }
        }

        return true;
    };

    const getMinEndDate = (substage) => substage?.startDate || undefined;

    const getMinEndTime = (substage) => {
        if (substage?.startDate === substage?.endDate && substage?.startTime) {
            return substage.startTime;
        }
        return undefined;
    };

    const handleInputChange = (index, field, value, isPlainBunker = false) => {
        if (readOnly) return;

        const updatedMaterial = { ...material };

        if (isPlainBunker) {
            const substage = updatedMaterial.plainBunkerSubstage;

            if (['startDate', 'startTime', 'endDate', 'endTime'].includes(field)) {
                if (!validateDateRange(substage, field, value)) return;
            }

            substage[field] = value;

            if (substage.startDate && substage.startTime && substage.endDate && substage.endTime) {
                const start = new Date(`${substage.startDate}T${substage.startTime}`);
                const end = new Date(`${substage.endDate}T${substage.endTime}`);
                substage.totalHours = ((end - start) / (1000 * 60 * 60)).toFixed(1);
            }
        } else {
            const substage = updatedMaterial.substages[index];

            if (['startDate', 'startTime', 'endDate', 'endTime'].includes(field)) {
                if (!validateDateRange(substage, field, value)) return;
            }

            substage[field] = value;

            if (!validateStageSequence(index, field, value, updatedMaterial)) return;

            if (substage.startDate && substage.startTime && substage.endDate && substage.endTime) {
                const start = new Date(`${substage.startDate}T${substage.startTime}`);
                const end = new Date(`${substage.endDate}T${substage.endTime}`);
                substage.totalHours = ((end - start) / (1000 * 60 * 60)).toFixed(1);
            }
        }

        onUpdate(updatedMaterial);
    };

    return (
        <div className="table-section">
            <h3 className="table-title">{material.displayName} Soaking Process</h3>
            <div className="entry-table-container">
                <table className="entry-table">
                    <thead>
                        <tr>
                            <th rowSpan="2">Substage</th>
                            <th colSpan="2">Start</th>
                            <th colSpan="2">End</th>
                            <th rowSpan="2">Total Hours</th>
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
                        {/* ✅ All 10 substage rows rendered from STAGE_NAMES */}
                        {material.substages.map((substage, index) => (
                            <tr key={index}>
                                <td className="substage-name">{substage.name}</td>
                                <td>
                                    <input
                                        type="date"
                                        value={substage.startDate || ''}
                                        onChange={(e) => handleInputChange(index, 'startDate', e.target.value, false)}
                                        className="table-input"
                                        disabled={readOnly}
                                        max={substage.endDate || undefined}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="time"
                                        value={substage.startTime || ''}
                                        onChange={(e) => handleInputChange(index, 'startTime', e.target.value, false)}
                                        className="table-input"
                                        disabled={readOnly}
                                        max={substage.startDate === substage.endDate ? substage.endTime : undefined}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="date"
                                        value={substage.endDate || ''}
                                        onChange={(e) => handleInputChange(index, 'endDate', e.target.value, false)}
                                        className="table-input"
                                        disabled={readOnly}
                                        min={getMinEndDate(substage)}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="time"
                                        value={substage.endTime || ''}
                                        onChange={(e) => handleInputChange(index, 'endTime', e.target.value, false)}
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
                                        className="table-input"
                                        placeholder="Auto-calc"
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        value={substage.remarks || ''}
                                        onChange={(e) => handleInputChange(index, 'remarks', e.target.value, false)}
                                        className="table-input"
                                        placeholder="Add remarks..."
                                        disabled={readOnly}
                                    />
                                </td>
                            </tr>
                        ))}

                        {/* ✅ Plain Bunker row — shown when "Mix Two Materials" = No */}
                        {showPlainBunker && (
                            <tr className="plain-bunker-row">
                                <td className="substage-name plain-bunker">Plain Bunker</td>
                                <td>
                                    <input
                                        type="date"
                                        value={material.plainBunkerSubstage?.startDate || ''}
                                        onChange={(e) => handleInputChange(null, 'startDate', e.target.value, true)}
                                        className="table-input"
                                        disabled={readOnly}
                                        max={material.plainBunkerSubstage?.endDate || undefined}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="time"
                                        value={material.plainBunkerSubstage?.startTime || ''}
                                        onChange={(e) => handleInputChange(null, 'startTime', e.target.value, true)}
                                        className="table-input"
                                        disabled={readOnly}
                                        max={material.plainBunkerSubstage?.startDate === material.plainBunkerSubstage?.endDate
                                            ? material.plainBunkerSubstage?.endTime : undefined}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="date"
                                        value={material.plainBunkerSubstage?.endDate || ''}
                                        onChange={(e) => handleInputChange(null, 'endDate', e.target.value, true)}
                                        className="table-input"
                                        disabled={readOnly}
                                        min={getMinEndDate(material.plainBunkerSubstage)}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="time"
                                        value={material.plainBunkerSubstage?.endTime || ''}
                                        onChange={(e) => handleInputChange(null, 'endTime', e.target.value, true)}
                                        className="table-input"
                                        disabled={readOnly}
                                        min={getMinEndTime(material.plainBunkerSubstage)}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        value={material.plainBunkerSubstage?.totalHours || ''}
                                        readOnly
                                        className="table-input"
                                        placeholder="Auto-calc"
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        value={material.plainBunkerSubstage?.remarks || ''}
                                        onChange={(e) => handleInputChange(null, 'remarks', e.target.value, true)}
                                        className="table-input"
                                        placeholder="Add remarks..."
                                        disabled={readOnly}
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

MaterialTable.displayName = 'MaterialTable';

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

        if (batchData && batchData.formulation_entries) {
            batchData.formulation_entries.forEach(entry => {
                const materialName = entry.name.toUpperCase();
                if (MATERIAL_TYPES[materialName] !== undefined) {
                    materials.add(materialName);
                }
            });
        }

        return Array.from(materials);
    };

    const handleLoadBatch = async (batchNum, batchId) => {
        if (!batchNum.trim()) {
            toast.error('Please enter a batch number');
            return;
        }

        setIsLoading(true);

        try {
            let selectedBatch = null;
            const batchResponse = await fetch(`${API_BASE_URL}/batches`);

            if (!batchResponse.ok) throw new Error('Failed to fetch batches');

            const batchResult = await batchResponse.json();
            let batches = Array.isArray(batchResult) ? batchResult : (batchResult.success ? batchResult.data : []);

            if (batchId) {
                selectedBatch = batches.find(b => b.id === batchId) || batches.find(b => b.batch_number === batchNum.trim());
            } else {
                selectedBatch = batches.find(b => b.batch_number === batchNum.trim());
            }

            if (!selectedBatch) {
                toast.error('Batch number not found');
                setIsLoading(false);
                return;
            }

            const materials = getMaterialsFromBatch(selectedBatch);

            if (materials.length === 0) {
                toast.error('No suitable materials (Bagasse, Wheat Straw, or Paddy Straw) found in this batch');
                setIsLoading(false);
                return;
            }

            const newBatch = createEmptyBatch(batchNum, materials, selectedBatch.id);
            newBatch.batchData = selectedBatch;

            const strawDataResult = await fetchBatchData(selectedBatch.id);

            if (strawDataResult.success && strawDataResult.data) {
                const populatedBatch = convertApiResponseToUI(strawDataResult.data, newBatch);
                onSelectBatch(populatedBatch);
                toast.success(`Loaded batch ${batchNum} with existing data (${materials.length} material table${materials.length > 1 ? 's' : ''})`);
            } else if (strawDataResult.success && !strawDataResult.data) {
                onSelectBatch(newBatch);
                toast.success(`Loaded batch ${batchNum} (${materials.length} material table${materials.length > 1 ? 's' : ''} - no existing data)`);
            } else {
                toast.warning(`Loaded batch ${batchNum} but failed to fetch existing data`);
                onSelectBatch(newBatch);
            }

        } catch (err) {
            toast.error('Error loading batch details. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateNew = () => {
        if (isLoading || loading) return;
        handleLoadBatch(batchNumber);
    };

    const handleBackClick = () => {
        router.push('/soaking');
        setBatchNumber('');
        hasLoadedRef.current = false;
    };

    return (
        <div className="batch-selection">
            <h2>Soaking Process Entry</h2>

            {error && (
                <div className="error-message">
                    Error: {error}
                </div>
            )}

            <div className="selection-panel">
                <div className="new-batch-section">
                    <h3>Enter Batch Number</h3>
                    <div className="batch-input-group">
                        <input
                            type="text"
                            placeholder="Enter Batch Number (e.g., BATCH-001)"
                            value={batchNumber}
                            onChange={(e) => setBatchNumber(e.target.value)}
                            className="batch-input"
                            disabled={isLoading || loading}
                        />
                        <button
                            onClick={handleCreateNew}
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

export default function SoakingContent() {
    const router = useRouter();
    const toast = useToast();
    const searchParams = useSearchParams();
    const [currentBatch, setCurrentBatch] = useState(null);
    const [savedBatches, setSavedBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [initialBatchNumber, setInitialBatchNumber] = useState(null);
    const [initialBatchId, setInitialBatchId] = useState(null);

    const [bunkers, setBunkers] = useState([]);
    const [bunkersLoading, setBunkersLoading] = useState(false);
    const [selectedBunkerId, setSelectedBunkerId] = useState('');

    const isSavingRef = useRef(false);

    useEffect(() => {
        const batchNum = searchParams.get('batch');
        const batchId = searchParams.get('batchId');

        if (batchNum) {
            setInitialBatchNumber(batchNum);
            setInitialBatchId(batchId);
        }
    }, [searchParams]);

    useEffect(() => {
        if (currentBatch) {
            loadBunkers();
        }
    }, [currentBatch?.id]);

    const loadBunkers = async () => {
        setBunkersLoading(true);
        const result = await fetchBunkers();
        if (result.success) {
            setBunkers(result.data);
        } else {
            toast.error('Failed to load bunkers');
        }
        setBunkersLoading(false);
    };

    const handleSelectBatch = (batch) => {
        setCurrentBatch(batch);
        setSelectedBunkerId('');
    };

    const handleUpdateMaterial = useCallback((index, updatedMaterial) => {
        setCurrentBatch(prevBatch => {
            if (!prevBatch) return prevBatch;
            const updatedMaterials = [...prevBatch.materials];
            updatedMaterials[index] = updatedMaterial;
            return { ...prevBatch, materials: updatedMaterials };
        });
    }, []);

    const handleMoveToPlainBunkerChange = (value) => {
        setCurrentBatch(prevBatch => ({
            ...prevBatch,
            moveToPlainBunker: value === 'yes'
        }));
    };

    const validateBatchData = (batch, includePlainBunker = false) => {
        for (const material of batch.materials) {
            for (const substage of material.substages) {
                if (substage.startDate && substage.startTime && substage.endDate && substage.endTime) {
                    const startDateTime = new Date(`${substage.startDate}T${substage.startTime}`);
                    const endDateTime = new Date(`${substage.endDate}T${substage.endTime}`);

                    if (startDateTime > endDateTime) {
                        toast.error(`${material.displayName} - ${substage.name}: End date/time cannot be before start date/time`);
                        return false;
                    }
                }

                if ((substage.startDate || substage.startTime) && (!substage.startDate || !substage.startTime)) {
                    toast.error(`Please complete both date and time for ${material.displayName} - ${substage.name} start`);
                    return false;
                }
                if ((substage.endDate || substage.endTime) && (!substage.endDate || !substage.endTime)) {
                    toast.error(`Please complete both date and time for ${material.displayName} - ${substage.name} end`);
                    return false;
                }
            }

            if (!validateStageSequencing(material, toast)) return false;

            if (includePlainBunker && material.plainBunkerSubstage) {
                const pb = material.plainBunkerSubstage;
                const hasPbData = pb.startDate || pb.startTime || pb.endDate || pb.endTime;

                if (hasPbData) {
                    if ((pb.startDate && !pb.startTime) || (pb.startTime && !pb.startDate)) {
                        toast.error(`Please complete both date and time for ${material.displayName} - Plain Bunker start`);
                        return false;
                    }
                    if ((pb.endDate && !pb.endTime) || (pb.endTime && !pb.endDate)) {
                        toast.error(`Please complete both date and time for ${material.displayName} - Plain Bunker end`);
                        return false;
                    }
                    if (pb.startDate && pb.startTime && pb.endDate && pb.endTime) {
                        const startDateTime = new Date(`${pb.startDate}T${pb.startTime}`);
                        const endDateTime = new Date(`${pb.endDate}T${pb.endTime}`);
                        if (startDateTime > endDateTime) {
                            toast.error(`${material.displayName} - Plain Bunker: End date/time cannot be before start date/time`);
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    };

    const validateMoveToPlainBunker = (batch) => {
        if (batch.moveToPlainBunker === false) {
            for (const material of batch.materials) {
                const pb = material.plainBunkerSubstage;

                if (!pb.startDate) {
                    toast.error(`${material.displayName}: Plain Bunker start date is required when selecting "No"`);
                    return false;
                }
                if (!pb.startTime) {
                    toast.error(`${material.displayName}: Plain Bunker start time is required when selecting "No"`);
                    return false;
                }
                if (!pb.endDate) {
                    toast.error(`${material.displayName}: Plain Bunker end date is required when selecting "No"`);
                    return false;
                }
                if (!pb.endTime) {
                    toast.error(`${material.displayName}: Plain Bunker end time is required when selecting "No"`);
                    return false;
                }

                const startDateTime = new Date(`${pb.startDate}T${pb.startTime}`);
                const endDateTime = new Date(`${pb.endDate}T${pb.endTime}`);
                if (startDateTime > endDateTime) {
                    toast.error(`${material.displayName}: Plain Bunker end date/time cannot be before start date/time`);
                    return false;
                }
            }
        }
        return true;
    };

    const handleSave = async () => {
        if (!currentBatch || isSavingRef.current) return;

        isSavingRef.current = true;
        setLoading(true);

        try {
            const results = [];
            let hasAnyDataToSave = false;
            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < currentBatch.materials.length; i++) {
                const material = currentBatch.materials[i];
                const includePlainBunker = currentBatch.moveToPlainBunker === false;

                if (hasCompleteMaterialData(material, includePlainBunker)) {
                    const payload = convertToApiPayload(currentBatch, material, false, null);
                    if (payload) {
                        hasAnyDataToSave = true;

                        const result = await sendToApi(payload, material.type, material.displayName);
                        results.push({ ...result, materialIndex: i, materialType: material.type });

                        if (result.success) {
                            successCount++;
                            if (result.data?.data?.id) {
                                setCurrentBatch(prevBatch => {
                                    const updatedMaterials = [...prevBatch.materials];
                                    updatedMaterials[i] = {
                                        ...updatedMaterials[i],
                                        recordId: result.data.data.id,
                                        hasExistingData: true
                                    };
                                    return { ...prevBatch, materials: updatedMaterials };
                                });
                            }
                            toast.success(`${material.displayName} data saved successfully!`);
                        } else {
                            failCount++;
                            toast.error(`Failed to save ${material.displayName} data: ${result.error}`);
                        }
                    }
                }
            }

            if (!hasAnyDataToSave) {
                toast.info('No complete data to save. Please fill in all required fields for at least one material.');
                return;
            }

            const existingIndex = savedBatches.findIndex(b => b.id === currentBatch.id);
            if (existingIndex >= 0) {
                const updated = [...savedBatches];
                updated[existingIndex] = { ...currentBatch, status: 'draft' };
                setSavedBatches(updated);
            } else {
                setSavedBatches([...savedBatches, { ...currentBatch, status: 'draft' }]);
            }

            if (results.every(r => r.success)) {
                toast.success(`All ${successCount} material data saved successfully!`);
            } else {
                toast.warning(`${successCount} material(s) saved successfully, ${failCount} failed`);
            }
        } catch (error) {
            toast.error('Failed to save batch data');
            console.error('Save error:', error);
        } finally {
            setLoading(false);
            setTimeout(() => { isSavingRef.current = false; }, 1000);
        }
    };

    const handleMoveToPlainBunker = async () => {
        if (!currentBatch || isSavingRef.current) return;

        if (!selectedBunkerId) {
            toast.error('Please select a bunker before moving to Plain Bunker');
            return;
        }

        const hasData = currentBatch.materials.some(material =>
            material.substages.some(hasSubstageData)
        );

        if (!hasData) {
            toast.error('Please enter at least some data before moving');
            return;
        }

        if (!validateMoveToPlainBunker(currentBatch)) return;

        isSavingRef.current = true;
        setLoading(true);

        try {
            let hasAnyDataToSave = false;
            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < currentBatch.materials.length; i++) {
                const material = currentBatch.materials[i];
                const includePlainBunker = currentBatch.moveToPlainBunker === false;

                if (currentBatch.moveToPlainBunker === false) {
                    const pb = material.plainBunkerSubstage;
                    if (!pb.startDate || !pb.startTime || !pb.endDate || !pb.endTime) {
                        toast.error(`${material.displayName}: Please complete all date/time fields for Plain Bunker`);
                        setLoading(false);
                        isSavingRef.current = false;
                        return;
                    }
                }

                if (hasCompleteMaterialData(material, includePlainBunker)) {
                    const payload = convertToApiPayload(currentBatch, material, true, selectedBunkerId);
                    if (payload) {
                        hasAnyDataToSave = true;

                        const result = await sendToApi(payload, material.type, material.displayName);

                        if (result.success) {
                            successCount++;
                            if (result.data?.data?.id) {
                                setCurrentBatch(prevBatch => {
                                    const updatedMaterials = [...prevBatch.materials];
                                    updatedMaterials[i] = {
                                        ...updatedMaterials[i],
                                        recordId: result.data.data.id,
                                        hasExistingData: true
                                    };
                                    return { ...prevBatch, materials: updatedMaterials };
                                });
                            }
                        } else {
                            failCount++;
                        }
                    }
                }
            }

            if (!hasAnyDataToSave) {
                toast.info('No complete data to save. Please fill in all required fields for at least one material.');
                return;
            }

            if (failCount > 0) {
                toast.error(`Failed to save ${failCount} material(s). Cannot proceed to Plain Bunker.`);
                return;
            }

            const batchUpdateResult = await updateBatchPlainBunkerStatus(
                currentBatch.id,
                currentBatch.moveToPlainBunker
            );

            if (batchUpdateResult.success) {
                toast.success(`Batch moved to Plain Bunker successfully with status: ${currentBatch.moveToPlainBunker ? 'Yes' : 'No'}`);
                setCurrentBatch(null);
                router.push('/unified-platform');
            } else {
                toast.error(`Failed to update batch status: ${batchUpdateResult.error}`);
            }

        } catch (error) {
            toast.error('Failed to move batch to Plain Bunker');
            console.error('Move error:', error);
        } finally {
            setLoading(false);
            setTimeout(() => { isSavingRef.current = false; }, 1000);
        }
    };

    const handleBackToSelection = () => {
        setCurrentBatch(null);
        setSelectedBunkerId('');
        setBunkers([]);
        router.push('/soaking');
        setError(null);
        setInitialBatchNumber(null);
        setInitialBatchId(null);
    };

    if (!currentBatch) {
        return (
            <AppLayout title="Soaking Process">
                <div className="soaking-container">
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

    return (
        <AppLayout title="Soaking Process">
            <span className="material-count">
                ({currentBatch.materials.length} material table{currentBatch.materials.length > 1 ? 's' : ''})
            </span>
            <div className="soaking-container">
                <div className="entry-header">
                    <div className="header-left">
                        <button onClick={handleBackToSelection} className="back-button">
                            <ArrowBackIcon />
                        </button>
                        <h2>{currentBatch.batchNumber}</h2>
                    </div>
                    <div className="header-actions">
                        <div className="move-to-plain-bunker-dropdown">
                            <label htmlFor="bunkerSelect">Bunker:</label>
                            <select
                                id="bunkerSelect"
                                value={selectedBunkerId}
                                onChange={(e) => setSelectedBunkerId(e.target.value)}
                                className="plain-bunker-select"
                                disabled={loading || bunkersLoading}
                            >
                                <option value="" disabled>
                                    {bunkersLoading ? 'Loading bunkers...' : 'Select Bunker'}
                                </option>
                                {bunkers.filter((bunker) => !bunker.is_active).map((bunker) => (
                                    <option key={bunker.id} value={bunker.id}>
                                        {bunker.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="move-to-plain-bunker-dropdown">
                            <label htmlFor="plainBunkerSelect">Mix Two Materials:</label>
                            <select
                                id="plainBunkerSelect"
                                value={currentBatch.moveToPlainBunker === true ? 'yes' : currentBatch.moveToPlainBunker === false ? 'no' : ''}
                                onChange={(e) => handleMoveToPlainBunkerChange(e.target.value)}
                                className="plain-bunker-select"
                                disabled={loading}
                            >
                                <option value="" disabled>Select</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>

                        <button
                            onClick={handleSave}
                            className="btn-save"
                            disabled={loading}
                        >
                            <SaveIcon fontSize="small" />
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            onClick={handleMoveToPlainBunker}
                            className="btn-move"
                            disabled={loading || currentBatch.moveToPlainBunker === undefined}
                        >
                            <ArrowForwardIcon fontSize="small" />
                            {loading ? 'Processing...' : 'Move to Plain Bunker'}
                        </button>
                    </div>
                </div>

                {currentBatch.materials.map((material, index) => (
                    <MaterialTable
                        key={`${material.type}-${index}-${material.recordId || 'new'}`}
                        material={material}
                        onUpdate={(updated) => handleUpdateMaterial(index, updated)}
                        showPlainBunker={currentBatch.moveToPlainBunker === false}
                        readOnly={false}
                    />
                ))}
            </div>
        </AppLayout>
    );
}