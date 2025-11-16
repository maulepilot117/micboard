/**
 * Main React application component
 * Phase 3A: Simple test component to verify React is working
 * Will be expanded in Phase 3B with actual micboard components
 */

import React, { useEffect } from 'react';
import { useMicboardStore } from './store/micboard-store';

export const App: React.FC = () => {
  const displayMode = useMicboardStore((state) => state.displayMode);
  const currentGroup = useMicboardStore((state) => state.currentGroup);
  const displayList = useMicboardStore((state) => state.displayList);
  const transmitters = useMicboardStore((state) => state.transmitters);
  const connectionStatus = useMicboardStore((state) => state.connectionStatus);

  // Log when component mounts
  useEffect(() => {
    console.log('React App component mounted');
    console.log('Zustand store initialized:', {
      displayMode,
      currentGroup,
      displayListLength: displayList.length,
      transmittersCount: Object.keys(transmitters).length,
    });
  }, []);

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg shadow-xl max-w-2xl mx-auto mt-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          🚀 Phase 3A: React Migration
        </h1>
        <p className="text-gray-400">
          React + TypeScript + Zustand + Tailwind CSS
        </p>
      </div>

      <div className="space-y-4">
        {/* Connection Status */}
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'CONNECTED' ? 'bg-mb-green' :
              connectionStatus === 'CONNECTING' ? 'bg-mb-yellow animate-pulse' :
              'bg-mb-red'
            }`} />
            <span className="text-sm">{connectionStatus}</span>
          </div>
        </div>

        {/* Display Mode */}
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Display Mode</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono">{displayMode}</span>
            <button
              onClick={() => {
                const newMode = displayMode === 'deskmode' ? 'tvmode' : 'deskmode';
                useMicboardStore.getState().setDisplayMode(newMode);
                console.log('Display mode changed to:', newMode);
              }}
              className="px-3 py-1 bg-mb-blue hover:bg-blue-600 rounded text-sm transition-colors"
            >
              Toggle
            </button>
          </div>
        </div>

        {/* Current Group */}
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Current Group</h2>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-mb-blue">{currentGroup}</span>
            <span className="text-sm text-gray-400">
              ({displayList.length} slots in display list)
            </span>
          </div>
          <div className="mt-2 flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => {
                  useMicboardStore.getState().switchGroup(num);
                  console.log('Switched to group:', num);
                }}
                className={`w-8 h-8 rounded ${
                  currentGroup === num
                    ? 'bg-mb-blue text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                } text-sm transition-colors`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Transmitters */}
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Transmitters</h2>
          <div className="text-sm">
            <p>Total: {Object.keys(transmitters).length}</p>
            <p className="text-gray-400 mt-1">
              {Object.keys(transmitters).length === 0
                ? 'No transmitters loaded yet (waiting for vanilla JS data)'
                : `Slots: ${Object.keys(transmitters).join(', ')}`}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Phase 3A Status</h2>
          <ul className="text-sm space-y-1">
            <li className="flex items-center gap-2">
              <span className="text-mb-green">✓</span>
              <span>React 18 mounted</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-mb-green">✓</span>
              <span>TypeScript configured</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-mb-green">✓</span>
              <span>Zustand store working</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-mb-green">✓</span>
              <span>Tailwind CSS applied</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-mb-yellow">⏳</span>
              <span>State sync with vanilla JS (next step)</span>
            </li>
          </ul>
        </div>

        {/* Instructions */}
        <div className="bg-blue-900 bg-opacity-30 p-4 rounded border border-blue-700">
          <h2 className="text-lg font-semibold mb-2">Next Steps</h2>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Implement bidirectional state sync</li>
            <li>Test with vanilla JS data</li>
            <li>Build first React component (MicrophoneSlot)</li>
            <li>Begin Phase 3B</li>
          </ol>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-700 text-center text-xs text-gray-500">
        Phase 3A Setup Complete • React {React.version}
      </div>
    </div>
  );
};
