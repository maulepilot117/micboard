/**
 * PlanningCenterSettings component - Configure Planning Center integration
 * Allows users to set up API credentials, map positions to slots, and trigger syncs
 */

import React, { useState, useEffect } from 'react';
import { useMicboardStore } from '../store/micboard-store';

interface PositionMapping {
  position: string;
  slot: number;
}

interface Schedule {
  day: string;
  time: string;
}

interface ServiceType {
  data: {
    id: string;
    attributes: {
      name: string;
    };
  };
}

interface PlanningCenterConfig {
  enabled: boolean;
  app_id: string;
  secret: string;
  service_type_id: string;
  position_mapping: PositionMapping[];
  auto_sync: {
    enabled: boolean;
    schedule: Schedule[];
  };
  last_sync: string | null;
  last_sync_status: 'success' | 'partial' | 'failed' | null;
}

interface SyncResult {
  success: boolean;
  updated_count?: number;
  total_team_members?: number;
  matched_positions?: string[];
  message?: string;
  error?: string;
  errors?: string[];
}

const defaultConfig: PlanningCenterConfig = {
  enabled: false,
  app_id: '',
  secret: '',
  service_type_id: '',
  position_mapping: [],
  auto_sync: {
    enabled: false,
    schedule: [
      { day: 'sunday', time: '06:00' },
      { day: 'wednesday', time: '06:00' },
    ],
  },
  last_sync: null,
  last_sync_status: null,
};

