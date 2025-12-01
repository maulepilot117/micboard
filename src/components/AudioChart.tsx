/**
 * AudioChart component - Real-time audio/RF level charts using SmoothieChart
 */

import React, { useEffect, useRef } from 'react';
import { SmoothieChart, TimeSeries } from 'smoothie';
import { useMicboardStore } from '../store/micboard-store';

interface AudioChartProps {
  slot: number;
  type: string;
}

const AudioChart: React.FC<AudioChartProps> = ({ slot, type }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<SmoothieChart | null>(null);
  const audioSeriesRef = useRef<TimeSeries | null>(null);
  const rfSeriesRef = useRef<TimeSeries | null>(null);
  const audioLSeriesRef = useRef<TimeSeries | null>(null);
  const audioRSeriesRef = useRef<TimeSeries | null>(null);

  const { transmitters } = useMicboardStore();
  const transmitter = transmitters[slot];

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create chart
    const chart = new SmoothieChart({
      millisPerPixel: 25,
      grid: {
        fillStyle: 'transparent',
        strokeStyle: 'transparent',
        borderVisible: false,
      },
      labels: { disabled: true },
      maxValue: 200,
      minValue: 0,
    });

    chartRef.current = chart;

    // Create time series based on device type
    if (type === 'p10t') {
      // IEM - stereo audio levels
      const audioLSeries = new TimeSeries();
      const audioRSeries = new TimeSeries();
      audioLSeriesRef.current = audioLSeries;
      audioRSeriesRef.current = audioRSeries;

      chart.addTimeSeries(audioLSeries, {
        strokeStyle: '#69B578',
        lineWidth: 2,
      });

      chart.addTimeSeries(audioRSeries, {
        strokeStyle: '#69B578',
        lineWidth: 2,
      });
    } else {
      // Microphone - audio and RF levels
      const audioSeries = new TimeSeries();
      const rfSeries = new TimeSeries();
      audioSeriesRef.current = audioSeries;
      rfSeriesRef.current = rfSeries;

      chart.addTimeSeries(audioSeries, {
        strokeStyle: '#69B578', // Green
        lineWidth: 2,
      });

      chart.addTimeSeries(rfSeries, {
        strokeStyle: '#DC493A', // Red
        lineWidth: 2,
      });
    }

    // Start streaming to canvas
    chart.streamTo(canvasRef.current, 0);

    // Cleanup
    return () => {
      if (chartRef.current) {
        chartRef.current.stop();
        chartRef.current = null;
      }
    };
  }, [type]);

  // Update chart data when transmitter data changes
  useEffect(() => {
    if (!transmitter) return;

    const timestamp = Date.now();

    if (type === 'p10t') {
      // IEM - update stereo audio levels
      if (audioLSeriesRef.current && transmitter.audio_level_l !== undefined) {
        audioLSeriesRef.current.append(timestamp, transmitter.audio_level_l);
      }
      if (audioRSeriesRef.current && transmitter.audio_level_r !== undefined) {
        audioRSeriesRef.current.append(timestamp, transmitter.audio_level_r);
      }
    } else {
      // Microphone - update audio and RF levels
      if (audioSeriesRef.current && transmitter.audio_level !== undefined) {
        // Scale audio to 0-100 range for display
        audioSeriesRef.current.append(timestamp, transmitter.audio_level);
      }
      if (rfSeriesRef.current && transmitter.rf_level !== undefined) {
        // Scale RF to 0-50 range and offset by 100 for display separation
        rfSeriesRef.current.append(timestamp, 100 + transmitter.rf_level);
      }
    }
  }, [transmitter, type]);

  return (
    <canvas
      ref={canvasRef}
      className="slotgraph"
      width={200}
      height={60}
    />
  );
};

export default AudioChart;