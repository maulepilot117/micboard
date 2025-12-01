/**
 * MicrophoneSlot Component
 * Main component for displaying a wireless microphone/IEM device slot
 * Replicates the vanilla JS slot structure in React
 */

import React, { useState, useCallback } from 'react';
import { Transmitter } from '../types/micboard';
import { BatteryIndicator } from './BatteryIndicator';
import { DiversityIndicator } from './DiversityIndicator';
import AudioChart from './AudioChart';
import { useMicboardStore } from '../store/micboard-store';

interface MicrophoneSlotProps {
  transmitter: Transmitter;
  showChart?: boolean;
  className?: string;
}

/**
 * Formats the transmitter offset for display
 */
const formatOffset = (offset: number): string => {
  if (offset === 255) return '';
  if (offset === 0) return '0 dB';
  const sign = offset > 0 ? '+' : '';
  return `${sign}${offset} dB`;
};

/**
 * Quality display table matching vanilla JS
 * Uses filled (●) and empty (○) circles
 */
const QUALITY_TABLE: Record<number, string> = {
  0: '○○○○○',
  1: '●○○○○',
  2: '●●○○○',
  3: '●●●○○',
  4: '●●●●○',
  5: '●●●●●',
  255: '',
};

/**
 * Formats quality/signal strength as bullet points
 */
const formatQuality = (quality: number): string => {
  return QUALITY_TABLE[quality] ?? '';
};

export const MicrophoneSlot: React.FC<MicrophoneSlotProps> = ({
  transmitter,
  showChart = true,
  className = '',
}) => {
  const { settingsMode, currentGroup, groups } = useMicboardStore();
  const [infoDrawerVisible, setInfoDrawerVisible] = useState(true);

  const isError = transmitter.status === 'RX_COM_ERROR';
  const hasBattery = transmitter.battery !== 255;
  const isFrequencyOffline = transmitter.frequency === '000000';

  // Check if charts should be hidden for current group
  const shouldHideChart = currentGroup !== 0 && groups[currentGroup]?.hide_charts && !hasBattery;

  // Handle mobile tap to toggle info drawer (≤980px)
  const handleSlotClick = useCallback((e: React.MouseEvent) => {
    if (window.innerWidth <= 980 && settingsMode !== 'EXTENDED') {
      e.stopPropagation();
      setInfoDrawerVisible(prev => !prev);
    }
  }, [settingsMode]);

  return (
    <div
      id={`slot-${transmitter.slot}`}
      className={`col-sm ${className}`}
      onClick={handleSlotClick}
      style={{ position: 'relative' }}
    >
      {/* Device name with status color */}
      <div className={`mic_name ${transmitter.status}`}>
        <p className="mic_id">{transmitter.id}</p>
        <p className="name">{transmitter.name}</p>
      </div>

      {/* Status electrode bar */}
      <div className={`electrode ${transmitter.status}`} />

      {/* Info drawer with all device details */}
      <div
        className="info-drawer"
        style={{ display: infoDrawerVisible ? 'block' : 'none', position: 'relative' }}
      >
        {/* Battery indicator */}
        <BatteryIndicator level={transmitter.battery} />

        {/* Chart zone - shown when device is working */}
        {!isError && (
          <div className="chartzone">
            <p className="runtime">{transmitter.runtime}</p>
            <p className="offset">{formatOffset(transmitter.tx_offset)}</p>

            {/* SmoothieChart for audio/RF levels */}
            {showChart && !shouldHideChart && (
              <AudioChart slot={transmitter.slot} type={transmitter.type} />
            )}

            <p className="quality">{formatQuality(transmitter.quality)}</p>
            <p
              className="frequency"
              style={{ display: isFrequencyOffline ? 'none' : 'block' }}
            >
              {transmitter.frequency} Hz
            </p>
          </div>
        )}

        {/* Error zone - shown when RX communication error */}
        {isError && (
          <div className="errorzone">
            <p className="errortype">RX COM Error</p>
            <p className="ip">{transmitter.ip}</p>
            <p className="rxinfo">
              {transmitter.type.toUpperCase()} CH {transmitter.channel}
            </p>
          </div>
        )}

        {/* Edit zone - for extended ID/name editing */}
        {settingsMode === 'EXTENDED' && (
          <div className="editzone" style={{ display: 'block' }}>
            <p className="rx-name">{transmitter.name_raw}</p>
            <div className="form-row">
              <div className="col">
                <input
                  type="text"
                  className="form-control ext-id"
                  placeholder="ID"
                  defaultValue={transmitter.extended_id || ''}
                />
              </div>
              <div className="col">
                <input
                  type="text"
                  className="form-control ext-name"
                  placeholder="Name"
                  defaultValue={transmitter.extended_name || ''}
                />
              </div>
            </div>
          </div>
        )}

        {/* Diversity (antenna) indicator */}
        <DiversityIndicator antenna={transmitter.antenna} />
      </div>
    </div>
  );
};
