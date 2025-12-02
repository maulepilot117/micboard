"""
SQLite Configuration Store for Micboard

Provides durable, atomic configuration storage using SQLite with WAL mode.
Replaces JSON file storage while maintaining compatibility with config_tree dict.
"""

import sqlite3
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

SCHEMA_VERSION = 1

# Load schema from file at module level
_schema_path = Path(__file__).parent / 'schema.sql'
with open(_schema_path) as f:
    SCHEMA_SQL = f.read()


class ConfigStore:
    """Synchronous SQLite configuration store with atomic writes."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._ensure_directory()
        self._ensure_schema()

    def _ensure_directory(self):
        """Create parent directory if it doesn't exist."""
        db_dir = os.path.dirname(self.db_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir)

    def _get_connection(self) -> sqlite3.Connection:
        """Get a new database connection with proper settings."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute('PRAGMA journal_mode=WAL')
        conn.execute('PRAGMA synchronous=NORMAL')
        conn.execute('PRAGMA busy_timeout=5000')
        conn.execute('PRAGMA foreign_keys=ON')
        return conn

    def _ensure_schema(self):
        """Create tables if they don't exist."""
        conn = self._get_connection()
        try:
            conn.executescript(SCHEMA_SQL)
            # Record schema version if not present
            cursor = conn.execute(
                'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
            )
            row = cursor.fetchone()
            if row is None:
                conn.execute(
                    'INSERT INTO schema_version (version) VALUES (?)',
                    (SCHEMA_VERSION,)
                )
            conn.commit()
        finally:
            conn.close()

    def integrity_check(self) -> bool:
        """Run SQLite integrity check. Returns True if database is healthy."""
        conn = self._get_connection()
        try:
            cursor = conn.execute('PRAGMA integrity_check')
            result = cursor.fetchone()
            return result[0] == 'ok'
        finally:
            conn.close()

    def is_migrated(self) -> bool:
        """Check if database has been populated with config data."""
        conn = self._get_connection()
        try:
            cursor = conn.execute('SELECT COUNT(*) FROM slots')
            count = cursor.fetchone()[0]
            return count > 0
        finally:
            conn.close()

    def migrate_from_json(self, json_path: str) -> bool:
        """
        One-time migration from config.json to SQLite.
        Returns True on success, False on failure.
        """
        try:
            with open(json_path) as f:
                data = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError) as e:
            logging.error(f"Failed to read JSON config: {e}")
            return False

        conn = self._get_connection()
        try:
            # Use transaction for atomic migration
            conn.execute('BEGIN IMMEDIATE')

            # Migrate top-level config values
            for key, value in data.items():
                if key in ('slots', 'groups', 'planning_center'):
                    continue  # Handle separately

                value_type = self._get_value_type(value)
                stored_value = json.dumps(value) if value_type == 'json' else str(value)

                conn.execute('''
                    INSERT OR REPLACE INTO config_meta (key, value, value_type)
                    VALUES (?, ?, ?)
                ''', (key, stored_value, value_type))

            # Migrate slots
            for slot_data in data.get('slots', []):
                conn.execute('''
                    INSERT OR REPLACE INTO slots
                    (slot, ip, type, channel, extended_id, extended_name, chan_name_raw)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    slot_data['slot'],
                    slot_data['ip'],
                    slot_data['type'],
                    slot_data.get('channel', 1),
                    slot_data.get('extended_id'),
                    slot_data.get('extended_name'),
                    slot_data.get('chan_name_raw')
                ))

            # Migrate groups
            for group_data in data.get('groups', []):
                conn.execute('''
                    INSERT OR REPLACE INTO groups
                    (group_num, title, slots, hide_charts)
                    VALUES (?, ?, ?, ?)
                ''', (
                    group_data['group'],
                    group_data.get('title', ''),
                    json.dumps(group_data.get('slots', [])),
                    1 if group_data.get('hide_charts') else 0
                ))

            # Migrate planning_center if present
            pc = data.get('planning_center', {})
            if pc:
                conn.execute('''
                    INSERT OR REPLACE INTO planning_center
                    (id, enabled, app_id, secret, service_type_id,
                     position_mapping, auto_sync, last_sync, last_sync_status)
                    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    1 if pc.get('enabled') else 0,
                    pc.get('app_id'),
                    pc.get('secret'),
                    pc.get('service_type_id'),
                    json.dumps(pc.get('position_mapping', [])),
                    json.dumps(pc.get('auto_sync', {})),
                    pc.get('last_sync'),
                    pc.get('last_sync_status')
                ))

            conn.commit()
            logging.info(f"Migrated config from {json_path} to SQLite")
            return True

        except Exception as e:
            conn.rollback()
            logging.error(f"Migration failed: {e}")
            return False
        finally:
            conn.close()

    def _get_value_type(self, value: Any) -> str:
        """Determine the type string for a config value."""
        if isinstance(value, bool):
            return 'bool'
        elif isinstance(value, int):
            return 'int'
        elif isinstance(value, str):
            return 'str'
        else:
            return 'json'

    def _parse_value(self, value: str, value_type: str) -> Any:
        """Parse a stored value back to its original type."""
        if value_type == 'bool':
            return value.lower() in ('true', '1', 'yes')
        elif value_type == 'int':
            return int(value)
        elif value_type == 'json':
            return json.loads(value)
        else:
            return value

    def get_all(self) -> Dict[str, Any]:
        """
        Load entire config as dict (compatible with config_tree).
        This is used at startup to populate the in-memory config.
        """
        conn = self._get_connection()
        try:
            config = {}

            # Load config_meta key-value pairs
            cursor = conn.execute('SELECT key, value, value_type FROM config_meta')
            for row in cursor:
                config[row['key']] = self._parse_value(row['value'], row['value_type'])

            # Load slots
            cursor = conn.execute('''
                SELECT slot, ip, type, channel, extended_id, extended_name, chan_name_raw
                FROM slots ORDER BY slot
            ''')
            slots = []
            for row in cursor:
                slot_dict = {
                    'slot': row['slot'],
                    'ip': row['ip'],
                    'type': row['type'],
                    'channel': row['channel']
                }
                if row['extended_id']:
                    slot_dict['extended_id'] = row['extended_id']
                if row['extended_name']:
                    slot_dict['extended_name'] = row['extended_name']
                if row['chan_name_raw']:
                    slot_dict['chan_name_raw'] = row['chan_name_raw']
                slots.append(slot_dict)
            config['slots'] = slots

            # Load groups
            cursor = conn.execute('''
                SELECT group_num, title, slots, hide_charts
                FROM groups ORDER BY group_num
            ''')
            groups = []
            for row in cursor:
                groups.append({
                    'group': row['group_num'],
                    'title': row['title'],
                    'slots': json.loads(row['slots']),
                    'hide_charts': bool(row['hide_charts'])
                })
            config['groups'] = groups

            # Load planning_center
            cursor = conn.execute('''
                SELECT enabled, app_id, secret, service_type_id,
                       position_mapping, auto_sync, last_sync, last_sync_status
                FROM planning_center WHERE id = 1
            ''')
            row = cursor.fetchone()
            if row:
                config['planning_center'] = {
                    'enabled': bool(row['enabled']),
                    'app_id': row['app_id'],
                    'secret': row['secret'],
                    'service_type_id': row['service_type_id'],
                    'position_mapping': json.loads(row['position_mapping']) if row['position_mapping'] else [],
                    'auto_sync': json.loads(row['auto_sync']) if row['auto_sync'] else {},
                    'last_sync': row['last_sync'],
                    'last_sync_status': row['last_sync_status']
                }

            return config

        finally:
            conn.close()

    def save_all(self, config: Dict[str, Any]):
        """
        Save entire config dict to database.
        Used for bulk updates or when config_tree is modified directly.
        """
        conn = self._get_connection()
        try:
            conn.execute('BEGIN IMMEDIATE')

            # Clear existing data
            conn.execute('DELETE FROM config_meta')
            conn.execute('DELETE FROM slots')
            conn.execute('DELETE FROM groups')
            conn.execute('DELETE FROM planning_center')

            # Save config_meta
            for key, value in config.items():
                if key in ('slots', 'groups', 'planning_center', 'micboard_version'):
                    continue

                value_type = self._get_value_type(value)
                stored_value = json.dumps(value) if value_type == 'json' else str(value)

                conn.execute('''
                    INSERT INTO config_meta (key, value, value_type)
                    VALUES (?, ?, ?)
                ''', (key, stored_value, value_type))

            # Save slots
            for slot_data in config.get('slots', []):
                conn.execute('''
                    INSERT INTO slots
                    (slot, ip, type, channel, extended_id, extended_name, chan_name_raw)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    slot_data['slot'],
                    slot_data['ip'],
                    slot_data['type'],
                    slot_data.get('channel', 1),
                    slot_data.get('extended_id'),
                    slot_data.get('extended_name'),
                    slot_data.get('chan_name_raw')
                ))

            # Save groups
            for group_data in config.get('groups', []):
                conn.execute('''
                    INSERT INTO groups (group_num, title, slots, hide_charts)
                    VALUES (?, ?, ?, ?)
                ''', (
                    group_data['group'],
                    group_data.get('title', ''),
                    json.dumps(group_data.get('slots', [])),
                    1 if group_data.get('hide_charts') else 0
                ))

            # Save planning_center
            pc = config.get('planning_center', {})
            if pc:
                conn.execute('''
                    INSERT INTO planning_center
                    (id, enabled, app_id, secret, service_type_id,
                     position_mapping, auto_sync, last_sync, last_sync_status)
                    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    1 if pc.get('enabled') else 0,
                    pc.get('app_id'),
                    pc.get('secret'),
                    pc.get('service_type_id'),
                    json.dumps(pc.get('position_mapping', [])),
                    json.dumps(pc.get('auto_sync', {})),
                    pc.get('last_sync'),
                    pc.get('last_sync_status')
                ))

            conn.commit()

        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def update_slot(self, slot_data: Dict[str, Any]):
        """Update a single slot configuration."""
        conn = self._get_connection()
        try:
            conn.execute('''
                INSERT OR REPLACE INTO slots
                (slot, ip, type, channel, extended_id, extended_name, chan_name_raw)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                slot_data['slot'],
                slot_data['ip'],
                slot_data['type'],
                slot_data.get('channel', 1),
                slot_data.get('extended_id'),
                slot_data.get('extended_name'),
                slot_data.get('chan_name_raw')
            ))
            conn.commit()
        finally:
            conn.close()

    def update_group(self, group_data: Dict[str, Any]):
        """Update a single group configuration."""
        conn = self._get_connection()
        try:
            conn.execute('''
                INSERT OR REPLACE INTO groups (group_num, title, slots, hide_charts)
                VALUES (?, ?, ?, ?)
            ''', (
                group_data['group'],
                group_data.get('title', ''),
                json.dumps(group_data.get('slots', [])),
                1 if group_data.get('hide_charts') else 0
            ))
            conn.commit()
        finally:
            conn.close()

    def update_planning_center(self, pc_data: Dict[str, Any]):
        """Update Planning Center configuration."""
        conn = self._get_connection()
        try:
            conn.execute('''
                INSERT OR REPLACE INTO planning_center
                (id, enabled, app_id, secret, service_type_id,
                 position_mapping, auto_sync, last_sync, last_sync_status)
                VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                1 if pc_data.get('enabled') else 0,
                pc_data.get('app_id'),
                pc_data.get('secret'),
                pc_data.get('service_type_id'),
                json.dumps(pc_data.get('position_mapping', [])),
                json.dumps(pc_data.get('auto_sync', {})),
                pc_data.get('last_sync'),
                pc_data.get('last_sync_status')
            ))
            conn.commit()
        finally:
            conn.close()

    def update_meta(self, key: str, value: Any):
        """Update a single config_meta key-value pair."""
        conn = self._get_connection()
        try:
            value_type = self._get_value_type(value)
            stored_value = json.dumps(value) if value_type == 'json' else str(value)

            conn.execute('''
                INSERT OR REPLACE INTO config_meta (key, value, value_type)
                VALUES (?, ?, ?)
            ''', (key, stored_value, value_type))
            conn.commit()
        finally:
            conn.close()

    def delete_slot(self, slot_num: int):
        """Delete a slot by number."""
        conn = self._get_connection()
        try:
            conn.execute('DELETE FROM slots WHERE slot = ?', (slot_num,))
            conn.commit()
        finally:
            conn.close()

    def delete_group(self, group_num: int):
        """Delete a group by number."""
        conn = self._get_connection()
        try:
            conn.execute('DELETE FROM groups WHERE group_num = ?', (group_num,))
            conn.commit()
        finally:
            conn.close()


# Global store instance (initialized in config.py)
_store: Optional[ConfigStore] = None


def get_store() -> ConfigStore:
    """Get the global ConfigStore instance."""
    if _store is None:
        raise RuntimeError("ConfigStore not initialized. Call init_store() first.")
    return _store


def init_store(db_path: str) -> ConfigStore:
    """Initialize the global ConfigStore instance."""
    global _store
    _store = ConfigStore(db_path)
    return _store
