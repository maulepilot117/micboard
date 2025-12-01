/**
 * useDataConnection hook - Handles WebSocket and data polling
 * Manages real-time data updates from the server
 */

import { useEffect, useRef } from 'react';
import { useMicboardStore } from '../store/micboard-store';
import type { Transmitter, SlotConfig, Group, DiscoveredDevice } from '../types/micboard';

interface DataResponse {
  config?: {
    slots: SlotConfig[];
    groups: Group[];
  };
  discovered?: DiscoveredDevice[];
  transmitters?: Record<number, Transmitter>;
  mp4?: string[];
  jpg?: string[];
  url?: string;
}

interface ChartUpdate {
  slot: number;
  timestamp: number;
  audio?: number;
  rf?: number;
  audio_l?: number;
  audio_r?: number;
}

interface DataUpdate {
  slot: number;
  data: Partial<Transmitter>;
}

interface GroupUpdate {
  groups: Group[];
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

      // Update transmitters if present
      if (data.transmitters) {
        setTransmitters(data.transmitters);
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

          switch (message.type) {
            case 'chart-update':
              // Real-time chart data
              const chartData = message.data as ChartUpdate;
              updateTransmitter(chartData.slot, {
                audio_level: chartData.audio,
                rf_level: chartData.rf,
                audio_level_l: chartData.audio_l,
                audio_level_r: chartData.audio_r,
              });
              break;

            case 'data-update':
              // Slot data update
              const dataUpdate = message.data as DataUpdate;
              updateTransmitter(dataUpdate.slot, dataUpdate.data);
              break;

            case 'group-update':
              // Group configuration update
              const groupUpdate = message.data as GroupUpdate;
              const groupsObj2: Record<number, Group> = {};
              groupUpdate.groups.forEach((group, index) => {
                const groupNum = group.group ?? index + 1;
                groupsObj2[groupNum] = group;
              });
              setGroups(groupsObj2);
              break;

            default:
              console.warn('Unknown WebSocket message type:', message.type);
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