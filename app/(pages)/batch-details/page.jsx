"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import "../../styles/pages/batch-details.css";

import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import AddchartIcon from '@mui/icons-material/Addchart';
import AssessmentIcon from '@mui/icons-material/Assessment'; // Report icon

const EMPTY = {
  batchId: "",
  bunkerId: "",
  dateAdded: "",
  position: "",
  notes: ""
};

export default function AddBatchToBunker() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [showRedirectMenu, setShowRedirectMenu] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/batches`);

        if (!response.ok) {
          throw new Error('Failed to fetch batches');
        }

        const result = await response.json();

        if (Array.isArray(result)) {
          setBatches(
            result.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
          );
        } else if (result.success) {
          setBatches(
            result.data.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
          );
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching batches:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateCompact = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const totalPages = Math.ceil(batches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = batches.slice(startIndex, endIndex);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaved(true);
    setForm(EMPTY);
    setTimeout(() => setSaved(false), 3000);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleViewDetails = (batchNumber) => {
    router.push(`/soaking?batch=${encodeURIComponent(batchNumber)}`);
  };

  const handleEditClick = (batch) => {
    router.push(`/add-new-batch?edit=${batch.id}`);
  };

  const handleReportClick = (batch) => {
    const params = new URLSearchParams({
      batch: batch.batch_number,
      batchId: batch.id
    });
    router.push(`/batch-reports?${params.toString()}`);
  };

  const handleUpdateClick = (e, batch) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + window.scrollY + 5,
      left: rect.left + window.scrollX - 150
    });
    setSelectedBatch(batch);
    setShowRedirectMenu(true);
  };

  const handleRedirect = (path) => {
    if (!selectedBatch) return;

    setShowRedirectMenu(false);

    const params = new URLSearchParams({
      batch: selectedBatch.batch_number,
      batchId: selectedBatch.id
    });

    router.push(`${path}?${params.toString()}`);
  };

  const toggleViewMode = (mode) => {
    setViewMode(mode);
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setShowRedirectMenu(false);
    };

    if (showRedirectMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showRedirectMenu]);

  return (
    <AppLayout title="Batch Details">
      {saved && (
        <div className="alert-success">
          ✓ Batch assigned to bunker successfully!
        </div>
      )}

      {showRedirectMenu && selectedBatch && (
        <div
          className="redirect-menu-overlay"
          onClick={() => setShowRedirectMenu(false)}
        >
          <div
            className="redirect-menu-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="redirect-menu-header">
              <span>Redirect Batch</span>
              <button
                className="close-menu-btn"
                onClick={() => setShowRedirectMenu(false)}
              >
                <CloseIcon fontSize="small" />
              </button>
            </div>

            <div className="redirect-menu-content">

              <div className="redirect-menu-items">
                <button
                  className="redirect-menu-item"
                  onClick={() => handleRedirect('/soaking')}
                >
                  Soaking
                </button>
                <button
                  className="redirect-menu-item"
                  onClick={() => handleRedirect('/unified-platform')}
                >
                  Unified Process
                </button>
                <button
                  className="redirect-menu-item"
                  onClick={() => handleRedirect('/bunker-management')}
                >
                  Bunker Management
                </button>
                <button
                  className="redirect-menu-item"
                  onClick={() => handleRedirect('/tunnel-management')}
                >
                  Tunnel Management
                </button>
              </div>

              <div className="redirect-menu-footer">
                {/* <button 
            className="redirect-btn"
            onClick={() => {
              if (selectedBatch) {
                router.push(`/soaking?batch=${encodeURIComponent(selectedBatch.batch_number)}&batchId=${selectedBatch.id}`);
                setShowRedirectMenu(false);
              }
            }}
          >
            Redirect
          </button> */}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: "2rem" }}>
        <div className="card-header">
          <h3>Recent Batches</h3>
          <div className="header-controls">
            <span className="total-count">Total: {batches.length} entries</span>
            <div className="view-toggle">
              <button
                className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => toggleViewMode('table')}
                title="Table View"
                aria-label="Switch to table view"
              >
                <ViewListIcon />
              </button>
              <button
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => toggleViewMode('grid')}
                title="Grid View"
                aria-label="Switch to grid view"
              >
                <GridViewIcon />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading batches...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">Error: {error}</p>
            <button
              className="retry-btn"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {viewMode === 'table' ? (
              /* Table View */
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Batch Number</th>
                      <th>Start Date</th>
                      <th>Start Time</th>
                      <th>Status</th>
                      <th>Current Stage</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.length > 0 ? (
                      currentItems.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <span
                              className="batch-number"
                              onClick={() => handleViewDetails(item.batch_number)}
                            >
                              {item.batch_number}
                            </span>
                          </td>
                          <td>{formatDate(item.start_date)}</td>
                          <td>{formatTime(item.start_time)}</td>
                          <td>
                            <span className={`status-badge ${item.status?.toLowerCase() || 'unknown'}`}>
                              {item.status || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <span className={`stage-badge ${item.current_stage?.toLowerCase() || 'unknown'}`}>
                              {item.current_stage || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="icon-button view-details-btn"
                                onClick={(e) => handleUpdateClick(e, item)}
                                title="Update/Redirect"
                                aria-label={`Update options for batch ${item.batch_number}`}
                              >
                                <AddchartIcon fontSize="small" />
                              </button>
                              <button
                                className="icon-button menu-btn"
                                onClick={() => handleEditClick(item)}
                                title="Edit Batch"
                                aria-label={`Edit batch ${item.batch_number}`}
                              >
                                <EditIcon fontSize="small" />
                              </button>
                              <button
                                className="icon-button report-btn"
                                onClick={() => handleReportClick(item)}
                                title="View Batch Report"
                                aria-label={`View report for batch ${item.batch_number}`}
                              >
                                <AssessmentIcon fontSize="small" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center empty-state">
                          No batches found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Grid View */
              <div className="grid-view-container">
                {currentItems.length > 0 ? (
                  <div className="grid-view">
                    {currentItems.map((item) => (
                      <div key={item.id} className="grid-card">
                        <div className="grid-card-header">
                          <span
                            className="batch-number"
                            onClick={() => handleViewDetails(item.batch_number)}
                          >
                            {item.batch_number}
                          </span>
                          <div className="grid-card-actions">
                            <button
                              className="icon-button view-details-btn"
                              onClick={(e) => handleUpdateClick(e, item)}
                              title="Update/Redirect"
                              aria-label={`Update options for batch ${item.batch_number}`}
                            >
                              <AddchartIcon fontSize="small" />
                            </button>
                            <button
                              className="icon-button menu-btn"
                              onClick={() => handleEditClick(item)}
                              title="Edit Batch"
                              aria-label={`Edit batch ${item.batch_number}`}
                            >
                              <EditIcon fontSize="small" />
                            </button>
                            <button
                              className="icon-button report-btn"
                              onClick={() => handleReportClick(item)}
                              title="View Batch Report"
                              aria-label={`View report for batch ${item.batch_number}`}
                            >
                              <AssessmentIcon fontSize="small" />
                            </button>
                          </div>
                        </div>

                        <div className="grid-card-body">
                          <div className="grid-info-item">
                            <CalendarTodayIcon fontSize="small" className="grid-info-icon" />
                            <div className="grid-info-content">
                              <span className="grid-info-label">Start Date</span>
                              <span className="grid-info-value">{formatDateCompact(item.start_date)}</span>
                            </div>
                          </div>

                          <div className="grid-info-item">
                            <AccessTimeIcon fontSize="small" className="grid-info-icon" />
                            <div className="grid-info-content">
                              <span className="grid-info-label">Start Time</span>
                              <span className="grid-info-value">{formatTime(item.start_time)}</span>
                            </div>
                          </div>

                          <div className="grid-info-item">
                            <span className="grid-info-label">Status</span>
                            <span className={`status-badge ${item.status?.toLowerCase() || 'unknown'}`}>
                              {item.status || 'N/A'}
                            </span>
                          </div>

                          <div className="grid-info-item">
                            <span className="grid-info-label">Current Stage</span>
                            <span className={`stage-badge ${item.current_stage?.toLowerCase() || 'unknown'}`}>
                              {item.current_stage || 'N/A'}
                            </span>
                          </div>
                        </div>

                        {item.remarks && (
                          <div className="grid-card-footer">
                            <span className="remarks-label">Remarks:</span>
                            <span className="remarks-value">{item.remarks}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    No batches found
                  </div>
                )}
              </div>
            )}

            {/* Pagination Controls */}
            {batches.length > 0 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  Showing {startIndex + 1} to {Math.min(endIndex, batches.length)} of {batches.length} entries
                </div>

                <div className="pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    &laquo;
                  </button>

                  <div className="pagination-pages">
                    {getPageNumbers().map((page, index) => (
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
                      ) : (
                        <button
                          key={page}
                          className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                          onClick={() => handlePageChange(page)}
                          aria-label={`Page ${page}`}
                          aria-current={currentPage === page ? 'page' : undefined}
                        >
                          {page}
                        </button>
                      )
                    ))}
                  </div>

                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                  >
                    &raquo;
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}