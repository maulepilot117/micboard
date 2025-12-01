/**
 * DiversityIndicator Component
 * Displays antenna diversity/signal strength bars
 * Matches the vanilla JS updateDiversity logic
 */

import React from 'react';

type DiversityBarState = 'diversity-bar-blue' | 'diversity-bar-red' | 'diversity-bar-off';

interface DiversityIndicatorProps {
  antenna: string; // String like "AB", "RX", "XX", etc.
  className?: string;
}

/**
 * Maps antenna characters to bar states:
 * A/B = Blue (good signal from antenna A or B)
 * R = Red (RF mute)
 * X = Off (no signal)
 */
const getDiversityBarState = (char: string): DiversityBarState => {
  switch (char) {
    case 'A':
    case 'B':
      return 'diversity-bar-blue';
    case 'R':
      return 'diversity-bar-red';
    case 'X':
      return 'diversity-bar-off';
    default:
      return 'diversity-bar-off';
  }
};

export const DiversityIndicator: React.FC<DiversityIndicatorProps> = ({
  antenna,
  className = '',
}) => {
  const bars = antenna.split('').map((char) => getDiversityBarState(char));

  return (
    <div className={`diversity ${className}`}>
      {bars.map((barState, index) => (
        <div key={index} className={`diversity-bar ${barState}`} />
      ))}
    </div>
  );
};
