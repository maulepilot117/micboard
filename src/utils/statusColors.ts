/**
 * Status color utilities
 * Maps device status to CSS classes for color coding
 */

import type { DeviceStatus } from '../types/micboard';

/**
 * Get the CSS class for a given device status
 */
export const getStatusClass = (status?: DeviceStatus): string => {
  if (!status) return 'UNASSIGNED';
  return status;
};

/**
 * Determine if a status indicates the microphone is active/on
 */
export const isStatusActive = (status: DeviceStatus): boolean => {
  return ['GOOD', 'REPLACE', 'CRITICAL'].includes(status);
};

/**
 * Get battery bar LED classes based on battery level
 */
export const getBatteryLEDClasses = (battery: number): string[] => {
  const leds: string[] = [];

  if (battery === 255 || battery === 0) {
    // All off
    return ['off', 'off', 'off', 'off', 'off'];
  }

  switch (battery) {
    case 1:
      leds.push('danger', 'off', 'off', 'off', 'off');
      break;
    case 2:
      leds.push('danger', 'danger', 'off', 'off', 'off');
      break;
    case 3:
      leds.push('warning', 'warning', 'warning', 'off', 'off');
      break;
    case 4:
      leds.push('good', 'good', 'good', 'good', 'off');
      break;
    case 5:
      leds.push('good', 'good', 'good', 'good', 'good');
      break;
    default:
      leds.push('off', 'off', 'off', 'off', 'off');
  }

  return leds;
};