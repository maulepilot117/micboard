# Phase 3: React Migration - Implementation Plan

**Start Date:** November 16, 2025
**Target Completion:** 8-10 weeks
**Branch:** phase3/react-migration
**Goal:** Migrate micboard from vanilla JavaScript to React with modern state management

---

## Executive Summary

Phase 3 will transform micboard into a modern React application while preserving all existing functionality. This migration will improve code maintainability, enable future features, and provide a better developer experience.

**Key Changes:**
- Vanilla JavaScript → React 18+ with TypeScript
- Global state object → Zustand store
- Direct DOM manipulation → Declarative components
- Webpack → Vite build system
- Bootstrap classes → Tailwind CSS (optional)
- Manual event listeners → React hooks

---

## Current State Analysis

### Codebase Stats
- **JavaScript:** 2,031 lines across 14 files
- **Components identified:** 8 major UI components
- **State management:** Global `micboard` object (150+ references)
- **External dependencies:** Bootstrap 5, @shopify/draggable, smoothie, qrcode

### Key Findings from Analysis
1. **Component boundaries already exist** via HTML templates
2. **State is centralized** but not reactive
3. **Circular dependencies** between app.js ↔ channelview.js ↔ dnd.js
4. **Real-time performance** critical (80 data points/sec for charts)
5. **Two build modes:** Production app + Demo mode

---

## Architecture Decision

### Technology Stack

| Category | Choice | Rationale |
|----------|--------|-----------|
| **Framework** | React 18.2+ | Hooks, concurrent features, large ecosystem |
| **Language** | TypeScript 5+ | Type safety, better IDE support, fewer bugs |
| **Build Tool** | Vite 5+ | 10x faster dev builds, modern ESM |
| **State** | Zustand 4+ | Simpler than Redux, TypeScript native, 1KB |
| **Data Fetching** | TanStack Query | Caching, refetching, optimistic updates |
| **Routing** | React Router 6+ | Standard routing solution |
| **Drag & Drop** | dnd-kit | React-first, accessibility, touch support |
| **Charts** | Recharts | React-native, good performance |
| **QR Codes** | qrcode.react | React wrapper for qrcode |
| **Styling** | CSS Modules + Tailwind | Scoped styles + utilities |
| **Keyboard** | react-hotkeys-hook | Declarative hotkey management |

### Why NOT These Alternatives

**Redux** → Too much boilerplate for this app size
**MobX** → Less TypeScript friendly than Zustand
**Remix/Next.js** → Not needed for SPA
**Styled Components** → Runtime cost, already have SCSS
**Radix UI** → Overkill, Bootstrap 5 works fine

---

## Migration Strategy

### Approach: **Incremental Hybrid Migration**

We'll run React and vanilla JS side-by-side during migration:

```
Phase 3A: Setup (Week 1-2)
├─ Install React + dependencies
├─ Configure Vite build
├─ Create React root mounting point
├─ Set up Zustand store mirroring micboard state
└─ Implement state synchronization layer

Phase 3B: Core Components (Week 3-4)
├─ MicrophoneSlot component (CRITICAL PATH)
├─ BatteryIndicator, DiversityIndicator
├─ RTChart component (replace smoothie)
└─ MicboardGrid layout

Phase 3C: Editors (Week 5-6)
├─ SettingsPanel + ConfigSlot
├─ GroupEditor with dnd-kit
├─ ExtendedNameEditor
└─ Navigation component

Phase 3D: Features (Week 7-8)
├─ Keyboard shortcuts (useHotkeys)
├─ Display modes (desk/TV)
├─ Background images/video
├─ QR code modal
└─ Demo mode integration

Phase 3E: Finalization (Week 9-10)
├─ Remove all vanilla JS code
├─ Performance optimization
├─ Accessibility audit
├─ Testing
└─ Documentation
```

---

## Phase 3A: Setup (Week 1-2)

### Task 1.1: Install React Dependencies

