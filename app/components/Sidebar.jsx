"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./AuthContext";
import "../styles/components/Sidebar.css";
import Image from "next/image";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "home" },
  { label: "Forecast", href: "/forecast", icon: "forecast" },
  { divider: true },
  { label: "Add New Batch", href: "/add-new-batch", icon: "box" },
  { label: "Soaking", href: "/soaking", icon: "soaking" },

  // { label: "Unified Platform Process", href: "/unified-platform", icon: "platform"},
  // { label: "Bunker Management",        href: "/bunker-management", icon: "bunker"},
  // { label: "Tunnel Management",        href: "/tunnel-management", icon: "tunnel"},
  { label: "Batch Reports", href: "/batch-reports", icon: "reports" },

  // { label: "Add Batch to Bunker", href: "/add-batch-to-bunker", icon: "box-add"  },
  // { label: "Update Batch",        href: "/update-batch",        icon: "refresh"  },
  { divider: true },
  { label: "Batch Details", href: "/batch-details", icon: "list" },
  // { label: "Bunker Details",      href: "/bunker-details",      icon: "bunker"   },
  // { label: "Tunnel Details",      href: "/tunnel-details",      icon: "tunnel"   },
  { divider: true, adminOnly: true },
  { label: "Create User", href: "/create-user", icon: "userplus", adminOnly: true },
];

const ICONS = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9,22 9,12 15,12 15,22" /></svg>,
  forecast: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23,6 13.5,15.5 8.5,10.5 1,18" /><polyline points="17,6 23,6 23,12" /></svg>,
  box: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27,6.96 12,12.01 20.73,6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  "box-add": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><line x1="12" y1="8" x2="12" y2="14" /><line x1="9" y1="11" x2="15" y2="11" /></svg>,
  refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23,4 23,10 17,10" /><polyline points="1,20 1,14 7,14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>,
  list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>,
  bunker: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /></svg>,
  tunnel: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9a9 9 0 0 1 18 0v12H3V9z" /><line x1="12" y1="9" x2="12" y2="21" /></svg>,
  userplus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>,
  soaking: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20M2 12a10 10 0 0 1 20 0M2 12a10 10 0 0 0 20 0M12 2v20M2 12h20" /><path d="M8 8l8 8M8 16l8-8" /></svg>,
  platform: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="21" x2="9" y2="9" /></svg>,
  reports: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12v-2a5 5 0 0 0-5-5H8a5 5 0 0 0-5 5v2" /><circle cx="12" cy="16" r="5" /><path d="M12 11v5" /><path d="M9 8V6" /><path d="M15 8V6" /></svg>,
  collapse: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 3L3 21M3 3l18 18" /></svg>,
  "collapse-left": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>,
  "collapse-right": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>,
};

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Function to check if a path is active (including sub-items)
  const isPathActive = (itemHref) => {
    if (pathname === itemHref) return true;
    // For parent "Soaking" item, check if any child route is active
    if (itemHref === "/soaking") {
      return pathname?.startsWith("/soaking/");
    }
    return false;
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-container">
            <Image
              src="/assests/images/logo.png"
              alt="BritishAgro Logo"
              width={40}
              height={40}
              className="logo-image"
              priority
            />
            {!isCollapsed && <span className="logo-text">BritishAgro</span>}
          </div>
        </div>
        {/* <button className="collapse-btn" onClick={toggleSidebar} title={isCollapsed ? "Expand" : "Collapse"}>
          {isCollapsed ? ICONS["collapse-right"] : ICONS["collapse-left"]}
        </button> */}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item, idx) => {
          if ("divider" in item && item.divider) {
            if (item.adminOnly && user?.role !== "superadmin") return null;
            return <div className="sidebar-divider" key={idx} />;
          }
          if (item.adminOnly && user?.role !== "superadmin") return null;

          const isActive = isPathActive(item.href);
          const itemClass = `sidebar-item${isActive ? " active" : ""}${item.indent ? " indent" : ""}`;

          return (
            <div
              key={item.href}
              className={itemClass}
              onClick={() => router.push(item.href)}
              title={isCollapsed ? item.label : ""}
            >
              {ICONS[item.icon]}
              {!isCollapsed && <span>{item.label}</span>}

              {/* Tooltip for collapsed mode */}
              {isCollapsed && (
                <span className="sidebar-tooltip">{item.label}</span>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}