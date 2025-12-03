/**
 * IEMSlot Component
 * Dedicated component for displaying IEM (In-Ear Monitor) transmitter slots
 * Optimized for P10T/PSM1000 devices with stereo audio levels
 */

import React, { useState, useCallback } from 'react';
import { Transmitter } from '../types/micboard';
import AudioChart from './AudioChart';
import { useMicboardStore } from '../store/micboard-store';

interface IEMSlotProps {
  transmitter: Transmitter;
  showChart?: boolean;
  className?: string;
}

/**
 * Stereo level meter component - replaces battery indicator for IEMs
 * Shows L/R audio levels as horizontal bars
 */
const StereoLevelMeter: React.FC<{ left: number; right: number }> = ({ left, right }) => {
  // Audio levels are 0-80 scale from iem.py
  const leftPercent = Math.min(100, (left / 80) * 100);
  const rightPercent = Math.min(100, (right / 80) * 100);

  const getBarColor = (level: number): string => {
    if (level > 70) return '#DC493A'; // Red - clipping
    if (level > 50) return '#F4A261'; // Orange - hot
    return '#69B578'; // Green - normal
  };

  return (
    <div className="stereo-meter">
      <div className="stereo-meter-row">
        <span className="stereo-meter-label">L</span>
        <div className="stereo-meter-track">
          <div
            className="stereo-meter-fill"
            style={{
              width: `${leftPercent}%`,
              backgroundColor: getBarColor(left),
            }}
          />
        </div>
      </div>
      <div className="stereo-meter-row">
        <span className="stereo-meter-label">R</span>
        <div className="stereo-meter-track">
          <div
            className="stereo-meter-fill"
            style={{
              width: `${rightPercent}%`,
              backgroundColor: getBarColor(right),
            }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Formats the transmitter offset for display
 */
const formatOffset = (offset: number): string => {
  if (offset === 255 || offset === undefined) return '';
  if (offset === 0) return '0 dB';
  const sign = offset > 0 ? '+' : '';
  return `${sign}${offset} dB`;
};

export const IEMSlot: React.FC<IEMSlotProps> = ({
  transmitter,
  showChart = true,
  className = '',
}) => {
  const { settingsMode, currentGroup, groups } = useMicboardStore();
  const [infoDrawerVisible, setInfoDrawerVisible] = useState(true);

  const isError = transmitter.status === 'RX_COM_ERROR';
  const isFrequencyOffline = transmitter.frequency === '000000';

  // Check if charts should be hidden for current group
  const shouldHideChart = currentGroup !== 0 && groups[currentGroup]?.hide_charts;

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
      className={`col-sm iem-slot ${className}`}
      onClick={handleSlotClick}
      style={{ position: 'relative' }}
    >
      {/* Device name with status color - IEM badge */}
      <div className={`mic_name iem-name ${transmitter.status}`}>
        <p className="mic_id">
          <span className="iem-badge">IEM</span>
          {transmitter.id}
        </p>
        <p className="name">{transmitter.name}</p>
      </div>

      {/* Status electrode bar - cyan for IEM */}
      <div className={`electrode iem-electrode ${transmitter.status}`} />

      {/* Info drawer with IEM-specific details */}
      <div
        className="info-drawer"
        style={{ display: infoDrawerVisible ? 'block' : 'none', position: 'relative' }}
      >
        {/* Stereo level meter - replaces battery */}
        <StereoLevelMeter
          left={transmitter.audio_level_l ?? 0}
          right={transmitter.audio_level_r ?? 0}
        />

        {/* Chart zone - shown when device is working */}
        {!isError && (
          <div className="chartzone">
            <p className="offset">{formatOffset(transmitter.tx_offset)}</p>

            {/* Audio chart for L/R levels */}
            {showChart && !shouldHideChart && (
              <AudioChart slot={transmitter.slot} type={transmitter.type} />
            )}

            <p
              className="frequency"
              style={{ display: isFrequencyOffline ? 'none' : 'block' }}
            >
              {transmitter.frequency} Hz
            </p>
          </div>
        )}

        {/* Error zone - shown when communication error */}
        {isError && (
          <div className="errorzone">
            <p className="errortype">TX COM Error</p>
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
      </div>
    </div>
  );
};