```bash
npm install --save react react-dom
npm install --save-dev @types/react @types/react-dom
npm install --save-dev @vitejs/plugin-react vite
npm install --save zustand
npm install --save @tanstack/react-query
npm install --save react-router-dom
npm install --save-dev typescript
```

**Files to create:**
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build configuration
- `src/` directory for React components

### Task 1.2: Configure Vite

Create `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'static',
    rollupOptions: {
      input: {
        app: 'demo.html',
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8058',
      '/data.json': 'http://localhost:8058',
    },
  },
});
```

### Task 1.3: Create TypeScript Types

Create `src/types/micboard.ts`:
```typescript
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

export type DisplayMode = 'deskmode' | 'tvmode';
export type InfoDrawerMode = 'elinfo00' | 'elinfo01' | 'elinfo10' | 'elinfo11';
export type BackgroundMode = 'NONE' | 'IMG' | 'MP4';
export type SettingsMode = 'NONE' | 'CONFIG' | 'EXTENDED';
export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
```

### Task 1.4: Create Zustand Store

Create `src/store/micboard-store.ts`:
```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Transmitter,
  Group,
  MicboardConfig,
  DisplayMode,
  InfoDrawerMode,
  BackgroundMode,
  SettingsMode,
  ConnectionStatus,
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
  discovered: any[];

  // Connection
  connectionStatus: ConnectionStatus;

  // Computed
  isDemo: boolean;

  // Actions
  setDisplayMode: (mode: DisplayMode) => void;
  setInfoDrawerMode: (mode: InfoDrawerMode) => void;
  setBackgroundMode: (mode: BackgroundMode) => void;
  setSettingsMode: (mode: SettingsMode) => void;
  switchGroup: (groupNum: number) => void;
  updateTransmitter: (slot: number, data: Partial<Transmitter>) => void;
  setTransmitters: (transmitters: Record<number, Transmitter>) => void;
  setDisplayList: (slots: number[]) => void;
  setConfig: (config: MicboardConfig) => void;
  setGroups: (groups: Record<number, Group>) => void;
  setDiscovered: (devices: any[]) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export const useMicboardStore = create<MicboardStore>()(
  devtools(
    persist(
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
        connectionStatus: 'CONNECTING',
        isDemo: false,

        // Actions
        setDisplayMode: (mode) => set({ displayMode: mode }),
        setInfoDrawerMode: (mode) => set({ infoDrawerMode: mode }),
        setBackgroundMode: (mode) => set({ backgroundMode: mode }),
        setSettingsMode: (mode) => set({ settingsMode: mode }),

        switchGroup: (groupNum) => {
          const { groups, transmitters, isDemo } = get();
          let newDisplayList: number[] = [];

          if (groupNum === 0) {
            // All devices
            if (isDemo) {
              newDisplayList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            } else {
              newDisplayList = Object.keys(transmitters).map(Number);
            }
          } else if (groups[groupNum]) {
            newDisplayList = groups[groupNum].slots;
          }

          set({
            currentGroup: groupNum,
            displayList: newDisplayList,
          });
        },

        updateTransmitter: (slot, data) => set((state) => ({
          transmitters: {
            ...state.transmitters,
            [slot]: {
              ...state.transmitters[slot],
              ...data,
            },
          },
        })),

        setTransmitters: (transmitters) => set({ transmitters }),
        setDisplayList: (slots) => set({ displayList: slots }),
        setConfig: (config) => set({ config }),
        setGroups: (groups) => set({ groups }),
        setDiscovered: (devices) => set({ discovered: devices }),
        setConnectionStatus: (status) => set({ connectionStatus: status }),
      }),
      {
        name: 'micboard-storage',
        partialize: (state) => ({
          displayMode: state.displayMode,
          currentGroup: state.currentGroup,
        }),
      }
    )
  )
);
```

### Task 1.5: Create React Root

Modify `demo.html` to include React root:
```html
<body>
  <div id="react-root"></div>
  <!-- Keep existing HTML for hybrid mode -->
  <div id="micboard"></div>

  <!-- Existing scripts -->
  <script src="static/app.js"></script>

  <!-- New React entry point -->
  <script type="module" src="/src/main.tsx"></script>
</body>
```