const PlanningCenterSettings: React.FC = () => {
  const { config: micboardConfig, setSettingsMode } = useMicboardStore();

  const [config, setConfig] = useState<PlanningCenterConfig>(defaultConfig);
  const [appId, setAppId] = useState('');
  const [secret, setSecret] = useState('');
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    'unknown' | 'testing' | 'connected' | 'failed'
  >('unknown');
  const [syncStatus, setSyncStatus] = useState<
    'idle' | 'syncing' | 'success' | 'error'
  >('idle');
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load existing config on mount
  useEffect(() => {
    fetch('/api/planning-center/config')
      .then((res) => res.json())
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          setConfig({ ...defaultConfig, ...data });
          if (data.app_id) setAppId(data.app_id);
          // Don't set secret - it's masked
        }
      })
      .catch(console.error);
  }, []);

  // Test connection
  const testConnection = async () => {
    if (!appId || !secret) {
      alert('Please enter both Application ID and Secret');
      return;
    }

    setConnectionStatus('testing');
    try {
      const res = await fetch('/api/planning-center/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: appId, secret }),
      });
      const data = await res.json();
      setConnectionStatus(data.success ? 'connected' : 'failed');

      if (data.success) {
        // Save credentials first
        const newConfig = { ...config, app_id: appId, secret };
        setConfig(newConfig);

        // Then fetch service types
        const stRes = await fetch('/api/planning-center/service-types');
        const stData = await stRes.json();
        setServiceTypes(stData.data || []);
      }
    } catch (e) {
      console.error('Connection test failed:', e);
      setConnectionStatus('failed');
    }
  };

  // Save config
  const saveConfig = async () => {
    setSaveStatus('saving');
    try {
      const payload = {
        ...config,
        app_id: appId || config.app_id,
        secret: secret || config.secret,
      };

      const res = await fetch('/api/planning-center/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      console.error('Save failed:', e);
      setSaveStatus('error');
    }
  };

  // Manual sync
  const triggerSync = async () => {
    setSyncStatus('syncing');
    setSyncResult(null);
    try {
      const res = await fetch('/api/planning-center/sync', { method: 'POST' });
      const data: SyncResult = await res.json();
      setSyncResult(data);
      setSyncStatus(data.success ? 'success' : 'error');

      // Refresh config to get updated last_sync timestamp
      const configRes = await fetch('/api/planning-center/config');
      const configData = await configRes.json();
      if (configData) {
        setConfig((prev) => ({
          ...prev,
          last_sync: configData.last_sync,
          last_sync_status: configData.last_sync_status,
        }));
      }
    } catch (e) {
      console.error('Sync failed:', e);
      setSyncStatus('error');
      setSyncResult({ success: false, error: 'Network error' });
    }
  };

  // Add position mapping
  const addMapping = () => {
    const firstSlot = micboardConfig.slots[0]?.slot || 1;
    setConfig({
      ...config,
      position_mapping: [
        ...config.position_mapping,
        { position: '', slot: firstSlot },
      ],
    });
  };

  // Remove position mapping
  const removeMapping = (index: number) => {
    setConfig({
      ...config,
      position_mapping: config.position_mapping.filter((_, i) => i !== index),
    });
  };

  // Update mapping
  const updateMapping = (
    index: number,
    field: 'position' | 'slot',
    value: string | number
  ) => {
    const mappings = [...config.position_mapping];
    mappings[index] = { ...mappings[index], [field]: value };
    setConfig({ ...config, position_mapping: mappings });
  };

  // Add schedule entry
  const addSchedule = () => {
    setConfig({
      ...config,
      auto_sync: {
        ...config.auto_sync,
        schedule: [...config.auto_sync.schedule, { day: 'sunday', time: '06:00' }],
      },
    });
  };

  // Remove schedule entry
  const removeSchedule = (index: number) => {
    setConfig({
      ...config,
      auto_sync: {
        ...config.auto_sync,
        schedule: config.auto_sync.schedule.filter((_, i) => i !== index),
      },
    });
  };

  // Update schedule
  const updateSchedule = (
    index: number,
    field: 'day' | 'time',
    value: string
  ) => {
    const schedule = [...config.auto_sync.schedule];
    schedule[index] = { ...schedule[index], [field]: value };
    setConfig({
      ...config,
      auto_sync: { ...config.auto_sync, schedule },
    });
  };

  const handleClose = () => {
    setSettingsMode('NONE');
  };

  return (
    <div className="settings-panel planning-center-settings">
      <div className="container">
        <h2>Planning Center Integration</h2>

        {/* Enable Toggle */}
        <div className="row mb-3">
          <div className="col">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="enablePlanningCenter"
                checked={config.enabled}
                onChange={(e) =>
                  setConfig({ ...config, enabled: e.target.checked })
                }
              />
              <label className="form-check-label" htmlFor="enablePlanningCenter">
                Enable Planning Center Integration
              </label>
            </div>
          </div>
        </div>

        {/* Authentication Section */}
        <div className="card mb-3 bg-dark">
          <div className="card-header">
            <h5 className="mb-0">Authentication</h5>
          </div>
          <div className="card-body">
            <div className="row mb-2">
              <div className="col-md-6">
                <label className="form-label">Application ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="Enter Planning Center Application ID"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Secret</label>
                <input
                  type="password"
                  className="form-control"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder={
                    config.secret === '***configured***'
                      ? 'Secret configured (enter new to change)'
                      : 'Enter Planning Center Secret'
                  }
                />
              </div>
            </div>
            <div className="d-flex align-items-center gap-3">
              <button
                className="btn btn-primary"
                onClick={testConnection}
                disabled={connectionStatus === 'testing'}
              >
                {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
              </button>
              <span
                className={`badge ${
                  connectionStatus === 'connected'
                    ? 'bg-success'
                    : connectionStatus === 'failed'
                    ? 'bg-danger'
                    : 'bg-secondary'
                }`}
              >
                {connectionStatus === 'connected' && 'Connected'}
                {connectionStatus === 'failed' && 'Connection Failed'}
                {connectionStatus === 'unknown' && 'Not Tested'}
                {connectionStatus === 'testing' && 'Testing...'}
              </span>
            </div>
            <small className="text-muted d-block mt-2">
              Get API credentials from{' '}
              <a
                href="https://api.planningcenteronline.com/oauth/applications"
                target="_blank"
                rel="noopener noreferrer"
              >
                Planning Center Developer Portal
              </a>
            </small>
          </div>
        </div>

        {/* Service Type Selection */}
        {(serviceTypes.length > 0 || config.service_type_id) && (
          <div className="card mb-3 bg-dark">
            <div className="card-header">
              <h5 className="mb-0">Service Type</h5>
            </div>
            <div className="card-body">
              <select
                className="form-select"
                value={config.service_type_id}
                onChange={(e) =>
                  setConfig({ ...config, service_type_id: e.target.value })
                }
              >
                <option value="">Select Service Type</option>
                {serviceTypes.map((st) => (
                  <option key={st.data.id} value={st.data.id}>
                    {st.data.attributes.name}
                  </option>
                ))}
              </select>
              {config.service_type_id && serviceTypes.length === 0 && (
                <small className="text-muted">
                  Service Type ID: {config.service_type_id} (test connection to load
                  names)
                </small>
              )}
            </div>
          </div>
        )}

        {/* Position Mappings */}
        <div className="card mb-3 bg-dark">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Position Mappings</h5>
            <button className="btn btn-sm btn-outline-primary" onClick={addMapping}>
              + Add Mapping
            </button>
          </div>
          <div className="card-body">
            {config.position_mapping.length === 0 ? (
              <p className="text-muted mb-0">
                No mappings configured. Add mappings to connect Planning Center
                positions to Micboard slots.
              </p>
            ) : (
              <table className="table table-dark table-sm">
                <thead>
                  <tr>
                    <th>Position Name (from Planning Center)</th>
                    <th>Micboard Slot</th>
                    <th style={{ width: '80px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {config.position_mapping.map((mapping, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={mapping.position}
                          onChange={(e) =>
                            updateMapping(index, 'position', e.target.value)
                          }
                          placeholder="e.g., Red Mic, Worship Leader"
                        />
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={mapping.slot}
                          onChange={(e) =>
                            updateMapping(index, 'slot', parseInt(e.target.value))
                          }
                        >
                          {micboardConfig.slots.map((slot) => (
                            <option key={slot.slot} value={slot.slot}>
                              Slot {slot.slot}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeMapping(index)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <small className="text-muted">
              Position names use partial matching (e.g., "red mic" matches "Worship
              Leader - Red Mic")
            </small>
          </div>
        </div>

        {/* Auto-Sync Schedule */}
        <div className="card mb-3 bg-dark">
          <div className="card-header">
            <h5 className="mb-0">Auto-Sync Schedule</h5>
          </div>
          <div className="card-body">
            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="enableAutoSync"
                checked={config.auto_sync.enabled}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    auto_sync: { ...config.auto_sync, enabled: e.target.checked },
                  })
                }
              />
              <label className="form-check-label" htmlFor="enableAutoSync">
                Enable automatic sync on schedule
              </label>
            </div>

            {config.auto_sync.enabled && (
              <>
                <table className="table table-dark table-sm">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Time</th>
                      <th style={{ width: '80px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.auto_sync.schedule.map((entry, index) => (
                      <tr key={index}>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={entry.day}
                            onChange={(e) =>
                              updateSchedule(index, 'day', e.target.value)
                            }
                          >
                            <option value="sunday">Sunday</option>
                            <option value="monday">Monday</option>
                            <option value="tuesday">Tuesday</option>
                            <option value="wednesday">Wednesday</option>
                            <option value="thursday">Thursday</option>
                            <option value="friday">Friday</option>
                            <option value="saturday">Saturday</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="time"
                            className="form-control form-control-sm"
                            value={entry.time}
                            onChange={(e) =>
                              updateSchedule(index, 'time', e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeSchedule(index)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={addSchedule}
                >
                  + Add Schedule
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sync Status & Manual Sync */}
        <div className="card mb-3 bg-dark">
          <div className="card-header">
            <h5 className="mb-0">Sync Status</h5>
          </div>
          <div className="card-body">
            {config.last_sync && (
              <p className="mb-2">
                Last sync:{' '}
                <strong>{new Date(config.last_sync).toLocaleString()}</strong>
                {' - '}
                <span
                  className={`badge ${
                    config.last_sync_status === 'success'
                      ? 'bg-success'
                      : config.last_sync_status === 'partial'
                      ? 'bg-warning'
                      : 'bg-danger'
                  }`}
                >
                  {config.last_sync_status}
                </span>
              </p>
            )}

            <button
              className="btn btn-success"
              onClick={triggerSync}
              disabled={syncStatus === 'syncing' || !config.enabled}
            >
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </button>

            {!config.enabled && (
              <small className="text-muted ms-2">
                Enable integration to sync
              </small>
            )}

            {syncResult && (
              <div
                className={`alert mt-3 ${
                  syncResult.success ? 'alert-success' : 'alert-danger'
                }`}
              >
                <strong>{syncResult.message || 'Sync completed'}</strong>
                {syncResult.updated_count !== undefined && (
                  <p className="mb-1">
                    Updated {syncResult.updated_count} slot(s)
                  </p>
                )}
                {syncResult.matched_positions &&
                  syncResult.matched_positions.length > 0 && (
                    <div>
                      <small>Matched positions:</small>
                      <ul className="mb-0">
                        {syncResult.matched_positions.map((pos, i) => (
                          <li key={i}>
                            <small>{pos}</small>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                {syncResult.errors && syncResult.errors.length > 0 && (
                  <div>
                    <small>Errors:</small>
                    <ul className="mb-0 text-danger">
                      {syncResult.errors.map((err, i) => (
                        <li key={i}>
                          <small>{err}</small>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="row mt-4">
          <div className="col">
            <button
              className="btn btn-primary"
              onClick={saveConfig}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving'
                ? 'Saving...'
                : saveStatus === 'saved'
                ? 'Saved!'
                : 'Save Settings'}
            </button>
            <button className="btn btn-secondary ms-2" onClick={handleClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningCenterSettings;
