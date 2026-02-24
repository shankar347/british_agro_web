"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { useAuth } from "./AuthContext";
import "../styles/components/AppLayout.css";
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

export default function AppLayout({ children, title }) {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const handleLogoutClick = () => {
    setShowLogoutPopup(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutPopup(false);
    logout();
  };

  const handleCancelLogout = () => {
    setShowLogoutPopup(false);
  };

  const handleSidebarToggle = (collapsed) => {
    setIsSidebarCollapsed(collapsed);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (loading || !user) return null;

  return (
    <div className="app-layout">
      <Sidebar onToggle={handleSidebarToggle} />
      <div className={`main-area ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="topbar">
          <div className="topbar-left">
           
          </div>
          <div className="topbar-right">
            <button className="topbar-fullscreen-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </button>
            <button className="topbar-logout" onClick={handleLogoutClick}>Logout</button>
          </div>
        </header>
        <main className="page-content">
          {title && (<><h1 className="page-title">{title}</h1><div className="page-divider" /></>)}
          {children}
        </main>
      </div>

      {showLogoutPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div className="popup-buttons">
              <button className="popup-cancel" onClick={handleCancelLogout}>Cancel</button>
              <button className="popup-confirm" onClick={handleConfirmLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}