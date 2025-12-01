/**
 * Demo data generation service
 * Generates realistic random data for demo mode
 */

import type { Transmitter, DeviceStatus, DeviceType } from '../types/micboard';

// Sample names for random selection
const SAMPLE_NAMES = [
  'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince', 'Edward Norton',
  'Fiona Apple', 'George Lucas', 'Hannah Montana', 'Ian McKellen', 'Julia Roberts',
  'Kevin Hart', 'Laura Croft', 'Michael Jordan', 'Nancy Drew', 'Oscar Wilde',
  'Patricia Highsmith', 'Quincy Jones', 'Rachel Green', 'Steve Jobs', 'Tina Turner',
  'Uma Thurman', 'Victor Hugo', 'Wendy Williams', 'Xavier Woods', 'Yoko Ono',
  'Zoe Saldana', 'Amy Winehouse', 'Brad Pitt', 'Cate Blanchett', 'David Bowie',
  'Ellen DeGeneres', 'Frank Sinatra', 'Grace Kelly', 'Hugh Jackman', 'Iris Murdoch',
  'Jack Nicholson', 'Kate Winslet', 'Leonardo DiCaprio'
];

// Device types for random selection
const DEVICE_TYPES: DeviceType[] = ['uhfr', 'qlxd', 'ulxd', 'axtd', 'p10t'];

// Battery level to status mapping
const getBatteryStatus = (battery: number): DeviceStatus => {
  const isOn = Math.random() > 0.5;

  if (battery === 255) {
    const statuses: DeviceStatus[] = ['UNASSIGNED', 'RX_COM_ERROR', 'CRITICAL'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  switch (battery) {
    case 0:
    case 1:
    case 2:
      return isOn ? 'CRITICAL' : 'PREV_CRITICAL';
    case 3:
      return isOn ? 'REPLACE' : 'PREV_REPLACE';
    case 4:
    case 5:
      return isOn ? 'GOOD' : 'PREV_GOOD';
    default:
      return 'UNASSIGNED';
  }
};

// Generate random battery level
const randomBattery = (): number => {
  const weights = [0.05, 0.05, 0.1, 0.2, 0.3, 0.25, 0.05]; // 0, 1, 2, 3, 4, 5, 255
  const values = [0, 1, 2, 3, 4, 5, 255];
  const random = Math.random();
  let accumulator = 0;

  for (let i = 0; i < weights.length; i++) {
    accumulator += weights[i];
    if (random <= accumulator) {
      return values[i];
    }
  }
  return 5;
};

// Generate runtime based on battery level
const getRuntime = (battery: number): string => {
  if (battery === 255) return '';

  const hours = Math.max(0, battery * 2 - Math.floor(Math.random() * 2));
  const minutes = Math.floor(Math.random() * 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

// Generate random antenna diversity pattern
const randomDiversity = (): string => {
  const patterns = ['XX', 'AX', 'XB', 'AB', 'RX', 'XR', 'RB', 'AR'];
  return patterns[Math.floor(Math.random() * patterns.length)];
};

// Generate random TX offset
const randomTxOffset = (): number => {
  if (Math.random() < 0.2) return 255; // 20% chance of disabled
  return Math.floor(Math.random() * 28);
};

// Generate random quality
const randomQuality = (): number => {
  if (Math.random() < 0.1) return 255; // 10% chance of disabled
  return Math.floor(Math.random() * 6);
};

// Generate random frequency (474-597 MHz in 25kHz steps)
const randomFrequency = (): string => {
  const min = 474000;
  const max = 597000;
  const step = 25;
  const freq = min + Math.floor(Math.random() * ((max - min) / step)) * step;
  const mhz = Math.floor(freq / 1000);
  const khz = freq % 1000;
  return `${mhz}.${khz.toString().padStart(3, '0')}`;
};

/**
 * Generate complete demo data for a slot
 */
export const generateDemoData = (slot: number): Transmitter => {
  const battery = randomBattery();
  const status = getBatteryStatus(battery);
  const type = DEVICE_TYPES[Math.floor(Math.random() * DEVICE_TYPES.length)];
  const name = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];

  return {
    slot,
    name,
    name_raw: name,
    id: `CH${slot.toString().padStart(2, '0')}`,
    status,
    battery,
    runtime: getRuntime(battery),
    antenna: randomDiversity(),
    tx_offset: randomTxOffset(),
    quality: randomQuality(),
    frequency: randomFrequency(),
    ip: `192.168.1.${100 + slot}`,
    type,
    channel: ((slot - 1) % 4) + 1,
    audio_level: Math.random() * 30,
    rf_level: Math.random() * 50,
    audio_level_l: type === 'p10t' ? Math.random() * 30 : 0,
    audio_level_r: type === 'p10t' ? Math.random() * 30 : 0,
  };
};

/**
 * Update specific fields with random data
 */
export const updateDemoData = (
  field: 'name' | 'battery' | 'diversity' | 'tx_offset' | 'quality' | 'frequency'
): Partial<Transmitter> => {
  switch (field) {
    case 'name':
      const name = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
      return { name, name_raw: name };

    case 'battery':
      const battery = randomBattery();
      return {
        battery,
        status: getBatteryStatus(battery),
        runtime: getRuntime(battery),
      };

    case 'diversity':
      return { antenna: randomDiversity() };

    case 'tx_offset':
      return { tx_offset: randomTxOffset() };

    case 'quality':
      return { quality: randomQuality() };

    case 'frequency':
      return { frequency: randomFrequency() };

    default:
      return {};
  }
};