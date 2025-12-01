/**
 * MicrophoneGrid component - Displays all microphone slots in a grid layout
 * Matches vanilla JS renderDisplayList behavior
 */

import React from 'react';
import { useMicboardStore } from '../store/micboard-store';
import { MicrophoneSlot } from './MicrophoneSlot';
import type { Transmitter } from '../types/micboard';

/**
 * Creates a blank/placeholder transmitter for slot 0 or missing slots
 */
const createBlankTransmitter = (slot: number): Transmitter => ({
  slot,
  name: 'BLANK',
  name_raw: '',
  id: '',
  status: 'UNASSIGNED',
  battery: 255,
  runtime: '',
  antenna: 'XX',
  tx_offset: 255,
  quality: 255,
  frequency: '000000',
  ip: '',
  type: 'uhfr',
  channel: 1,
  audio_level: 0,
  rf_level: 0,
});

const MicrophoneGrid: React.FC = () => {
  const { displayList, transmitters, infoDrawerMode } = useMicboardStore();

  return (
    <div id="micboard" className={`above-mid ${infoDrawerMode}`}>
      {displayList.map((slotNumber) => {
        // Handle slot 0 or missing transmitters as blank slots
        if (slotNumber === 0 || !transmitters[slotNumber]) {
          return (
            <MicrophoneSlot
              key={slotNumber}
              transmitter={createBlankTransmitter(slotNumber)}
              showChart={false}
              className="blank"
            />
          );
        }

        return (
          <MicrophoneSlot
            key={slotNumber}
            transmitter={transmitters[slotNumber]}
            showChart={true}
          />
        );
      })}
    </div>
  );
};

export default MicrophoneGrid;