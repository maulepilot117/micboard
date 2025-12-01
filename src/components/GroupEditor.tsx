/**
 * GroupEditor component - Edit group slots and settings with drag-and-drop
 */

import React, { useState, useEffect } from 'react';
import { useMicboardStore } from '../store/micboard-store';

const GroupEditor: React.FC = () => {
  const {
    groups,
    currentGroup,
    updateGroup,
    setSettingsMode,
    transmitters,
    config,
  } = useMicboardStore();

  const [groupTitle, setGroupTitle] = useState('');
  const [hideCharts, setHideCharts] = useState(false);
  const [groupSlots, setGroupSlots] = useState<number[]>([]);

  const currentGroupData = groups[currentGroup];

  useEffect(() => {
    if (currentGroupData) {
      setGroupTitle(currentGroupData.title || '');
      setHideCharts(currentGroupData.hide_charts || false);
      setGroupSlots(currentGroupData.slots || []);
    }
  }, [currentGroupData]);

  const handleSave = async () => {
    try {
      const response = await fetch('/api/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group: currentGroup,
          title: groupTitle,
          hide_charts: hideCharts,
          slots: groupSlots,
        }),
      });

      if (response.ok) {
        // Update local state
        updateGroup(currentGroup, {
          group: currentGroup,
          title: groupTitle,
          hide_charts: hideCharts,
          slots: groupSlots,
        });
        setSettingsMode('NONE');
      }
    } catch (error) {
      console.error('Failed to save group:', error);
    }
  };

  const handleClose = () => {
    setSettingsMode('NONE');
  };

  const handleClearAll = () => {
    setGroupSlots([]);
  };

  // Get all available slots
  const allSlots = config.slots.map(s => s.slot);
  const availableSlots = allSlots.filter(s => !groupSlots.includes(s));

  return (
    <div className="sidebar-nav">
      <h1 id="sidebarTitle">Group {currentGroup}</h1>

      <div className="form-group">
        <input
          type="text"
          className="form-control"
          id="groupTitle"
          placeholder="Group Title"
          value={groupTitle}
          onChange={(e) => setGroupTitle(e.target.value)}
        />

        <div className="input-group mt-2">
          <div className="input-group-prepend">
            <span className="input-group-text">Hide inactive charts</span>
          </div>
          <div className="input-group-text">
            <input
              type="checkbox"
              id="chartCheck"
              checked={hideCharts}
              onChange={(e) => setHideCharts(e.target.checked)}
            />
          </div>
        </div>
      </div>

      <div className="slot-prototype-list drag-container" id="eslotlist">
        <h3>Current Slots</h3>
        {groupSlots.map((slot) => (
          <div key={slot} className="slot-item">
            Slot {slot}: {transmitters[slot]?.name || 'Empty'}
          </div>
        ))}
      </div>

      <div className="available-slots mt-3">
        <h3>Available Slots</h3>
        {availableSlots.map((slot) => (
          <div
            key={slot}
            className="slot-item available"
            onClick={() => setGroupSlots([...groupSlots, slot])}
          >
            Slot {slot}: {transmitters[slot]?.name || 'Empty'}
          </div>
        ))}
      </div>

      <div className="button-group mt-3">
        <button
          className="btn btn-danger"
          onClick={handleClearAll}
        >
          Clear All
        </button>
        <button
          className="btn btn-success"
          onClick={handleSave}
        >
          Save
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default GroupEditor;