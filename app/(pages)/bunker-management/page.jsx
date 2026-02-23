"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { ToastProvider, useToast } from "../../components/common/Toaster";
import "../../styles/pages/unified-platform.css";

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
const API_ENDPOINT = `${API_BASE_URL}/bunker-process-logs`;
const API_FETCH_ENDPOINT = `${API_BASE_URL}/bunker-process-logs/batch`;
const BATCH_FETCH_ENDPOINT = `${API_BASE_URL}/batches`;

const STAGE_NAMES = [
  "Bunker Process 1",
  "Bunker Process 1 Rest", 
  "Bunker Process 2",
  "Bunker Process 2 Rest",
  "Bunker Process 3",
  "Bunker Process 3 Rest"
];

const createEmptySubstage = (name) => ({
  name: name,
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  totalHours: '',
  moisture: '',
  temperature: '',
  remarks: ''
});

const createEmptyBatch = (batchNumber, materials = [], batchId = null) => {
  const materialTypes = materials.map(m => MATERIAL_TYPES[m]).filter(Boolean);
  const materialDisplayNames = materialTypes.map(t => MATERIAL_DISPLAY_NAMES[t]);
  
  const batch = {
    id: batchId || Date.now(),
    batchNumber: batchNumber,
    materialTypes: materialTypes, 
    materialDisplayNames: materialDisplayNames, 
    batchData: null,
    existingRecords: {},
    substages: STAGE_NAMES.map(name => createEmptySubstage(name))
  };

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

const fetchBatchData = async (batchId) => {
  try {
    const response = await fetch(`${API_FETCH_ENDPOINT}/${batchId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, data: [] };
      }
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
    console.error(' Error fetching bunker data:', error);
    return { success: false, error: error.message };
  }
};

const fetchBatchDetails = async (batchId) => {
  try {
    const response = await fetch(`${BATCH_FETCH_ENDPOINT}/${batchId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch batch details: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(' Error fetching batch details:', error);
    return { success: false, error: error.message };
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
  return substage.startDate || substage.startTime || substage.endDate || substage.endTime || 
         substage.moisture || substage.temperature || substage.remarks;
};

const validateStageSequencing = (substages, toast) => {
  for (let i = 0; i < substages.length - 1; i++) {
    const currentStage = substages[i];
    const nextStage = substages[i + 1];
    
    if (!currentStage.endDate || !currentStage.endTime || !nextStage.startDate || !nextStage.startTime) {
      continue;
    }
    
    const currentEnd = combineDateTime(currentStage.endDate, currentStage.endTime);
    const nextStart = combineDateTime(nextStage.startDate, nextStage.startTime);
    
    if (currentEnd && nextStart) {
      if (new Date(currentEnd) > new Date(nextStart)) {
        toast.error(`${nextStage.name} must start after ${currentStage.name} ends`);
        return false;
      }
    }
  }
  return true;
};

const hasCompleteData = (substages) => {
  const hasAnyData = substages.some(substage => 
    substage.startDate || substage.startTime || substage.endDate || substage.endTime || 
    substage.moisture || substage.temperature || substage.remarks
  );
  
  if (!hasAnyData) {
    return false;
  }
  
  for (const substage of substages) {
    if (substage.startDate && !substage.startTime) {
      return false;
    }
    
    if (substage.startTime && !substage.startDate) {
      return false;
    }
    
    if (substage.endDate && !substage.endTime) {
      return false;
    }
    
    if (substage.endTime && !substage.endDate) {
      return false;
    }
  }
  
  return true;
};

const convertToApiPayload = (batch, materialType, isCompleted) => {
  const substages = batch.substages;

  const bunker1 = substages[0] || createEmptySubstage("Bunker Process 1");
  const bunker1Rest = substages[1] || createEmptySubstage("Bunker Process 1 Rest");
  const bunker2 = substages[2] || createEmptySubstage("Bunker Process 2");
  const bunker2Rest = substages[3] || createEmptySubstage("Bunker Process 2 Rest");
  const bunker3 = substages[4] || createEmptySubstage("Bunker Process 3");
  const bunker3Rest = substages[5] || createEmptySubstage("Bunker Process 3 Rest");

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

  const bunker1_start = (bunker1.startDate && bunker1.startTime) 
    ? combineDateTime(bunker1.startDate, bunker1.startTime) 
    : null;
  const bunker1_end = (bunker1.endDate && bunker1.endTime) 
    ? combineDateTime(bunker1.endDate, bunker1.endTime) 
    : null;
  
  const bunker1_rest_start = (bunker1Rest.startDate && bunker1Rest.startTime) 
    ? combineDateTime(bunker1Rest.startDate, bunker1Rest.startTime) 
    : null;
  const bunker1_rest_end = (bunker1Rest.endDate && bunker1Rest.endTime) 
    ? combineDateTime(bunker1Rest.endDate, bunker1Rest.endTime) 
    : null;
  
  const bunker2_start = (bunker2.startDate && bunker2.startTime) 
    ? combineDateTime(bunker2.startDate, bunker2.startTime) 
    : null;
  const bunker2_end = (bunker2.endDate && bunker2.endTime) 
    ? combineDateTime(bunker2.endDate, bunker2.endTime) 
    : null;
  
  const bunker2_rest_start = (bunker2Rest.startDate && bunker2Rest.startTime) 
    ? combineDateTime(bunker2Rest.startDate, bunker2Rest.startTime) 
    : null;
  const bunker2_rest_end = (bunker2Rest.endDate && bunker2Rest.endTime) 
    ? combineDateTime(bunker2Rest.endDate, bunker2Rest.endTime) 
    : null;

  const bunker3_start = (bunker3.startDate && bunker3.startTime) 
    ? combineDateTime(bunker3.startDate, bunker3.startTime) 
    : null;
  const bunker3_end = (bunker3.endDate && bunker3.endTime) 
    ? combineDateTime(bunker3.endDate, bunker3.endTime) 
    : null;

  const bunker3_rest_start = (bunker3Rest.startDate && bunker3Rest.startTime) 
    ? combineDateTime(bunker3Rest.startDate, bunker3Rest.startTime) 
    : null;
  const bunker3_rest_end = (bunker3Rest.endDate && bunker3Rest.endTime) 
    ? combineDateTime(bunker3Rest.endDate, bunker3Rest.endTime) 
    : null;

  const allStarts = [
    bunker1_start,
    bunker1_rest_start,
    bunker2_start,
    bunker2_rest_start,
    bunker3_start,
    bunker3_rest_start
  ].filter(start => start !== null);
  
  const overall_start_time = allStarts.length > 0 
    ? formatDateTime(new Date(Math.min(...allStarts.map(d => new Date(d).getTime()))))
    : null;

  const payload = {
    batch_id: batch.id,
    straw_type: materialType,
    start_time: overall_start_time,
    iscompleted: isCompleted,
    bunker_process1: {
      start_time: formatDateTime(bunker1_start),
      end_time: formatDateTime(bunker1_end),
      moisture: bunker1.moisture ? parseFloat(bunker1.moisture) : null,
      temperature: bunker1.temperature ? parseFloat(bunker1.temperature) : null,
      remarks: bunker1.remarks || null
    },
    bunker_process1_rest: {
      start_time: formatDateTime(bunker1_rest_start),
      end_time: formatDateTime(bunker1_rest_end),
      moisture: bunker1Rest.moisture ? parseFloat(bunker1Rest.moisture) : null,
      temperature: bunker1Rest.temperature ? parseFloat(bunker1Rest.temperature) : null,
      remarks: bunker1Rest.remarks || null
    },
    bunker_process2: {
      start_time: formatDateTime(bunker2_start),
      end_time: formatDateTime(bunker2_end),
      moisture: bunker2.moisture ? parseFloat(bunker2.moisture) : null,
      temperature: bunker2.temperature ? parseFloat(bunker2.temperature) : null,
      remarks: bunker2.remarks || null
    },
    bunker_process2_rest: {
      start_time: formatDateTime(bunker2_rest_start),
      end_time: formatDateTime(bunker2_rest_end),
      moisture: bunker2Rest.moisture ? parseFloat(bunker2Rest.moisture) : null,
      temperature: bunker2Rest.temperature ? parseFloat(bunker2Rest.temperature) : null,
      remarks: bunker2Rest.remarks || null
    },
    bunker_process3: {
      start_time: formatDateTime(bunker3_start),
      end_time: formatDateTime(bunker3_end),
      moisture: bunker3.moisture ? parseFloat(bunker3.moisture) : null,
      temperature: bunker3.temperature ? parseFloat(bunker3.temperature) : null,
      remarks: bunker3.remarks || null
    },
    bunker_process3_rest: {
      start_time: formatDateTime(bunker3_rest_start),
      end_time: formatDateTime(bunker3_rest_end),
      moisture: bunker3Rest.moisture ? parseFloat(bunker3Rest.moisture) : null,
      temperature: bunker3Rest.temperature ? parseFloat(bunker3Rest.temperature) : null,
      remarks: bunker3Rest.remarks || null
    }
  };

  Object.keys(payload).forEach(key => {
    if (payload[key] === null) {
      delete payload[key];
    } else if (typeof payload[key] === 'object' && payload[key] !== null && key !== 'batch_id' && key !== 'straw_type' && key !== 'iscompleted') {
      Object.keys(payload[key]).forEach(subKey => {
        if (payload[key][subKey] === null || payload[key][subKey] === undefined) {
          delete payload[key][subKey];
        }
      });
      
      if (Object.keys(payload[key]).length === 0) {
        delete payload[key];
      }
    }
  });

  return payload;
};

const convertApiResponseToUI = (apiData, batch) => {
  if (!apiData || !Array.isArray(apiData)) {
    return batch;
  }

  const materialDataMap = {};
  apiData.forEach(item => {
    if (item.straw_type) {
      materialDataMap[item.straw_type] = item;
    }
  });

  
  const substageMapping = [
    { index: 0, field: 'bunker_process1' },
    { index: 1, field: 'bunker_process1_rest' },
    { index: 2, field: 'bunker_process2' },
    { index: 3, field: 'bunker_process2_rest' },
    { index: 4, field: 'bunker_process3' },
    { index: 5, field: 'bunker_process3_rest' }
  ];

  substageMapping.forEach(({ index, field }) => {
    for (const materialType of batch.materialTypes) {
      const materialData = materialDataMap[materialType];
      if (!materialData) continue;
      
      const stageData = materialData[field];
      if (stageData && batch.substages[index]) {
        if (!batch.substages[index].startDate && stageData.start_time) {
          const { date, time } = parseDateTime(stageData.start_time);
          batch.substages[index].startDate = date;
          batch.substages[index].startTime = time;
        }
        
        if (!batch.substages[index].endDate && stageData.end_time) {
          const { date, time } = parseDateTime(stageData.end_time);
          batch.substages[index].endDate = date;
          batch.substages[index].endTime = time;
        }
        
        if (!batch.substages[index].totalHours && stageData.duration_hours !== undefined && stageData.duration_hours !== null) {
          batch.substages[index].totalHours = stageData.duration_hours.toFixed(1);
        }
        
        if (!batch.substages[index].moisture && stageData.moisture !== undefined && stageData.moisture !== null) {
          batch.substages[index].moisture = stageData.moisture.toString();
        }
        
        if (!batch.substages[index].temperature && stageData.temperature !== undefined && stageData.temperature !== null) {
          batch.substages[index].temperature = stageData.temperature.toString();
        }
        
        if (!batch.substages[index].remarks && stageData.remarks) {
          batch.substages[index].remarks = stageData.remarks;
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });


    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      console.error(' API Error Response:', errorData);
      
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
    console.error(` ERROR sending ${displayName} data:`, error);
    return { success: false, error: error.message, materialType, displayName };
  }
};

const BunkerTable = React.memo(({ batch, onUpdate, readOnly = false }) => {
  const toast = useToast();

  const validateDateRange = (substage, field, newValue) => {
    if (field === 'startDate' || field === 'startTime') {
      if (substage.endDate && substage.endTime) {
        const newStartDateTime = field === 'startDate' 
          ? combineDateTime(newValue, substage.startTime)
          : combineDateTime(substage.startDate, newValue);
        const endDateTime = combineDateTime(substage.endDate, substage.endTime);
        
        if (newStartDateTime && endDateTime && new Date(newStartDateTime) > new Date(endDateTime)) {
          toast.error(`${substage.name}: Start date/time cannot be after end date/time`);
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
          toast.error(`${substage.name}: End date/time cannot be before start date/time`);
          return false;
        }
      }
    }
    return true;
  };

  const getMinEndDate = (substage) => {
    if (substage.startDate) {
      return substage.startDate;
    }
    return undefined;
  };

  const getMinEndTime = (substage) => {
    if (substage.startDate === substage.endDate && substage.startTime) {
      return substage.startTime;
    }
    return undefined;
  };

  const handleInputChange = (index, field, value) => {
    if (readOnly) return;
    
    const updatedBatch = { ...batch };
    const substage = updatedBatch.substages[index];
    
    if (field === 'startDate' || field === 'startTime' || field === 'endDate' || field === 'endTime') {
      if (!validateDateRange(substage, field, value)) {
        return;
      }
    }
    
    substage[field] = value;
    
    if (substage.startDate && substage.startTime && substage.endDate && substage.endTime) {
      const startDateTime = new Date(`${substage.startDate}T${substage.startTime}`);
      const endDateTime = new Date(`${substage.endDate}T${substage.endTime}`);
      const diffHours = (endDateTime - startDateTime) / (1000 * 60 * 60);
      substage.totalHours = diffHours.toFixed(1);
    }
    
    onUpdate(updatedBatch);
  };

  const getMaterialsDisplay = () => {
    if (batch.materialDisplayNames && batch.materialDisplayNames.length > 0) {
      return batch.materialDisplayNames.join(' + ');
    }
    return 'Bunker Process';
  };

  return (
    <div className="table-section">
      <h3 className="table-title">Bunker Process - {getMaterialsDisplay()}</h3>
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
            {batch.substages.map((substage, index) => (
              <tr key={index}>
                <td className="substage-name">{substage.name}</td>
                <td>
                  <input
                    type="date"
                    value={substage.startDate || ''}
                    onChange={(e) => handleInputChange(index, 'startDate', e.target.value)}
                    className="table-input"
                    disabled={readOnly}
                    max={substage.endDate || undefined}
                  />
                </td>
                <td>
                  <input
                    type="time"
                    value={substage.startTime || ''}
                    onChange={(e) => handleInputChange(index, 'startTime', e.target.value)}
                    className="table-input"
                    disabled={readOnly}
                    max={substage.startDate === substage.endDate ? substage.endTime : undefined}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={substage.endDate || ''}
                    onChange={(e) => handleInputChange(index, 'endDate', e.target.value)}
                    className="table-input"
                    disabled={readOnly}
                    min={getMinEndDate(substage)}
                  />
                </td>
                <td>
                  <input
                    type="time"
                    value={substage.endTime || ''}
                    onChange={(e) => handleInputChange(index, 'endTime', e.target.value)}
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
                    onChange={(e) => handleInputChange(index, 'moisture', e.target.value)}
                    className="table-input moisture-input"
                    placeholder="%"
                    min="0"
                    max="100"
                    step="0.1"
                    disabled={readOnly}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={substage.temperature || ''}
                    onChange={(e) => handleInputChange(index, 'temperature', e.target.value)}
                    className="table-input temperature-input"
                    placeholder="°C"
                    min="0"
                    max="100"
                    step="0.1"
                    disabled={readOnly}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={substage.remarks || ''}
                    onChange={(e) => handleInputChange(index, 'remarks', e.target.value)}
                    className="table-input remarks-input"
                    placeholder="Add remarks..."
                    disabled={readOnly}
                  />
                </td>
              </tr>
            ))}
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
  const searchParams = useSearchParams();
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
      let batchIdToUse = batchId;
      
      if (batchIdToUse) {
        const batchResponse = await fetch(`${BATCH_FETCH_ENDPOINT}/${batchIdToUse}`);
        
        if (batchResponse.ok) {
          const batchResult = await batchResponse.json();
          selectedBatch = batchResult.data || batchResult;
        } else {
          const allBatchesResponse = await fetch(BATCH_FETCH_ENDPOINT);
          if (allBatchesResponse.ok) {
            const allBatchesResult = await allBatchesResponse.json();
            let batches = [];
            if (Array.isArray(allBatchesResult)) {
              batches = allBatchesResult;
            } else if (allBatchesResult.success) {
              batches = allBatchesResult.data;
            }
            selectedBatch = batches.find(b => b.id === batchIdToUse);
          }
        }
      } else {
        const batchResponse = await fetch(BATCH_FETCH_ENDPOINT);
        
        if (!batchResponse.ok) {
          throw new Error('Failed to fetch batches');
        }
        
        const batchResult = await batchResponse.json();
        
        let batches = [];
        if (Array.isArray(batchResult)) {
          batches = batchResult;
        } else if (batchResult.success) {
          batches = batchResult.data;
        }

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
      
      if (strawDataResult.success && strawDataResult.data && strawDataResult.data.length > 0) {
        const populatedBatch = convertApiResponseToUI(strawDataResult.data, newBatch);
        onSelectBatch(populatedBatch);
        toast.success(`Loaded batch ${batchNum} with existing data (${materials.length} material${materials.length > 1 ? 's' : ''})`);
      } else if (strawDataResult.success) {
        onSelectBatch(newBatch);
        toast.success(`Loaded batch ${batchNum} (${materials.length} material${materials.length > 1 ? 's' : ''} - no existing data)`);
      } else {
        toast.warning(`Loaded batch ${batchNum} but failed to fetch existing data`);
        onSelectBatch(newBatch);
      }

    } catch (err) {
      console.error(' Error loading batch:', err);
      toast.error('Error loading batch details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    if (isLoading || loading) return;
    handleLoadBatch(batchNumber);
  };

  return (
    <div className="batch-selection">
      <h2>Bunker Management Process Entry</h2>
      
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

function BunkerManagementContent() {
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
    
    if (batchNum) {
      setInitialBatchNumber(batchNum);
      setInitialBatchId(batchId);
    }
  }, [searchParams]);

  const handleSelectBatch = (batch) => {
    setCurrentBatch(batch);
  };

  const handleUpdateBatch = useCallback((updatedBatch) => {
    setCurrentBatch(updatedBatch);
  }, []);

  const validateBatchData = (batch) => {
    if (!validateStageSequencing(batch.substages, toast)) {
      return false;
    }
    
    for (const substage of batch.substages) {
      if (substage.startDate && substage.startTime && substage.endDate && substage.endTime) {
        const startDateTime = new Date(`${substage.startDate}T${substage.startTime}`);
        const endDateTime = new Date(`${substage.endDate}T${substage.endTime}`);
        
        if (startDateTime > endDateTime) {
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
      const results = [];
      let hasAnyDataToSave = false;
      let successCount = 0;
      let failCount = 0;
      
      if (!hasCompleteData(currentBatch.substages)) {
        toast.info('No complete data to save. Please fill in all required fields.');
        setLoading(false);
        isSavingRef.current = false;
        return;
      }
      
      if (!validateBatchData(currentBatch)) {
        setLoading(false);
        isSavingRef.current = false;
        return;
      }
      
      for (const materialType of currentBatch.materialTypes) {
        const displayName = MATERIAL_DISPLAY_NAMES[materialType];
        
        const payload = convertToApiPayload(currentBatch, materialType, false);
        if (payload) {
          hasAnyDataToSave = true;
          
          const result = await sendToApi(payload, materialType, displayName);
          results.push(result);
          
          if (result.success) {
            successCount++;
            toast.success(`${displayName} data saved successfully!`);
          } else {
            failCount++;
            toast.error(`Failed to save ${displayName} data: ${result.error}`);
          }
        }
      }

      if (!hasAnyDataToSave) {
        toast.info('No data to save.');
        setLoading(false);
        isSavingRef.current = false;
        return;
      }
      
      const allSuccess = results.every(r => r.success);
      if (allSuccess) {
        toast.success(`All ${successCount} material data saved successfully!`);
      } else {
        toast.warning(`${successCount} material(s) saved successfully, ${failCount} failed`);
      }
    } catch (error) {
      toast.error('Failed to save batch data');
      console.error(' Save error:', error);
    } finally {
      setLoading(false);
      setTimeout(() => {
        isSavingRef.current = false;
      }, 1000);
    }
  };

  const handleBackToSelection = () => {
    setCurrentBatch(null);
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
              <ArrowBackIcon/>
            </button>
            <h2>{currentBatch.batchNumber}</h2>
            <span className="material-count">
              ({materialsDisplay})
            </span>
          </div>
          <div className="header-actions">
            <button 
              onClick={handleSave} 
              className="btn-save"
              disabled={loading}
            >
              <SaveIcon fontSize="small" />
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <BunkerTable 
          batch={currentBatch}
          onUpdate={handleUpdateBatch}
          readOnly={false}
        />
      </div>
    </AppLayout>
  );
}

export default function BunkerManagement() {
  return (
    <ToastProvider>
      <BunkerManagementContent />
    </ToastProvider>
  );
}