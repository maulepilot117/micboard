/**
 * TypeScript type definitions for the micboard application
 * Based on the vanilla JavaScript implementation
 */

export type DeviceType = 'uhfr' | 'qlxd' | 'ulxd' | 'axtd' | 'p10t';

export type DeviceStatus =
  | 'GOOD'
  | 'PREV_GOOD'
  | 'REPLACE'
  | 'PREV_REPLACE'
  | 'CRITICAL'
  | 'PREV_CRITICAL'
  | 'UNASSIGNED'
  | 'RX_COM_ERROR'
  | 'AUDIO_PEAK';

export interface Transmitter {
  slot: number;
  id: string;
  name: string;
  name_raw: string;
  status: DeviceStatus;
  battery: number; // 0-5, 255
  runtime: string;
  antenna: string;
  tx_offset: number; // 0-27, 255
  quality: number; // 0-5, 255
  frequency: string;
  ip: string;
  type: DeviceType;
  channel: number;
  audio_level?: number;
  rf_level?: number;
  audio_level_l?: number;
  audio_level_r?: number;
  extended_id?: string;
  extended_name?: string;
}

export interface SlotConfig {
  slot: number;
  ip?: string;
  type: DeviceType;
  channel?: number;
  extended_id?: string;
  extended_name?: string;
}

export interface Group {
  title: string;
  hide_charts: boolean;
  slots: number[];
}

export interface MicboardConfig {
  slots: SlotConfig[];
}

export interface DiscoveredDevice {
  ip: string;
  type: DeviceType;
  channels: number;
  name: string;
}

export type DisplayMode = 'deskmode' | 'tvmode';
export type InfoDrawerMode = 'elinfo00' | 'elinfo01' | 'elinfo10' | 'elinfo11';
export type BackgroundMode = 'NONE' | 'IMG' | 'MP4';
export type SettingsMode = 'NONE' | 'CONFIG' | 'EXTENDED';
export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';

export interface URLParams {
  demo?: string;
  group?: number;
  settings?: string;
  tvmode?: InfoDrawerMode;
  bgmode?: BackgroundMode;
}
