"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { ToastProvider, useToast } from "../../components/common/Toaster";
import "../../styles/pages/add-batch-to-bunker.css";

const EMPTY = { 
  batchId: "", 
  bunkerBatchNumber: "",  // Bunker Batch Number
  platformBatchNumber: "", // Platform Batch Number
  bunkerNumber: "",        // Bunker Number
  loadDate: "",           // Load Date
  loadTime: "",           // Load Time
  loadingMoisture: "",    // Loading Moisture
  loadingTemp: "",        // Loading Temperature
  plannedCompletionDate: "", // Planned Bunker Completion Date
  plannedCompletionTime: "", // Planned Bunker Completion Time
  notes: "" 
};

function AddBatchToBunkerContent() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e) => { 
    e.preventDefault(); 
    
    // Validation
    if (!form.bunkerBatchNumber) {
      toast.error('Please select a bunker batch number');
      return;
    }
    
    if (!form.platformBatchNumber) {
      toast.error('Please select a platform batch number');
      return;
    }
    
    if (!form.bunkerNumber) {
      toast.error('Please select a bunker number');
      return;
    }
    
    if (!form.loadDate) {
      toast.warning('Please select a load date');
      return;
    }

    if (!form.loadTime) {
      toast.warning('Please select a load time');
      return;
    }

    if (!form.loadingMoisture) {
      toast.warning('Please enter loading moisture');
      return;
    }

    if (!form.loadingTemp) {
      toast.warning('Please enter loading temperature');
      return;
    }

    if (!form.plannedCompletionDate) {
      toast.warning('Please select planned completion date');
      return;
    }

    if (!form.plannedCompletionTime) {
      toast.warning('Please select planned completion time');
      return;
    }
    
    try {
      // Here you would typically save to your backend
      console.log('Saving form data:', form);
      
      toast.success('Batch assigned to bunker successfully!');
      setForm(EMPTY); // Reset form after successful submission
      
      // Optional: Redirect after success
      // setTimeout(() => router.push("/dashboard"), 2000);
    } catch (error) {
      toast.error('Failed to assign batch. Please try again.');
      console.error('Assignment error:', error);
    }
  };

  return (
    <AppLayout title="Batch Information">
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Bunker Batch Number */}
            <div className="form-group">
              <label className="form-label">Bunker Batch Number :</label>
              <select 
                className="form-select" 
                name="bunkerBatchNumber" 
                value={form.bunkerBatchNumber} 
                onChange={handleChange} 
                required
              >
                <option value="">Select existing batch</option>
                <option value="B-0041">B-0041</option>
                <option value="B-0040">B-0040</option>
                <option value="B-0039">B-0039</option>
                <option value="B-0038">B-0038</option>
              </select>
            </div>
            
            {/* Platform Batch Number */}
            <div className="form-group">
              <label className="form-label">Platform Batch Number :</label>
              <select 
                className="form-select" 
                name="platformBatchNumber" 
                value={form.platformBatchNumber} 
                onChange={handleChange} 
                required
              >
                <option value="">Select Platform</option>
                <option value="Platform 1">Platform 1</option>
                <option value="Platform 2">Platform 2</option>
                <option value="Platform 3">Platform 3</option>
              </select>
            </div>
            
            {/* Bunker Number */}
            <div className="form-group">
              <label className="form-label">Bunker Number :</label>
              <select 
                className="form-select" 
                name="bunkerNumber" 
                value={form.bunkerNumber} 
                onChange={handleChange} 
                required
              >
                <option value="">Select bunker</option>
                <option value="Bunker 1">Bunker 1</option>
                <option value="Bunker 2">Bunker 2</option>
                <option value="Bunker 3">Bunker 3</option>
              </select>
            </div>
            
            {/* Load Date */}
            <div className="form-group">
              <label className="form-label">Load Date :</label>
              <input 
                className="form-input" 
                type="date" 
                name="loadDate" 
                value={form.loadDate} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            {/* Load Time */}
            <div className="form-group">
              <label className="form-label">Load Time :</label>
              <input 
                className="form-input" 
                type="time" 
                name="loadTime" 
                value={form.loadTime} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            {/* Loading Moisture */}
            <div className="form-group">
              <label className="form-label">Loading Moisture :</label>
              <input 
                className="form-input" 
                type="number" 
                name="loadingMoisture" 
                value={form.loadingMoisture} 
                onChange={handleChange} 
                placeholder="Enter moisture %"
                step="0.01"
                min="0"
                max="100"
                required 
              />
            </div>
            
            {/* Loading Temperature */}
            <div className="form-group">
              <label className="form-label">Loading Temperature :</label>
              <input 
                className="form-input" 
                type="number" 
                name="loadingTemp" 
                value={form.loadingTemp} 
                onChange={handleChange} 
                placeholder="Enter temperature °C"
                step="0.1"
                required 
              />
            </div>
            
            {/* Planned Bunker Completion Date */}
            <div className="form-group">
              <label className="form-label">Planned Bunker Completion Date :</label>
              <input 
                className="form-input" 
                type="date" 
                name="plannedCompletionDate" 
                value={form.plannedCompletionDate} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            {/* Planned Bunker Completion Time */}
            <div className="form-group">
              <label className="form-label">Planned Bunker Completion Time :</label>
              <input 
                className="form-input" 
                type="time" 
                name="plannedCompletionTime" 
                value={form.plannedCompletionTime} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            {/* Comments - Full Width */}
            <div className="form-group full-width">
              <label className="form-label">Comments :</label>
              <textarea 
                className="form-textarea" 
                name="notes" 
                value={form.notes} 
                onChange={handleChange} 
                placeholder="Any specific storage notes..."
                rows="4"
              />
            </div>
          </div>
          
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Add to Bunker</button>
            <button type="button" className="btn btn-secondary" onClick={() => router.push("/dashboard")}>Cancel</button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

export default function AddBatchToBunker() {
  return (
    <ToastProvider>
      <AddBatchToBunkerContent />
    </ToastProvider>
  );
}