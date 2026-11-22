import React from 'react';
import { UserProfile } from '../types';

interface HeaderProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onQuickScan: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  candidateName: string;
  resumeScore?: number;
  userProfile?: UserProfile;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onQuickScan,
  isSidebarOpen,
  onToggleSidebar,
  isDarkMode,
  onToggleDarkMode,
  candidateName,
  resumeScore,
  userProfile,
  onSignOut,
}) => {
  const displayName = userProfile?.name || candidateName;
  const initial = displayName.trim().charAt(0) || 'U';

  return (
    <header
      className={`fixed top-0 right-0 left-0 ${
        isSidebarOpen ? 'lg:left-60' : 'lg:left-0'
      } h-16 z-30 bg-surface border-b border-outline-variant/60 shadow-xs flex justify-between items-center px-4 sm:px-6 transition-all duration-200`}
    >
      {/* Left Area: Sidebar Toggle Button + Navbar Items (only shown when Sidebar is collapsed) */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer shrink-0"
          aria-label={isSidebarOpen ? 'Collapse navigation sidebar' : 'Open navigation sidebar'}
          title={isSidebarOpen ? 'Collapse Sidebar' : 'Open Sidebar'}
        >
          <span className="material-symbols-outlined text-[22px]">
            {isSidebarOpen ? 'menu_open' : 'menu'}
          </span>
        </button>

        {/* Shown on Top Navbar ONLY when Sidebar is collapsed */}
        {!isSidebarOpen && (
          <>
            <button
              type="button"
              onClick={() => onSelectTab('analyzer')}
              className="hidden sm:flex items-center gap-2 pr-3 mr-1 border-r border-outline-variant/60 cursor-pointer shrink-0"
            >
              <div className="h-7 w-7 rounded-lg bg-primary-container flex items-center justify-center text-white shadow-xs">
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              </div>
              <span className="text-sm font-bold tracking-tight text-on-surface dark:text-white whitespace-nowrap">
                CareerAI
              </span>
            </button>

            <nav aria-label="Primary Navigation" className="flex items-center gap-3 sm:gap-5">
              <button
                type="button"
                onClick={() => onSelectTab('dashboard')}
                className={`cursor-pointer py-1.5 text-xs lg:text-sm flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'dashboard'
                    ? 'text-primary font-bold border-b-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface font-medium'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">space_dashboard</span>
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('analyzer')}
                className={`cursor-pointer py-1.5 text-xs lg:text-sm flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'analyzer'
                    ? 'text-primary font-bold border-b-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface font-medium'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">document_scanner</span>
                <span>Resume Analyzer</span>
                {typeof resumeScore === 'number' && (
                  <span className="hidden xl:inline-block text-[10px] bg-secondary/15 text-secondary px-1.5 py-0.5 rounded font-mono font-bold">
                    {resumeScore}%
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('jobs')}
                className={`cursor-pointer py-1.5 text-xs lg:text-sm flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'jobs'
                    ? 'text-primary font-bold border-b-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface font-medium'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">work</span>
                <span>Job Matches</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('tailorer')}
                className={`cursor-pointer py-1.5 text-xs lg:text-sm flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'tailorer'
                    ? 'text-primary font-bold border-b-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface font-medium'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                <span>Resume Tailorer</span>
              </button>
            </nav>
          </>
        )}
      </div>

      {/* Trailing Actions & Profile Meta */}
      <div className="flex items-center gap-2 sm:gap-3 ml-2 shrink-0">
        {/* Dark / Light Mode Toggle Button */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-lg text-on-surface-variant dark:text-slate-300 hover:text-on-surface dark:hover:text-white hover:bg-surface-container dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isDarkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* Settings Icon Form (only on Navbar when Sidebar is collapsed) */}
        {!isSidebarOpen && (
          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            title="Settings"
            aria-label="Settings"
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant dark:text-slate-300 hover:text-on-surface dark:hover:text-white hover:bg-surface-container dark:hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
        )}

        <button
          type="button"
          onClick={onQuickScan}
          className="hidden sm:flex bg-surface-container-lowest dark:bg-white/5 hover:bg-surface-container dark:hover:bg-white/10 border border-outline-variant dark:border-white/15 text-on-surface dark:text-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95 whitespace-nowrap shrink-0"
        >
          <span className="material-symbols-outlined text-[16px] text-primary">flash_on</span>
          <span>Quick Scan</span>
        </button>

        {/* Profile Icon & Name Only (no job title) when Sidebar is collapsed; removed from navbar when Sidebar opens */}
        {!isSidebarOpen && (
          <div className="flex items-center gap-2 pl-2 border-l border-outline-variant/60">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs shadow-xs border border-primary/40 shrink-0">
              {initial}
            </div>

            <span className="hidden sm:inline-block text-xs font-bold text-on-surface dark:text-white truncate max-w-[140px]">
              {displayName}
            </span>

            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                title="Sign Out"
                aria-label="Sign Out"
                className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
