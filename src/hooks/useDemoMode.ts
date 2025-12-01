/**
 * useDemoMode hook - Handles demo mode data generation
 * Generates realistic random data for all microphone slots
 */

import { useEffect, useRef } from 'react';
import { useMicboardStore } from '../store/micboard-store';
import { generateDemoData, updateDemoData } from '../services/demoData';
// Transmitter type imported by demoData service

export const useDemoMode = (isActive: boolean) => {
  const {
    displayList,
    updateTransmitter,
    setConnectionStatus,
    switchGroup,
  } = useMicboardStore();

  const intervalsRef = useRef<NodeJS.Timeout[]>([]);
  const chartDataRef = useRef<Map<number, { audio: number[]; rf: number[] }>>(new Map());

  useEffect(() => {
    if (!isActive) {
      // Clear all intervals when demo mode is disabled
      intervalsRef.current.forEach(clearInterval);
      intervalsRef.current = [];
      chartDataRef.current.clear();
      return;
    }

    // Set connection status to connected in demo mode
    setConnectionStatus('CONNECTED');

    // Always use 12 demo slots for demo mode
    const demoSlots = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    // Initialize demo display list if empty
    if (displayList.length === 0) {
      switchGroup(0); // This will set displayList to demoSlots
      // Exit early - effect will re-run when displayList updates
      return;
    }

    // Seed initial data for all slots
    const seedSlots = () => {
      demoSlots.forEach((slot) => {
        const demoData = generateDemoData(slot);
        updateTransmitter(slot, demoData);

        // Initialize chart data
        chartDataRef.current.set(slot, {
          audio: Array(100).fill(0),
          rf: Array(100).fill(0),
        });
      });
    };

    seedSlots();

    // Set up update intervals with realistic timing
    const slots = displayList.length > 0 ? displayList : demoSlots;

    // Name updates (750ms scaled by display list length)
    const nameInterval = setInterval(() => {
      const randomSlot = slots[Math.floor(Math.random() * slots.length)];
      const updates = updateDemoData('name');
      updateTransmitter(randomSlot, updates);
    }, 750 * (12 / Math.max(slots.length, 1)));
    intervalsRef.current.push(nameInterval);

    // Battery and status updates (890ms)
    const batteryInterval = setInterval(() => {
      slots.forEach((slot) => {
        if (Math.random() < 0.1) { // 10% chance of update per slot
          const updates = updateDemoData('battery');
          updateTransmitter(slot, updates);
        }
      });
    }, 890);
    intervalsRef.current.push(batteryInterval);

    // Antenna diversity updates (90ms - very fast)
    const diversityInterval = setInterval(() => {
      slots.forEach((slot) => {
        if (Math.random() < 0.3) { // 30% chance of update
          const updates = updateDemoData('diversity');
          updateTransmitter(slot, updates);
        }
      });
    }, 90);
    intervalsRef.current.push(diversityInterval);

    // TX offset updates (1000ms)
    const txOffsetInterval = setInterval(() => {
      const randomSlot = slots[Math.floor(Math.random() * slots.length)];
      const updates = updateDemoData('tx_offset');
      updateTransmitter(randomSlot, updates);
    }, 1000);
    intervalsRef.current.push(txOffsetInterval);

    // Quality updates (500ms)
    const qualityInterval = setInterval(() => {
      slots.forEach((slot) => {
        if (Math.random() < 0.2) { // 20% chance
          const updates = updateDemoData('quality');
          updateTransmitter(slot, updates);
        }
      });
    }, 500);
    intervalsRef.current.push(qualityInterval);

    // Frequency updates (750ms)
    const frequencyInterval = setInterval(() => {
      const randomSlot = slots[Math.floor(Math.random() * slots.length)];
      const updates = updateDemoData('frequency');
      updateTransmitter(randomSlot, updates);
    }, 750);
    intervalsRef.current.push(frequencyInterval);

    // Chart data updates (300ms)
    const chartInterval = setInterval(() => {
      slots.forEach((slot) => {
        const chartData = chartDataRef.current.get(slot);
        if (chartData) {
          // Generate new audio and RF values
          const newAudio = Math.random() * 30;
          const newRF = Math.random() * 50;

          // Update arrays (sliding window)
          chartData.audio.shift();
          chartData.audio.push(newAudio);
          chartData.rf.shift();
          chartData.rf.push(newRF);

          // Update transmitter with latest values
          updateTransmitter(slot, {
            audio_level: newAudio,
            rf_level: newRF,
          });
        }
      });
    }, 300);
    intervalsRef.current.push(chartInterval);

    // Cleanup function
    return () => {
      intervalsRef.current.forEach(clearInterval);
      intervalsRef.current = [];
      chartDataRef.current.clear();
    };
  }, [isActive, displayList, updateTransmitter, setConnectionStatus, switchGroup]);
};