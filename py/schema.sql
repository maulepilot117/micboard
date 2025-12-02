-- Micboard SQLite Configuration Schema
-- Version: 1

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Top-level config key-value pairs (port, uuid, background-folder, etc.)
CREATE TABLE IF NOT EXISTS config_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    value_type TEXT NOT NULL,  -- 'str', 'int', 'bool', 'json'
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Slot configuration (receivers/transmitters)
CREATE TABLE IF NOT EXISTS slots (
    slot INTEGER PRIMARY KEY,
    ip TEXT NOT NULL,
    type TEXT NOT NULL,
    channel INTEGER DEFAULT 1,
    extended_id TEXT,
    extended_name TEXT,
    chan_name_raw TEXT
);

-- Group configuration (display groups)
CREATE TABLE IF NOT EXISTS groups (
    group_num INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    slots TEXT NOT NULL,  -- JSON array: [1,3,2,4]
    hide_charts INTEGER DEFAULT 0
);

-- Planning Center integration settings (singleton)
CREATE TABLE IF NOT EXISTS planning_center (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    enabled INTEGER DEFAULT 0,
    app_id TEXT,
    secret TEXT,
    service_type_id TEXT,
    position_mapping TEXT,  -- JSON array
    auto_sync TEXT,  -- JSON object: {"enabled": false, "interval_minutes": 30}
    last_sync TEXT,
    last_sync_status TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_slots_ip ON slots(ip);
CREATE INDEX IF NOT EXISTS idx_slots_type ON slots(type);
CREATE INDEX IF NOT EXISTS idx_config_updated ON config_meta(updated_at);
