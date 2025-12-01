/**
 * ExtendedEditor component - Edit extended names and IDs for slots
 */

import React, { useState } from 'react';
import { useMicboardStore } from '../store/micboard-store';

const ExtendedEditor: React.FC = () => {
  const {
    transmitters,
    config,
    setSettingsMode,
    updateTransmitter,
  } = useMicboardStore();

  // Initialize extended data only once on mount
  const [extendedData, setExtendedData] = useState<
    Record<number, { extended_id: string; extended_name: string }>
  >(() => {
    const data: Record<number, { extended_id: string; extended_name: string }> = {};
    config.slots.forEach((slot) => {
      const transmitter = transmitters[slot.slot];
      data[slot.slot] = {
        extended_id: transmitter?.extended_id || '',
        extended_name: transmitter?.extended_name || '',
      };
    });
    return data;
  });
  const [bulkNames, setBulkNames] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);

  const handleSave = async () => {
    try {
      const updates = Object.entries(extendedData).map(([slot, data]) => ({
        slot: parseInt(slot),
        extended_id: data.extended_id,
        extended_name: data.extended_name,
      }));

      const response = await fetch('/api/slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        // Update local state
        updates.forEach((update) => {
          updateTransmitter(update.slot, {
            extended_id: update.extended_id,
            extended_name: update.extended_name,
          });
        });
        setSettingsMode('NONE');
      }
    } catch (error) {
      console.error('Failed to save extended data:', error);
    }
  };

  const handleClose = () => {
    setSettingsMode('NONE');
  };

  const handleClearIds = () => {
    const clearedData = { ...extendedData };
    Object.keys(clearedData).forEach((slot) => {
      clearedData[parseInt(slot)].extended_id = '';
    });
    setExtendedData(clearedData);
  };

  const handleClearNames = () => {
    const clearedData = { ...extendedData };
    Object.keys(clearedData).forEach((slot) => {
      clearedData[parseInt(slot)].extended_name = '';
    });
    setExtendedData(clearedData);
  };

  const handleLoadBulkNames = () => {
    const names = bulkNames.split('\n').filter(n => n.trim());
    const slots = config.slots.map(s => s.slot);
    const updatedData = { ...extendedData };

    names.forEach((name, index) => {
      if (index < slots.length) {
        updatedData[slots[index]].extended_name = name.trim();
      }
    });

    setExtendedData(updatedData);
    setBulkNames('');
    setShowBulkInput(false);
  };

  const handleInputChange = (
    slot: number,
    field: 'extended_id' | 'extended_name',
    value: string
  ) => {
    setExtendedData((prev) => ({
      ...prev,
      [slot]: {
        ...prev[slot],
        [field]: value,
      },
    }));
  };

  return (
    <div className="extended-editor settings-panel">
      <div className="container">
        <h2>Extended Name Editor</h2>

        <div className="row mb-3">
          <div className="col">
            <button
              className="btn btn-secondary"
              onClick={() => setShowBulkInput(!showBulkInput)}
            >
              Bulk Load Names
            </button>
            <button
              className="btn btn-warning ms-2"
              onClick={handleClearIds}
            >
              Clear All IDs
            </button>
            <button
              className="btn btn-warning ms-2"
              onClick={handleClearNames}
            >
              Clear All Names
            </button>
          </div>
        </div>

        {showBulkInput && (
          <div className="row mb-3">
            <div className="col">
              <textarea
                className="form-control"
                rows={10}
                placeholder="Enter names, one per line..."
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
              />
              <button
                className="btn btn-primary mt-2"
                onClick={handleLoadBulkNames}
              >
                Load Names
              </button>
            </div>
          </div>
        )}

        <div className="slots-list">
          {config.slots.map((slot) => {
            const transmitter = transmitters[slot.slot];
            const data = extendedData[slot.slot] || { extended_id: '', extended_name: '' };

            return (
              <div key={slot.slot} className="row mb-2">
                <div className="col-2">
                  <label>Slot {slot.slot}</label>
                </div>
                <div className="col-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder={transmitter?.id || 'ID'}
                    value={data.extended_id}
                    onChange={(e) =>
                      handleInputChange(slot.slot, 'extended_id', e.target.value)
                    }
                  />
                </div>
                <div className="col-4">
                  <input
                    type="text"
                    className="form-control"
                    placeholder={transmitter?.name || 'Name'}
                    value={data.extended_name}
                    onChange={(e) =>
                      handleInputChange(slot.slot, 'extended_name', e.target.value)
                    }
                  />
                </div>
                <div className="col-3">
                  <small className="text-muted">
                    {transmitter?.name || 'Empty'}
                  </small>
                </div>
              </div>
            );
          })}
        </div>

        <div className="row mt-4">
          <div className="col">
            <button
              className="btn btn-success"
              onClick={handleSave}
            >
              Save
            </button>
            <button
              className="btn btn-secondary ms-2"
              onClick={handleClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtendedEditor;