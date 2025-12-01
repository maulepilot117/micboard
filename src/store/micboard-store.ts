/**
 * Zustand store for micboard application state
 * This replaces the global micboard object with a reactive store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  Transmitter,
  Group,
  MicboardConfig,
  DisplayMode,
  InfoDrawerMode,
  BackgroundMode,
  SettingsMode,
  ConnectionStatus,
  DiscoveredDevice,
} from '../types/micboard';

interface MicboardStore {
  // Application state
  displayMode: DisplayMode;
  infoDrawerMode: InfoDrawerMode;
  backgroundMode: BackgroundMode;
  settingsMode: SettingsMode;
  currentGroup: number;

  // Device data
  transmitters: Record<number, Transmitter>;
  displayList: number[];

  // Configuration
  config: MicboardConfig;
  groups: Record<number, Group>;
  discovered: DiscoveredDevice[];

  // Media assets
  mp4List: string[];
  imgList: string[];

  // Connection
  connectionStatus: ConnectionStatus;
  localURL: string;

  // Flags
  isDemo: boolean;

  // Actions - Application state
  setDisplayMode: (mode: DisplayMode) => void;
  setInfoDrawerMode: (mode: InfoDrawerMode) => void;
  setBackgroundMode: (mode: BackgroundMode) => void;
  setSettingsMode: (mode: SettingsMode) => void;
  toggleDisplayMode: () => void;
  toggleInfoDrawer: () => void;

  // Actions - Navigation
  switchGroup: (groupNum: number) => void;

  // Actions - Device data
  updateTransmitter: (slot: number, data: Partial<Transmitter>) => void;
  setTransmitters: (transmitters: Record<number, Transmitter>) => void;
  setDisplayList: (slots: number[]) => void;

  // Actions - Configuration
  setConfig: (config: MicboardConfig) => void;
  setGroups: (groups: Record<number, Group>) => void;
  updateGroup: (groupNum: number, group: Partial<Group>) => void;
  setDiscovered: (devices: DiscoveredDevice[]) => void;

  // Actions - Media
  setMp4List: (list: string[]) => void;
  setImgList: (list: string[]) => void;

  // Actions - Connection
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLocalURL: (url: string) => void;

  // Actions - Demo mode
  setIsDemo: (isDemo: boolean) => void;

  // Helper - Get all slots for group 0
  getAllSlots: () => number[];
}

export const useMicboardStore = create<MicboardStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      displayMode: 'deskmode',
      infoDrawerMode: 'elinfo11',
      backgroundMode: 'NONE',
      settingsMode: 'NONE',
      currentGroup: 0,
      transmitters: {},
      displayList: [],
      config: { slots: [] },
      groups: {},
      discovered: [],
      mp4List: [],
      imgList: [],
      connectionStatus: 'CONNECTING',
      localURL: '',
      isDemo: false,

      // Application state actions
      setDisplayMode: (mode) => set({ displayMode: mode }),

      setInfoDrawerMode: (mode) => set({ infoDrawerMode: mode }),

      setBackgroundMode: (mode) => set({ backgroundMode: mode }),

      setSettingsMode: (mode) => set({ settingsMode: mode }),

      toggleDisplayMode: () => set((state) => {
        if (state.displayMode === 'deskmode') {
          return { displayMode: 'tvmode' };
        } else {
          return { displayMode: 'deskmode', backgroundMode: 'NONE' };
        }
      }),

      toggleInfoDrawer: () => set((state) => {
        const modes: InfoDrawerMode[] = ['elinfo00', 'elinfo01', 'elinfo10', 'elinfo11'];
        const currentIndex = modes.indexOf(state.infoDrawerMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        return { infoDrawerMode: modes[nextIndex] };
      }),

      // Navigation actions
      switchGroup: (groupNum) => {
        const { groups, isDemo, config } = get();
        let newDisplayList: number[] = [];

        if (groupNum === 0) {
          // All devices
          if (isDemo) {
            newDisplayList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
          } else {
            newDisplayList = config.slots.map(slot => slot.slot);
          }
        } else if (groups[groupNum]) {
          newDisplayList = groups[groupNum].slots;
        }

        set({
          currentGroup: groupNum,
          displayList: newDisplayList,
        });
      },

      // Device data actions
      updateTransmitter: (slot, data) => set((state) => ({
        transmitters: {
          ...state.transmitters,
          [slot]: {
            ...(state.transmitters[slot] || {} as Transmitter),
            ...data,
            slot, // Ensure slot is always set
          } as Transmitter,
        },
      })),

      setTransmitters: (transmitters) => set({ transmitters }),

      setDisplayList: (slots) => set({ displayList: slots }),

      // Configuration actions
      setConfig: (config) => set({ config }),

      setGroups: (groups) => set({ groups }),

      updateGroup: (groupNum, groupData) => set((state) => ({
        groups: {
          ...state.groups,
          [groupNum]: {
            ...state.groups[groupNum],
            ...groupData,
          },
        },
      })),

      setDiscovered: (devices) => set({ discovered: devices }),

      // Media actions
      setMp4List: (list) => set({ mp4List: list }),

      setImgList: (list) => set({ imgList: list }),

      // Connection actions
      setConnectionStatus: (status) => set({ connectionStatus: status }),

      setLocalURL: (url) => set({ localURL: url }),

      // Demo mode
      setIsDemo: (isDemo) => set({ isDemo }),

      // Helpers
      getAllSlots: () => {
        const { isDemo, config } = get();
        if (isDemo) {
          return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        }
        return config.slots.map(slot => slot.slot);
      },
    }),
    { name: 'micboard-store' }
  )
);
