import React, { useState, useEffect } from 'react';
import '../../styles/components/common/popup.css'; // We'll create this file next

const DynamicPopup = ({
  isOpen,
  onClose,
  title,
  children,
  type = 'default',
  showFooter = true,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  size = 'medium',
  closeOnOutsideClick = true,
  showCloseButton = true,
  customClass = '',
  animation = 'slideIn',
  position = 'center'
}) => {
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    setIsVisible(isOpen);
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isVisible) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const handleOverlayClick = (e) => {
    if (closeOnOutsideClick && e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleConfirm = () => {
    onConfirm?.();
    handleClose();
  };

  const handleCancel = () => {
    onCancel?.();
    handleClose();
  };

  if (!isVisible) return null;

  const popupClasses = [
    'popup-container',
    `popup-${type}`,
    `popup-${size}`,
    `popup-${position}`,
    `popup-animation-${animation}`,
    customClass
  ].filter(Boolean).join(' ');

  return (
    <div className="popup-overlay" onClick={handleOverlayClick}>
      <div className={popupClasses}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="popup-header">
            {title && <h3 className="popup-title">{title}</h3>}
            {showCloseButton && (
              <button className="popup-close" onClick={handleClose}>
                ×
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="popup-body">
          {children}
        </div>

        {/* Footer */}
        {showFooter && (
          <div className="popup-footer">
            <button
              className="popup-btn popup-btn-secondary"
              onClick={handleCancel}
            >
              {cancelText}
            </button>
            <button
              className="popup-btn popup-btn-primary"
              onClick={handleConfirm}
            >
              {confirmText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Example usage component
const PopupDemo = () => {
  const [isBasicPopupOpen, setIsBasicPopupOpen] = useState(false);
  const [isSuccessPopupOpen, setIsSuccessPopupOpen] = useState(false);
  const [isErrorPopupOpen, setIsErrorPopupOpen] = useState(false);
  const [isCustomPopupOpen, setIsCustomPopupOpen] = useState(false);
  const [isLargePopupOpen, setIsLargePopupOpen] = useState(false);

  return (
    <div className="demo-container">
      <h1 className="demo-title">Dynamic Popup Component</h1>
      
      <div className="demo-buttons">
        <button
          className="btn btn-primary"
          onClick={() => setIsBasicPopupOpen(true)}
        >
          Basic Popup
        </button>
        
        <button
          className="btn btn-success"
          onClick={() => setIsSuccessPopupOpen(true)}
        >
          Success Popup
        </button>
        
        <button
          className="btn btn-error"
          onClick={() => setIsErrorPopupOpen(true)}
        >
          Error Popup
        </button>
        
        <button
          className="btn btn-warning"
          onClick={() => setIsCustomPopupOpen(true)}
        >
          Custom Popup
        </button>
        
        <button
          className="btn btn-large"
          onClick={() => setIsLargePopupOpen(true)}
        >
          Large Popup
        </button>
      </div>

      {/* Basic Popup */}
      <DynamicPopup
        isOpen={isBasicPopupOpen}
        onClose={() => setIsBasicPopupOpen(false)}
        title="Basic Popup"
        onConfirm={() => console.log('Confirmed!')}
      >
        <p>This is a basic popup with default settings.</p>
        <p>You can put any content here!</p>
      </DynamicPopup>

      {/* Success Popup */}
      <DynamicPopup
        isOpen={isSuccessPopupOpen}
        onClose={() => setIsSuccessPopupOpen(false)}
        title="Success!"
        type="success"
        confirmText="Great!"
        onConfirm={() => console.log('Success confirmed!')}
      >
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '48px' }}>✅</span>
          <p>Your action was completed successfully!</p>
        </div>
      </DynamicPopup>

      {/* Error Popup */}
      <DynamicPopup
        isOpen={isErrorPopupOpen}
        onClose={() => setIsErrorPopupOpen(false)}
        title="Error Occurred"
        type="error"
        confirmText="Try Again"
        cancelText="Cancel"
        onConfirm={() => console.log('Retry clicked!')}
      >
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '48px' }}>❌</span>
          <p>Something went wrong. Please try again.</p>
        </div>
      </DynamicPopup>

      {/* Custom Popup */}
      <DynamicPopup
        isOpen={isCustomPopupOpen}
        onClose={() => setIsCustomPopupOpen(false)}
        title="Custom Content"
        type="warning"
        showFooter={false}
        closeOnOutsideClick={false}
        size="small"
      >
        <div className="custom-content">
          <h4>Custom Form</h4>
          <input 
            type="text" 
            placeholder="Enter your name"
            className="custom-input"
          />
          <input 
            type="email" 
            placeholder="Enter your email"
            className="custom-input"
          />
          <button 
            className="custom-submit"
            onClick={() => setIsCustomPopupOpen(false)}
          >
            Submit
          </button>
        </div>
      </DynamicPopup>

      {/* Large Popup */}
      <DynamicPopup
        isOpen={isLargePopupOpen}
        onClose={() => setIsLargePopupOpen(false)}
        title="Large Popup"
        size="large"
        confirmText="Save"
        onConfirm={() => console.log('Saved!')}
      >
        <div>
          <h4>Settings</h4>
          <div className="settings-group">
            <label>
              <input type="checkbox" /> Option 1
            </label>
            <label>
              <input type="checkbox" /> Option 2
            </label>
            <label>
              <input type="checkbox" /> Option 3
            </label>
          </div>
          <p>This popup has more space for complex content.</p>
        </div>
      </DynamicPopup>
    </div>
  );
};

export default PopupDemo;