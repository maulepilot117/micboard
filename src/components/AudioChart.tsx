/**
 * AudioChart component - Real-time audio/RF level charts using uPlot
 */

import React, { useEffect, useRef, useCallback } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useMicboardStore } from '../store/micboard-store';

interface AudioChartProps {
  slot: number;
  type: string;
}

// Number of data points to display (5 seconds at ~100ms updates)
const MAX_POINTS = 50;

// Custom type for our data arrays (uPlot.AlignedData includes TypedArray which lacks shift/push)
type ChartData = [number[], (number | null)[], (number | null)[]];

const AudioChart: React.FC<AudioChartProps> = ({ slot, type }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);
  const dataRef = useRef<ChartData>([[], [], []]);

  const { transmitters } = useMicboardStore();
  const transmitter = transmitters[slot];

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Initialize data arrays
    const now = Date.now() / 1000;
    const times: number[] = [];
    const series1: (number | null)[] = [];
    const series2: (number | null)[] = [];

    for (let i = 0; i < MAX_POINTS; i++) {
      times.push(now - (MAX_POINTS - i) * 0.1);
      series1.push(null);
      series2.push(null);
    }

    dataRef.current = [times, series1, series2] as ChartData;

    // Get container dimensions (CSS sets these via .slotgraph class)
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width || 200;
    const height = rect.height || 100;

    // Chart options
    const opts: uPlot.Options = {
      width,
      height,
      cursor: { show: false },
      legend: { show: false },
      scales: {
        x: { time: false },
        y: { range: [0, 200] },
      },
      axes: [
        { show: false },
        { show: false },
      ],
      series: [
        {}, // x-axis timestamps
        {
          stroke: '#69B578',
          width: 2,
          label: type === 'p10t' ? 'Audio L' : 'Audio',
        },
        {
          stroke: type === 'p10t' ? '#69B578' : '#DC493A',
          width: 2,
          label: type === 'p10t' ? 'Audio R' : 'RF',
        },
      ],
    };

    // Create chart
    const chart = new uPlot(opts, dataRef.current, containerRef.current);
    chartRef.current = chart;

    // Handle window resize
    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        const newRect = containerRef.current.getBoundingClientRect();
        chartRef.current.setSize({ width: newRect.width, height: newRect.height });
      }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [type]);

  // Update chart data when transmitter data changes
  const updateChart = useCallback(() => {
    if (!chartRef.current || !transmitter) return;

    const now = Date.now() / 1000;
    const [times, series1, series2] = dataRef.current;

    // Shift data and add new point
    times.shift();
    times.push(now);

    series1.shift();
    series2.shift();

    if (type === 'p10t') {
      // IEM - stereo audio levels
      series1.push(transmitter.audio_level_l ?? null);
      series2.push(transmitter.audio_level_r ?? null);
    } else {
      // Microphone - audio and RF levels
      series1.push(transmitter.audio_level ?? null);
      // Offset RF by 100 for visual separation
      series2.push(transmitter.rf_level !== undefined ? 100 + transmitter.rf_level : null);
    }

    // Update chart
    chartRef.current.setData(dataRef.current);
  }, [transmitter, type]);

  // Listen for transmitter updates
  useEffect(() => {
    updateChart();
  }, [transmitter, updateChart]);

  return (
    <div
      ref={containerRef}
      className="slotgraph"
    />
  );
};

export default AudioChart;
