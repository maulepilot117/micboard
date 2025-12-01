/**
 * Main React application component
 * Full-featured Micboard application with demo mode
 */

import React, { useState } from 'react';
import { useMicboardStore } from './store/micboard-store';
import MicrophoneGrid from './components/MicrophoneGrid';
import Sidebar from './components/Sidebar';
import HelpScreen from './components/HelpScreen';
import QRModal from './components/QRModal';
import GroupEditor from './components/GroupEditor';
import ExtendedEditor from './components/ExtendedEditor';
import ConfigEditor from './components/ConfigEditor';
import MessageBoard from './components/MessageBoard';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useDataConnection } from './hooks/useDataConnection';
import { useDemoMode } from './hooks/useDemoMode';
import { useUrlParams } from './hooks/useUrlParams';

export const App: React.FC = () => {
  const {
    displayMode,
    infoDrawerMode,
    settingsMode,
    connectionStatus,
    isDemo,
  } = useMicboardStore();

  const [showHelp, setShowHelp] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Initialize URL parameters
  useUrlParams();

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    onShowHelp: () => setShowHelp(true),
    onShowQR: () => setShowQR(true),
    onToggleSidebar: () => setShowSidebar(prev => !prev),
  });

  // Initialize data connection (WebSocket/polling) if not in demo mode
  useDataConnection(!isDemo);

  // Initialize demo mode if enabled
  useDemoMode(isDemo);

  // Determine display classes
  const displayClass = displayMode === 'tvmode' ? 'tvmode' : 'deskmode';
  const isDisconnected = connectionStatus === 'DISCONNECTED' && !isDemo;

  return (
    <>
      {/* Help screen - rendered outside container like vanilla JS */}
      {showHelp && <HelpScreen onClose={() => setShowHelp(false)} />}

      {/* QR Modal - rendered outside container */}
      {showQR && <QRModal onClose={() => setShowQR(false)} />}

      {/* Main container */}
      <div className={`container-fluid fullHeight ${displayClass} ${infoDrawerMode}`} id="container">
        {/* Connection error message - shown when disconnected but UI still accessible */}
        {isDisconnected && <MessageBoard />}

        {/* Main microphone grid - hidden when disconnected */}
        {!isDisconnected && <MicrophoneGrid />}

        {/* Sidebar for group selection and settings */}
        {showSidebar && <Sidebar onClose={() => setShowSidebar(false)} />}

        {/* Settings editors */}
        {settingsMode === 'CONFIG' && <ConfigEditor />}
        {settingsMode === 'EXTENDED' && <ExtendedEditor />}
        {settingsMode === 'GROUP' && <GroupEditor />}

        {/* Hidden element for demo mode indicator */}
        {isDemo && (
          <div style={{ display: 'none' }} id="demo-mode-indicator">
            Demo Mode Active
          </div>
        )}
      </div>
    </>
  );
};