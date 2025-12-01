/**
 * BatteryIndicator Component
 * Displays 5-bar battery level indicator for wireless devices
 * Matches the vanilla JS BatteryTable logic
 */

import React from 'react';

type BatteryBarState = 'batt_led_off' | 'batt_led_danger' | 'batt_led_warning' | 'batt_led_good';

interface BatteryIndicatorProps {
  level: number; // 0-5, or 255 for unassigned
  className?: string;
}

/**
 * Battery level mapping (from vanilla JS BatteryTable)
 * 0 = Unknown, 1-2 = Danger (red), 3 = Warning (yellow), 4-5 = Good (green), 255 = Mains power
 */
const BATTERY_TABLE: Record<number, BatteryBarState[]> = {
  0: ['batt_led_off', 'batt_led_off', 'batt_led_off', 'batt_led_off', 'batt_led_off'],
  1: ['batt_led_danger', 'batt_led_off', 'batt_led_off', 'batt_led_off', 'batt_led_off'],
  2: ['batt_led_danger', 'batt_led_danger', 'batt_led_off', 'batt_led_off', 'batt_led_off'],
  3: ['batt_led_warning', 'batt_led_warning', 'batt_led_warning', 'batt_led_off', 'batt_led_off'],
  4: ['batt_led_good', 'batt_led_good', 'batt_led_good', 'batt_led_good', 'batt_led_off'],
  5: ['batt_led_good', 'batt_led_good', 'batt_led_good', 'batt_led_good', 'batt_led_good'],
  255: ['batt_led_off', 'batt_led_off', 'batt_led_off', 'batt_led_off', 'batt_led_off'],
};

export const BatteryIndicator: React.FC<BatteryIndicatorProps> = ({ level, className = '' }) => {
  // Fallback to all off for unknown battery levels
  const bars = BATTERY_TABLE[level] ?? BATTERY_TABLE[255];

  return (
    <div className={`battery-bars ${className}`}>
      {bars.map((barState, index) => (
        <div
          key={index}
          className={`battery-bar battery-bar-${index + 1} ${barState}`}
        />
      ))}
    </div>
  );
};
