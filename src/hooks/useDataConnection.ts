/**
 * useDataConnection hook - Handles WebSocket and data polling
 * Manages real-time data updates from the server
 */

import { useEffect, useRef } from 'react';
import { useMicboardStore } from '../store/micboard-store';
import type { Transmitter, SlotConfig, Group, DiscoveredDevice } from '../types/micboard';

interface Receiver {
  ip: string;
  type: string;
  status: string;
  tx: Transmitter[];
}

interface DataResponse {
  config?: {
    slots: SlotConfig[];
    groups: Group[];
  };
  discovered?: DiscoveredDevice[];
  receivers?: Receiver[];
  mp4?: string[];
  jpg?: string[];
  url?: string;
}

interface ChartUpdate {
  slot: number;
  timestamp: number;
  audio_level?: number;
  rf_level?: number;
}

const DATA_URL = '/data.json';
const POLLING_INTERVAL = 1000; // 1 second

export const useDataConnection = (isEnabled: boolean) => {
  const {
    setConnectionStatus,
    updateTransmitter,
    setTransmitters,
    setConfig,
    setGroups,
    setDiscovered,
    setMp4List,
    setImgList,
    setLocalURL,
  } = useMicboardStore();

  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Polling function for data.json
  const pollData = async () => {
    if (!isEnabled) return;

    try {
      const response = await fetch(DATA_URL);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DataResponse = await response.json();

      // Update connection status
      setConnectionStatus('CONNECTED');

      // Update config if present
      if (data.config) {
        setConfig(data.config);

        // Convert groups array to object
        const groupsObj: Record<number, Group> = {};
        data.config.groups.forEach((group, index) => {
          const groupNum = group.group ?? index + 1;
          groupsObj[groupNum] = group;
        });
        setGroups(groupsObj);
      }

      // Transform receivers[].tx[] to transmitters object keyed by slot
      if (data.receivers) {
        const transmitters: Record<number, Transmitter> = {};
        for (const receiver of data.receivers) {
          if (receiver.tx) {
            for (const tx of receiver.tx) {
              // Add receiver info to transmitter
              transmitters[tx.slot] = {
                ...tx,
                ip: receiver.ip,
              };
            }
          }
        }
        setTransmitters(transmitters);
      }

      // Update discovered devices
      if (data.discovered) {
        setDiscovered(data.discovered);
      }

      // Update media lists
      if (data.jpg) {
        setImgList(data.jpg);
      }
      if (data.mp4) {
        setMp4List(data.mp4);
      }

      // Update local URL
      if (data.url) {
        setLocalURL(data.url);
      }
    } catch (error) {
      console.error('Polling error:', error);
      setConnectionStatus('DISCONNECTED');
    }
  };

  // WebSocket connection
  const connectWebSocket = () => {
    if (!isEnabled) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('CONNECTED');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Backend sends: {"chart-update": [...], "data-update": [...], "group-update": [...]}
          // Process each update type if present

          if (message['chart-update']) {
            // Real-time chart data - array of updates
            const chartUpdates = message['chart-update'] as ChartUpdate[];
            for (const chartData of chartUpdates) {
              updateTransmitter(chartData.slot, {
                audio_level: chartData.audio_level,
                rf_level: chartData.rf_level,
              });
            }
          }

          if (message['data-update']) {
            // Slot data updates - array of transmitter data
            const dataUpdates = message['data-update'] as Transmitter[];
            for (const tx of dataUpdates) {
              updateTransmitter(tx.slot, tx);
            }
          }

          if (message['group-update']) {
            // Group configuration updates
            const groupUpdates = message['group-update'] as Group[];
            const groupsObj2: Record<number, Group> = {};
            groupUpdates.forEach((group, index) => {
              const groupNum = group.group ?? index + 1;
              groupsObj2[groupNum] = group;
            });
            setGroups(groupsObj2);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('DISCONNECTED');
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('DISCONNECTED');

        // Attempt to reconnect after 5 seconds
        if (isEnabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 5000);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionStatus('DISCONNECTED');
    }
  };

  useEffect(() => {
    if (!isEnabled) {
      // Clean up connections if disabled
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return;
    }

    // Start polling
    pollData(); // Initial poll
    pollingIntervalRef.current = setInterval(pollData, POLLING_INTERVAL);

    // Start WebSocket connection
    connectWebSocket();

    // Cleanup function
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [isEnabled]);
};