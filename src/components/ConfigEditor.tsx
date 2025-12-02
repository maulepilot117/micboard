/**
 * ConfigEditor component - Configure network devices and slots
 */

import React, { useState } from 'react';
import { useMicboardStore } from '../store/micboard-store';
import type { SlotConfig, DiscoveredDevice } from '../types/micboard';

const ConfigEditor: React.FC = () => {
  const {
    config,
    discovered,
    setSettingsMode,
    setConfig,
  } = useMicboardStore();

  // Initialize slots from config only once on mount
  const [slots, setSlots] = useState<SlotConfig[]>(() => [...config.slots]);
  const [showDiscovered, setShowDiscovered] = useState(true);

  const handleSave = async () => {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slots),
      });

      if (response.ok) {
        // Update local state
        setConfig({ slots });
        setSettingsMode('NONE');
        // Reload to apply new config
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const handleClose = () => {
    setSettingsMode('NONE');
  };

  const handleAddSlot = () => {
    const newSlot = slots.length + 1;
    setSlots([...slots, { slot: newSlot, type: 'offline' }]);
  };

  const handleDeleteSlot = (index: number) => {
    const newSlots = slots.filter((_, i) => i !== index);
    // Renumber slots
    newSlots.forEach((slot, i) => {
      slot.slot = i + 1;
    });
    setSlots(newSlots);
  };

  const handleSlotChange = (
    index: number,
    field: keyof SlotConfig,
    value: string | number
  ) => {
    const newSlots = [...slots];
    newSlots[index] = {
      ...newSlots[index],
      [field]: value,
    };
    setSlots(newSlots);
  };

  const handleAddDiscovered = (device: DiscoveredDevice) => {
    const newSlot = slots.length + 1;
    setSlots([
      ...slots,
      {
        slot: newSlot,
        type: device.type,
        ip: device.ip,
        channel: 1,
      },
    ]);
  };

  const handleAddAllDiscovered = () => {
    const configuredIPs = slots
      .filter(s => s.ip)
      .map(s => s.ip);

    const unconfigured = discovered.filter(
      d => !configuredIPs.includes(d.ip)
    );

    const newSlots = [...slots];
    unconfigured.forEach((device) => {
      newSlots.push({
        slot: newSlots.length + 1,
        type: device.type,
        ip: device.ip,
        channel: 1,
      });
    });
    setSlots(newSlots);
  };

  const handleClear = () => {
    setSlots([]);
  };

  // Filter discovered devices to show only unconfigured
  const configuredIPs = slots
    .filter(s => s.ip)
    .map(s => s.ip);
  const unconfiguredDevices = discovered.filter(
    d => !configuredIPs.includes(d.ip)
  );

  return (
    <div className="config-editor settings-panel">
      <div className="container">
        <h2>Device Configuration</h2>

        <div className="row mb-3">
          <div className="col">
            <button
              className="btn btn-primary"
              onClick={handleAddSlot}
            >
              Add Slot
            </button>
            <button
              className="btn btn-danger ms-2"
              onClick={handleClear}
            >
              Clear All
            </button>
            <button
              className="btn btn-info ms-2"
              onClick={() => setShowDiscovered(!showDiscovered)}
            >
              {showDiscovered ? 'Hide' : 'Show'} Discovered
            </button>
          </div>
        </div>

        <div className="slots-config">
          <h3>Configured Slots</h3>
          {slots.map((slot, index) => (
            <div key={index} className="row mb-2">
              <div className="col-1">
                <span className="navbar-toggler-icon"></span>
              </div>
              <div className="col-1">
                <label>Slot {slot.slot}</label>
              </div>
              <div className="col-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="IP Address"
                  value={slot.ip || ''}
                  onChange={(e) =>
                    handleSlotChange(index, 'ip', e.target.value)
                  }
                />
              </div>
              <div className="col-2">
                <select
                  className="form-control"
                  value={slot.type}
                  onChange={(e) =>
                    handleSlotChange(index, 'type', e.target.value)
                  }
                >
                  <option value="offline">offline</option>
                  <option value="axtd">axtd</option>
                  <option value="ulxd">ulxd</option>
                  <option value="qlxd">qlxd</option>
                  <option value="uhfr">uhfr</option>
                  <option value="p10t">p10t</option>
                </select>
              </div>
              <div className="col-2">
                <select
                  className="form-control"
                  value={slot.channel || 1}
                  onChange={(e) =>
                    handleSlotChange(index, 'channel', parseInt(e.target.value))
                  }
                  disabled={slot.type === 'offline'}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>
              <div className="col-1">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteSlot(index)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        {showDiscovered && unconfiguredDevices.length > 0 && (
          <div className="discovered-devices mt-4">
            <h3>Discovered Devices</h3>
            <button
              className="btn btn-success mb-2"
              onClick={handleAddAllDiscovered}
            >
              Add All Discovered
            </button>
            {unconfiguredDevices.map((device) => (
              <div key={device.ip} className="row mb-2">
                <div className="col-3">{device.ip}</div>
                <div className="col-2">{device.type}</div>
                <div className="col-3">{device.device || 'Unknown'}</div>
                <div className="col-2">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleAddDiscovered(device)}
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

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

export default ConfigEditor;