Create `src/main.tsx`:
```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const rootElement = document.getElementById('react-root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
}
```

Create `src/App.tsx`:
```typescript
import React from 'react';
import { useMicboardStore } from './store/micboard-store';

export const App: React.FC = () => {
  const displayMode = useMicboardStore((state) => state.displayMode);

  return (
    <div className={`micboard-app ${displayMode}`}>
      <h1>React Migration - Phase 3A</h1>
      <p>Display Mode: {displayMode}</p>
      {/* Components will go here */}
    </div>
  );
};
```

### Task 1.6: State Synchronization Layer

Create `src/hooks/useLegacyStateSync.ts`:
```typescript
import { useEffect } from 'react';
import { useMicboardStore } from '../store/micboard-store';

/**
 * Synchronizes React Zustand store with legacy global micboard object
 * This allows gradual migration - both systems stay in sync
 */
export const useLegacyStateSync = () => {
  const store = useMicboardStore();

  useEffect(() => {
    // Sync FROM legacy TO React store
    const syncInterval = setInterval(() => {
      if (window.micboard) {
        const mb = window.micboard;

        // Sync transmitters
        if (mb.transmitters) {
          const transmittersMap: Record<number, any> = {};
          mb.transmitters.forEach((tx: any, slot: number) => {
            if (tx) transmittersMap[slot] = tx;
          });
          store.setTransmitters(transmittersMap);
        }

        // Sync modes
        if (mb.displayMode !== store.displayMode) {
          store.setDisplayMode(mb.displayMode);
        }

        if (mb.group !== store.currentGroup) {
          store.switchGroup(mb.group);
        }

        // Sync config
        if (mb.config) store.setConfig(mb.config);
        if (mb.groups) store.setGroups(mb.groups);
      }
    }, 100); // Poll every 100ms

    // Sync FROM React store TO legacy
    const unsubscribe = store.subscribe((state, prevState) => {
      if (!window.micboard) return;

      if (state.displayMode !== prevState.displayMode) {
        window.micboard.displayMode = state.displayMode;
      }

      if (state.currentGroup !== prevState.currentGroup) {
        window.micboard.group = state.currentGroup;
      }
    });

    return () => {
      clearInterval(syncInterval);
      unsubscribe();
    };
  }, [store]);
};

// Type augmentation for window.micboard
declare global {
  interface Window {
    micboard: any;
  }
}
```

### Task 1.7: Update package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build:legacy": "webpack --progress --config=webpack.config.js",
    "build:react": "tsc && vite build",
    "build": "npm run build:legacy && npm run build:react",
    "preview": "vite preview"
  }
}
```

### Deliverables for Phase 3A

- ✅ React installed and configured
- ✅ Vite build system working
- ✅ TypeScript types defined
- ✅ Zustand store created
- ✅ Bidirectional state sync working
- ✅ Both vanilla JS and React can coexist

---

## Phase 3B: Core Components (Week 3-4)

### Task 2.1: MicrophoneSlot Component (CRITICAL)

This is the most important component - it represents a single wireless mic/IEM.

Create `src/components/MicrophoneSlot/MicrophoneSlot.tsx`:
```typescript
import React from 'react';
import type { Transmitter } from '../../types/micboard';
import { BatteryIndicator } from './BatteryIndicator';
import { DiversityIndicator } from './DiversityIndicator';
import { RTChart } from './RTChart';
import { StatusElectrode } from './StatusElectrode';
import styles from './MicrophoneSlot.module.css';

interface MicrophoneSlotProps {
  transmitter: Transmitter;
  hideChart?: boolean;
  isEditMode?: boolean;
}

