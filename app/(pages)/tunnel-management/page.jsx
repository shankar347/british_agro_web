"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { ToastProvider, useToast } from "../../components/common/Toaster";
import "../../styles/pages/unified-platform.css";

import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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

const STAGE_NAMES = [
  "Tunnel Process"
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
      throw new Error(`Failed to fetch tunnel data: ${response.status}`);
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
    console.error(' Error fetching tunnel data:', error);
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
  const tunnelProcess = substages[0] || createEmptySubstage("Tunnel Process");

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

  const start_time = (tunnelProcess.startDate && tunnelProcess.startTime) 
    ? combineDateTime(tunnelProcess.startDate, tunnelProcess.startTime) 
    : null;
  
  const end_time = (tunnelProcess.endDate && tunnelProcess.endTime) 
    ? combineDateTime(tunnelProcess.endDate, tunnelProcess.endTime) 
    : null;

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
      temperature: tunnelProcess.temperature ? parseFloat(tunnelProcess.temperature) : null,
      remarks: tunnelProcess.remarks || null
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
  if (!apiData || !Array.isArray(apiData) || apiData.length === 0) {
    return batch;
  }

  const firstItem = apiData[0];
  
  if (firstItem && batch.substages[0]) {
    
    const tunnelData = firstItem.tunnel_process || firstItem;
    
    if (tunnelData.start_time || firstItem.start_time) {
      const startTime = tunnelData.start_time || firstItem.start_time;
      const { date, time } = parseDateTime(startTime);
      batch.substages[0].startDate = date;
      batch.substages[0].startTime = time;
    }
    
    if (tunnelData.end_time || firstItem.end_time) {
      const endTime = tunnelData.end_time || firstItem.end_time;
      const { date, time } = parseDateTime(endTime);
      batch.substages[0].endDate = date;
      batch.substages[0].endTime = time;
    }
    
    if (batch.substages[0].startDate && batch.substages[0].startTime && 
        batch.substages[0].endDate && batch.substages[0].endTime) {
      const startDateTime = new Date(`${batch.substages[0].startDate}T${batch.substages[0].startTime}`);
      const endDateTime = new Date(`${batch.substages[0].endDate}T${batch.substages[0].endTime}`);
      const diffHours = (endDateTime - startDateTime) / (1000 * 60 * 60);
      batch.substages[0].totalHours = diffHours.toFixed(1);
    } else if (tunnelData.duration_hours !== undefined && tunnelData.duration_hours !== null) {
      batch.substages[0].totalHours = tunnelData.duration_hours.toString();
    }
    
    if (tunnelData.moisture !== undefined && tunnelData.moisture !== null) {
      batch.substages[0].moisture = tunnelData.moisture.toString();
    }
    
    // Set temperature
    if (tunnelData.temperature !== undefined && tunnelData.temperature !== null) {
      batch.substages[0].temperature = tunnelData.temperature.toString();
    }
    
    // Set remarks
    if (tunnelData.remarks) {
      batch.substages[0].remarks = tunnelData.remarks;
    }
  }

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

const completeBatch = async (batchId) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const currentDateTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    
    const payload = {
      planned_comp_date: currentDateTime,
      planned_comp_time: currentDateTime,
      status: "completed",
      current_stage: "completed"
    };

    console.log('Completing batch with payload:', payload);

    const response = await fetch(`${BATCH_FETCH_ENDPOINT}/${batchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      console.error(' Batch completion API Error Response:', errorData);
      
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
    return { success: true, data: result };
  } catch (error) {
    console.error(' Error completing batch:', error);
    return { success: false, error: error.message };
  }
};

const TunnelTable = React.memo(({ batch, onUpdate, readOnly = false }) => {
  const toast = useToast();

  const validateDateRange = (substage, field, value) => {
    if (field === 'startDate' || field === 'startTime') {
      if (substage.endDate && substage.endTime) {
        const newStartDateTime = field === 'startDate' 
          ? combineDateTime(value, substage.startTime)
          : combineDateTime(substage.startDate, value);
        const endDateTime = combineDateTime(substage.endDate, substage.endTime);
        
        if (newStartDateTime && endDateTime && new Date(newStartDateTime) > new Date(endDateTime)) {
          toast.error(`Start date/time cannot be after end date/time`);
          return false;
        }
      }
    } else if (field === 'endDate' || field === 'endTime') {
      if (substage.startDate && substage.startTime) {
        const startDateTime = combineDateTime(substage.startDate, substage.startTime);
        const newEndDateTime = field === 'endDate'
          ? combineDateTime(value, substage.endTime)
          : combineDateTime(substage.endDate, value);
        
        if (startDateTime && newEndDateTime && new Date(startDateTime) > new Date(newEndDateTime)) {
          toast.error(`End date/time cannot be before start date/time`);
          return false;
        }
      }
    }
    return true;
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
    return 'Tunnel Process';
  };

  return (
    <div className="table-section">
      <h3 className="table-title">Tunnel Process - {getMaterialsDisplay()}</h3>
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
                    min={substage.startDate || undefined}
                  />
                </td>
                <td>
                  <input
                    type="time"
                    value={substage.endTime || ''}
                    onChange={(e) => handleInputChange(index, 'endTime', e.target.value)}
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

TunnelTable.displayName = 'TunnelTable';

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

  return (
    <div className="batch-selection">
      <h2>Tunnel Management Process Entry</h2>
      
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
              onClick={() => handleLoadBatch(batchNumber)} 
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

function TunnelManagementContent() {
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
      
      for (const materialType of currentBatch.materialTypes) {
        const displayName = MATERIAL_DISPLAY_NAMES[materialType];
        
        const payload = convertToApiPayload(currentBatch, materialType, true);
        if (payload && Object.keys(payload).length > 2) { 
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
        } else {
          console.log(` No data to save for ${displayName}`);
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

  const handleOpenCompleteDialog = () => {
    setCompleteDialogOpen(true);
  };

  const handleCloseCompleteDialog = () => {
    setCompleteDialogOpen(false);
  };

const handleCompleteProcess = async () => {
  if (!currentBatch || isCompletingRef.current) return;

  handleCloseCompleteDialog();
  isCompletingRef.current = true;
  setCompleting(true);

  try {
    const result = await completeBatch(currentBatch.id);

    if (result.success) {
      toast.success('Batch marked as completed successfully!');
      
      if (result.data && result.data.data) {
        setCurrentBatch(prev => ({
          ...prev,
          batchData: {
            ...prev.batchData,
            ...result.data.data
          }
        }));
      }

      setTimeout(() => {
        router.push(`/batch-reports?batchId=${currentBatch.id}`);
      }, 1500);
    } else {
      toast.error(`Failed to complete batch: ${result.error}`);
    }
  } catch (error) {
    toast.error('Error completing batch');
    console.error(' Complete process error:', error);
  } finally {
    setCompleting(false);
    setTimeout(() => {
      isCompletingRef.current = false;
    }, 1000);
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
              disabled={loading || completing}
            >
              <SaveIcon fontSize="small" />
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={handleOpenCompleteDialog} 
              className="btn-complete"
              disabled={completing || loading}
              style={{
                marginLeft: '10px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: completing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
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
          onClose={handleCloseCompleteDialog}
          aria-labelledby="complete-dialog-title"
          aria-describedby="complete-dialog-description"
        >
          <DialogTitle id="complete-dialog-title">
            Confirm Batch Completion
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="complete-dialog-description">
              Are you sure you want to mark this batch as completed? 
              This will update the planned completion date/time to the current time, 
              set the status to completed, and redirect you to the batch reports page.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCompleteDialog} color="primary">
              Cancel
            </Button>
            <Button 
              onClick={handleCompleteProcess} 
              color="primary" 
              variant="contained"
              autoFocus
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </AppLayout>
  );
}

export default function TunnelManagement() {
  return (
    <ToastProvider>
      <TunnelManagementContent />
    </ToastProvider>
  );
}