export const MicrophoneSlot: React.FC<MicrophoneSlotProps> = ({
  transmitter,
  hideChart = false,
  isEditMode = false,
}) => {
  const {
    slot,
    id,
    name,
    status,
    battery,
    runtime,
    antenna,
    tx_offset,
    quality,
    frequency,
    ip,
    type,
    channel,
  } = transmitter;

  const isError = status === 'RX_COM_ERROR';

  return (
    <div className={`${styles.slot} col-sm`} id={`slot-${slot}`}>
      {/* Header with ID and Name */}
      <div className={`${styles.header} mic_name ${status}`}>
        <p className={styles.micId}>{id}</p>
        <p className={styles.name}>{name}</p>
      </div>

      {/* Status Electrode */}
      <StatusElectrode status={status} />

      {/* Info Drawer */}
      <div className={styles.infoDrawer}>
        {/* Battery Indicator */}
        <BatteryIndicator level={battery} />

        {/* Chart or Error Display */}
        {isError ? (
          <div className={styles.errorZone}>
            <p className={styles.errorType}>Communication Error</p>
            <p className={styles.ip}>{ip}</p>
            <p className={styles.rxInfo}>{type} CH {channel}</p>
          </div>
        ) : (
          <>
            {!hideChart && (
              <div className={styles.chartZone}>
                <RTChart slot={slot} />
              </div>
            )}

            {/* Runtime and Quality */}
            <div className={styles.stats}>
              <p className={styles.runtime}>{runtime}</p>
              <p className={styles.quality}>
                {quality !== 255 && renderQuality(quality)}
              </p>
              <p className={styles.offset}>
                {tx_offset !== 255 && `${tx_offset} dB`}
              </p>
              <p className={styles.frequency}>{frequency} Hz</p>
            </div>

            {/* Diversity Indicator */}
            <DiversityIndicator antenna={antenna} />
          </>
        )}

        {/* Edit Mode (Extended Names) */}
        {isEditMode && (
          <div className={styles.editZone}>
            <input
              className={styles.extId}
              placeholder="Extended ID"
              defaultValue={transmitter.extended_id}
            />
            <input
              className={styles.extName}
              placeholder="Extended Name"
              defaultValue={transmitter.extended_name}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Helper to render quality dots
const renderQuality = (quality: number) => {
  const dots = ['○', '○', '○', '○', '○'];
  for (let i = 0; i < quality && i < 5; i++) {
    dots[i] = '●';
  }
  return dots.join('');
};
```

### Task 2.2: BatteryIndicator Component

Create `src/components/MicrophoneSlot/BatteryIndicator.tsx`:
```typescript
import React from 'react';
import styles from './BatteryIndicator.module.css';

interface BatteryIndicatorProps {
  level: number; // 0-5, 255
}

const BATTERY_STATES = {
  0: ['off', 'off', 'off', 'off', 'off'],
  1: ['danger', 'off', 'off', 'off', 'off'],
  2: ['danger', 'danger', 'off', 'off', 'off'],
  3: ['warning', 'warning', 'warning', 'off', 'off'],
  4: ['good', 'good', 'good', 'good', 'off'],
  5: ['good', 'good', 'good', 'good', 'good'],
  255: ['off', 'off', 'off', 'off', 'off'],
} as const;

export const BatteryIndicator: React.FC<BatteryIndicatorProps> = ({ level }) => {
  const states = BATTERY_STATES[level as keyof typeof BATTERY_STATES] || BATTERY_STATES[255];

  return (
    <div className={styles.batteryBars}>
      {states.map((state, index) => (
        <div
          key={index}
          className={`${styles.batteryBar} batt_led_${state}`}
          aria-label={`Battery bar ${index + 1}: ${state}`}
        />
      ))}
    </div>
  );
};
```

### Task 2.3: DiversityIndicator Component

Create `src/components/MicrophoneSlot/DiversityIndicator.tsx`:
```typescript
import React from 'react';
import styles from './DiversityIndicator.module.css';

interface DiversityIndicatorProps {
  antenna: string; // e.g., "ABAX", "RRRR"
}

export const DiversityIndicator: React.FC<DiversityIndicatorProps> = ({ antenna }) => {
  const bars = antenna.split('').map((char, index) => {
    let className = styles.bar;

    switch (char) {
      case 'A':
      case 'B':
        className += ` ${styles.blue}`;
        break;
      case 'R':
        className += ` ${styles.red}`;
        break;
      case 'X':
        className += ` ${styles.off}`;
        break;
    }

    return (
      <div key={index} className={className} aria-label={`Antenna ${char}`} />
    );
  });

  return <div className={styles.diversity}>{bars}</div>;
};
```

### Task 2.4: RTChart Component

Create `src/components/MicrophoneSlot/RTChart.tsx`:
```typescript
import React, { useRef, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer
} from 'recharts';
import { useMicboardStore } from '../../store/micboard-store';

interface RTChartProps {
  slot: number;
}

export const RTChart: React.FC<RTChartProps> = ({ slot }) => {
  const transmitter = useMicboardStore((state) => state.transmitters[slot]);
  const [chartData, setChartData] = React.useState<any[]>([]);

  useEffect(() => {
    // Add new data point when transmitter updates
    if (transmitter?.audio_level !== undefined && transmitter?.rf_level !== undefined) {
      setChartData((prev) => {
        const newData = [
          ...prev,
          {
            time: Date.now(),
            audio: transmitter.audio_level,
            rf: transmitter.rf_level,
          },
        ];

        // Keep only last 100 points (30 seconds at 300ms interval)
        return newData.slice(-100);
      });
    }
  }, [transmitter?.audio_level, transmitter?.rf_level]);

  return (
    <ResponsiveContainer width="100%" height={60}>
      <LineChart data={chartData}>
        <XAxis dataKey="time" hide />
        <YAxis domain={[0, 100]} hide />
        <Line
          type="monotone"
          dataKey="audio"
          stroke="#00ff00"
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="rf"
          stroke="#ffff00"
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

### Task 2.5: MicboardGrid Component

Create `src/components/MicboardGrid/MicboardGrid.tsx`:
```typescript
import React from 'react';
import { useMicboardStore } from '../../store/micboard-store';
import { MicrophoneSlot } from '../MicrophoneSlot/MicrophoneSlot';
import styles from './MicboardGrid.module.css';

export const MicboardGrid: React.FC = () => {
  const displayList = useMicboardStore((state) => state.displayList);
  const transmitters = useMicboardStore((state) => state.transmitters);
  const currentGroup = useMicboardStore((state) => state.currentGroup);
  const groups = useMicboardStore((state) => state.groups);

  const hideCharts = currentGroup !== 0 && groups[currentGroup]?.hide_charts;

  return (
    <div className={styles.grid} id="micboard">
      {displayList.map((slotNum) => {
        const transmitter = transmitters[slotNum];

        if (!transmitter) {
          // Blank slot
          return (
            <div key={slotNum} className={`${styles.slot} col-sm blank`}>
              <p className={styles.name}>BLANK</p>
            </div>
          );
        }

        return (
          <MicrophoneSlot
            key={slotNum}
            transmitter={transmitter}
            hideChart={hideCharts}
          />
        );
      })}
    </div>
  );
};
```

### Deliverables for Phase 3B

- ✅ MicrophoneSlot component fully functional
- ✅ BatteryIndicator with 5-bar display
- ✅ DiversityIndicator with color-coded bars
- ✅ RTChart with real-time updates (using Recharts)
- ✅ MicboardGrid displaying all slots
- ✅ CSS Modules for scoped styling
- ✅ React components rendering alongside vanilla JS

---

## Phase 3C: Editors (Week 5-6)

### Task 3.1: SettingsPanel Component
### Task 3.2: ConfigSlot Component
### Task 3.3: GroupEditor Component
### Task 3.4: ExtendedNameEditor Component
### Task 3.5: Navigation Component

*(Details in separate sections to follow)*

---

## Phase 3D: Features (Week 7-8)

### Task 4.1: Keyboard Shortcuts with react-hotkeys-hook
### Task 4.2: Display Modes (Desk/TV)
### Task 4.3: Background Images/Video
### Task 4.4: QR Code Modal
### Task 4.5: Demo Mode Integration

---

## Phase 3E: Finalization (Week 9-10)

### Task 5.1: Remove Vanilla JavaScript
### Task 5.2: Performance Optimization
### Task 5.3: Accessibility Audit
### Task 5.4: Testing Strategy
### Task 5.5: Documentation

---

## Migration Checklist

### Prerequisites
- [ ] Phase 1 complete (Node 20, Webpack 5)
- [ ] Phase 2 complete (Bootstrap 5, no jQuery)
- [ ] Team trained on React/TypeScript
- [ ] Development environment set up

### Phase 3A: Setup
- [ ] Install React dependencies
- [ ] Configure Vite build system
- [ ] Create TypeScript types
- [ ] Set up Zustand store
- [ ] Implement state synchronization
- [ ] Verify hybrid mode works

### Phase 3B: Core Components
- [ ] Build MicrophoneSlot component
- [ ] Implement BatteryIndicator
- [ ] Implement DiversityIndicator
- [ ] Port charts to Recharts
- [ ] Create MicboardGrid layout
- [ ] Test real-time updates

### Phase 3C: Editors
- [ ] Build SettingsPanel
- [ ] Implement ConfigSlot
- [ ] Port GroupEditor
- [ ] Port ExtendedNameEditor
- [ ] Build Navigation component

### Phase 3D: Features
- [ ] Implement keyboard shortcuts
- [ ] Add display mode switching
- [ ] Add background images/video
- [ ] Create QR code modal
- [ ] Integrate demo mode

### Phase 3E: Finalization
- [ ] Remove all vanilla JS files
- [ ] Optimize performance
- [ ] Run accessibility audit
- [ ] Write tests
- [ ] Update documentation
- [ ] Merge to master
- [ ] Tag v1.0.0

---

## Success Criteria

**Phase 3A:**
- ✅ React renders alongside vanilla JS
- ✅ State syncs bidirectionally
- ✅ Build completes without errors
- ✅ TypeScript types cover all data structures

**Phase 3B:**
- ✅ MicrophoneSlot displays correctly
- ✅ Real-time updates work (< 500ms latency)
- ✅ Charts render smoothly (60fps)
- ✅ All status colors display correctly

**Phase 3C:**
- ✅ All editors functional
- ✅ Drag & drop works
- ✅ Forms save correctly
- ✅ Navigation matches current design

**Phase 3D:**
- ✅ All keyboard shortcuts work
- ✅ Display modes switch correctly
- ✅ Backgrounds load/display
- ✅ Demo mode fully functional

**Phase 3E:**
- ✅ No vanilla JS code remains
- ✅ Performance metrics met (see below)
- ✅ WCAG 2.1 AA compliance
- ✅ 80%+ test coverage
- ✅ Zero TypeScript errors

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Initial Load | < 2s | TBD |
| Time to Interactive | < 3s | TBD |
| Chart Update Latency | < 100ms | ~300ms |
| Memory Usage (12 slots) | < 50MB | TBD |
| Bundle Size (gzipped) | < 500KB | ~2.6MB |
| FPS (60 slots) | 60fps | TBD |

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Chart performance degradation | High | Medium | Use canvas, optimize re-renders |
| State sync bugs | High | Medium | Comprehensive testing, gradual migration |
| Bundle size increase | Medium | Low | Code splitting, tree shaking |
| Learning curve | Low | High | Training, documentation, pair programming |
| Breaking changes | High | Low | Feature flags, incremental rollout |

---

## Next Steps

1. **Review this plan** - Discuss with team
2. **Create Phase 3 branch** - `git checkout -b phase3/react-migration`
3. **Start Phase 3A** - Install dependencies, set up Vite
4. **Weekly check-ins** - Review progress, adjust timeline

---

## Questions to Answer

1. **Styling:** Keep Bootstrap 5 or migrate to Tailwind?
2. **Charts:** Use Recharts or keep Smoothie.js initially?
3. **Testing:** Jest + React Testing Library or Vitest?
4. **Build:** Maintain Webpack for Electron or migrate fully to Vite?
5. **Timeline:** Aggressive (6 weeks) or conservative (10 weeks)?

---

*Plan created: November 16, 2025*
*Last updated: November 16, 2025*
