"""
Planning Center Services integration for Micboard
Handles authentication, fetching service plans, and syncing team member assignments
"""

import json
import logging
from datetime import datetime, date
from typing import Optional

import config

log = logging.getLogger(__name__)

# Mock mode for development without real API credentials
MOCK_MODE = True


class MockPCO:
    """Mock Planning Center API client for development/testing"""

    def get(self, endpoint: str) -> dict:
        """Mock GET request"""
        if '/services/v2' in endpoint and 'service_types' not in endpoint:
            return {
                'data': {
                    'type': 'Organization',
                    'id': '12345',
                    'attributes': {
                        'name': 'Demo Church'
                    }
                }
            }
        return {'data': {}}

    def iterate(self, endpoint: str, **kwargs) -> list:
        """Mock iteration over paginated results"""
        if 'service_types' in endpoint and 'plans' not in endpoint:
            return [
                {
                    'data': {
                        'type': 'ServiceType',
                        'id': '100001',
                        'attributes': {
                            'name': 'Sunday Morning Service'
                        }
                    }
                },
                {
                    'data': {
                        'type': 'ServiceType',
                        'id': '100002',
                        'attributes': {
                            'name': 'Wednesday Evening Service'
                        }
                    }
                }
            ]
        elif 'plans' in endpoint and 'team_members' not in endpoint:
            # Return a plan for today
            today = date.today().strftime('%B %d, %Y')
            return [
                {
                    'data': {
                        'type': 'Plan',
                        'id': '200001',
                        'attributes': {
                            'title': 'Sunday Service',
                            'dates': today,
                            'sort_date': date.today().isoformat()
                        }
                    }
                }
            ]
        elif 'team_members' in endpoint:
            # Return mock team member assignments
            return [
                {
                    'data': {
                        'type': 'PlanPerson',
                        'id': '300001',
                        'attributes': {
                            'name': 'Tyler Smith',
                            'team_position_name': 'Worship Leader - Red Mic'
                        }
                    }
                },
                {
                    'data': {
                        'type': 'PlanPerson',
                        'id': '300002',
                        'attributes': {
                            'name': 'Sarah Johnson',
                            'team_position_name': 'Vocalist - Blue Mic'
                        }
                    }
                },
                {
                    'data': {
                        'type': 'PlanPerson',
                        'id': '300003',
                        'attributes': {
                            'name': 'Mike Davis',
                            'team_position_name': 'Acoustic Guitar - Green Mic'
                        }
                    }
                },
                {
                    'data': {
                        'type': 'PlanPerson',
                        'id': '300004',
                        'attributes': {
                            'name': 'Emily Chen',
                            'team_position_name': 'Keys - Yellow Mic'
                        }
                    }
                }
            ]
        return []


class PlanningCenterClient:
    """Client for Planning Center Services API"""

    def __init__(self, app_id: str, secret: str, use_mock: bool = MOCK_MODE):
        self.app_id = app_id
        self.secret = secret
        self.use_mock = use_mock

        if use_mock:
            self.pco = MockPCO()
            log.info("Planning Center client initialized in MOCK mode")
        else:
            try:
                import pypco
                self.pco = pypco.PCO(app_id, secret)
                log.info("Planning Center client initialized with real API")
            except ImportError:
                log.warning("pypco not installed, falling back to mock mode")
                self.pco = MockPCO()
                self.use_mock = True

    def test_connection(self) -> dict:
        """Test API connection and return organization info"""
        try:
            result = self.pco.get('/services/v2')
            return {
                'success': True,
                'data': result,
                'mock_mode': self.use_mock
            }
        except Exception as e:
            log.error(f"Planning Center connection test failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'mock_mode': self.use_mock
            }

    def get_service_types(self) -> list:
        """Fetch all service types"""
        try:
            return list(self.pco.iterate('/services/v2/service_types'))
        except Exception as e:
            log.error(f"Failed to fetch service types: {e}")
            return []

    def get_todays_plan(self, service_type_id: str) -> Optional[dict]:
        """Fetch plan for today's date"""
        try:
            today = date.today().isoformat()
            today_formatted = date.today().strftime('%B %d, %Y')

            plans = self.pco.iterate(
                f'/services/v2/service_types/{service_type_id}/plans',
                filter='future',
                order='sort_date'
            )

            for plan in plans:
                plan_dates = plan['data']['attributes'].get('dates', '')
                # Check if today's date is in the plan dates string
                if today in plan_dates or today_formatted in plan_dates:
                    log.info(f"Found plan for today: {plan['data']['id']}")
                    return plan

            log.info(f"No plan found for today ({today})")
            return None
        except Exception as e:
            log.error(f"Failed to fetch today's plan: {e}")
            return None

    def get_team_members(self, service_type_id: str, plan_id: str) -> list:
        """Fetch team members for a plan"""
        try:
            return list(self.pco.iterate(
                f'/services/v2/service_types/{service_type_id}/plans/{plan_id}/team_members',
                include='person'
            ))
        except Exception as e:
            log.error(f"Failed to fetch team members: {e}")
            return []


def get_planning_center_config() -> dict:
    """Get Planning Center configuration from config tree"""
    return config.config_tree.get('planning_center', {
        'enabled': False,
        'app_id': '',
        'secret': '',
        'service_type_id': '',
        'position_mapping': [],
        'auto_sync': {
            'enabled': False,
            'schedule': [
                {'day': 'sunday', 'time': '06:00'},
                {'day': 'wednesday', 'time': '06:00'}
            ]
        },
        'last_sync': None,
        'last_sync_status': None
    })


def save_planning_center_config(pc_config: dict) -> None:
    """Save Planning Center configuration to config tree and SQLite"""
    config.update_planning_center_config(pc_config)


def sync_assignments() -> dict:
    """
    Sync Planning Center assignments to Micboard slots.

    Returns:
        dict with 'success', 'updated_count', 'errors', 'message' keys
    """
    pc_config = get_planning_center_config()

    if not pc_config.get('enabled'):
        return {
            'success': False,
            'error': 'Planning Center integration disabled',
            'updated_count': 0
        }

    app_id = pc_config.get('app_id', '')
    secret = pc_config.get('secret', '')

    if not app_id or not secret:
        return {
            'success': False,
            'error': 'No credentials configured',
            'updated_count': 0
        }

    # Create client (use mock mode for development)
    client = PlanningCenterClient(app_id, secret)

    # Fetch today's plan
    service_type_id = pc_config.get('service_type_id')
    if not service_type_id:
        return {
            'success': False,
            'error': 'No service type configured',
            'updated_count': 0
        }

    plan = client.get_todays_plan(service_type_id)

    if not plan:
        return {
            'success': True,
            'updated_count': 0,
            'message': 'No plan found for today'
        }

    # Fetch team members
    plan_id = plan['data']['id']
    team_members = client.get_team_members(service_type_id, plan_id)

    if not team_members:
        return {
            'success': True,
            'updated_count': 0,
            'message': 'No team members found for today\'s plan'
        }

    # Build position mapping lookup (case-insensitive, partial match)
    position_mapping = {}
    for mapping in pc_config.get('position_mapping', []):
        position = mapping.get('position', '').lower().strip()
        slot = mapping.get('slot')
        if position and slot:
            position_mapping[position] = slot

    if not position_mapping:
        return {
            'success': False,
            'error': 'No position mappings configured',
            'updated_count': 0
        }

    updates = []
    errors = []
    matched_positions = []

    for member in team_members:
        attrs = member['data']['attributes']
        position = attrs.get('team_position_name', '').lower()
        name = attrs.get('name', '')

        if not position or not name:
            continue

        # Find matching slot using partial match
        matched_slot = None
        for mapped_position, slot in position_mapping.items():
            if mapped_position in position:
                matched_slot = slot
                matched_positions.append(f"{name} -> Slot {slot} ({mapped_position})")
                break

        if matched_slot:
            updates.append({
                'slot': matched_slot,
                'extended_name': name
            })

    # Apply updates via existing slot API
    for update in updates:
        try:
            config.update_slot(update)
            log.info(f"Updated slot {update['slot']} with name: {update['extended_name']}")
        except Exception as e:
            error_msg = f"Slot {update['slot']}: {e}"
            errors.append(error_msg)
            log.error(f"Failed to update slot: {error_msg}")

    # Update last sync timestamp
    pc_config['last_sync'] = datetime.now().isoformat()
    pc_config['last_sync_status'] = 'success' if not errors else 'partial'
    save_planning_center_config(pc_config)

    result = {
        'success': len(errors) == 0,
        'updated_count': len(updates) - len(errors),
        'total_team_members': len(team_members),
        'matched_positions': matched_positions,
        'errors': errors
    }

    if errors:
        result['message'] = f"Sync completed with {len(errors)} error(s)"
    else:
        result['message'] = f"Successfully synced {result['updated_count']} assignment(s)"

    log.info(f"Planning Center sync result: {result['message']}")
    return result


# Auto-sync scheduler using Tornado's PeriodicCallback
_auto_sync_callbacks = []


def setup_auto_sync(ioloop):
    """
    Set up auto-sync using Tornado's PeriodicCallback.
    Called from tornado_server.py during initialization.
    """
    global _auto_sync_callbacks

    # Clear any existing callbacks
    for callback in _auto_sync_callbacks:
        callback.stop()
    _auto_sync_callbacks.clear()

    pc_config = get_planning_center_config()

    if not pc_config.get('auto_sync', {}).get('enabled'):
        log.info("Planning Center auto-sync is disabled")
        return

    # For now, we'll use a simple hourly check that runs the sync
    # if we're on the right day and near the right time
    from tornado.ioloop import PeriodicCallback

    def check_and_sync():
        """Check if it's time to sync and run if needed"""
        pc_config = get_planning_center_config()
        if not pc_config.get('enabled'):
            return

        schedule = pc_config.get('auto_sync', {}).get('schedule', [])
        now = datetime.now()
        current_day = now.strftime('%A').lower()
        current_time = now.strftime('%H:%M')

        for entry in schedule:
            sync_day = entry.get('day', '').lower()
            sync_time = entry.get('time', '')

            # Check if it's the right day
            if current_day != sync_day:
                continue

            # Check if we're within 5 minutes of sync time
            if sync_time:
                sync_hour, sync_minute = map(int, sync_time.split(':'))
                if now.hour == sync_hour and abs(now.minute - sync_minute) <= 5:
                    # Check if we haven't synced in the last hour
                    last_sync = pc_config.get('last_sync')
                    if last_sync:
                        last_sync_time = datetime.fromisoformat(last_sync)
                        if (now - last_sync_time).total_seconds() < 3600:
                            log.debug("Skipping auto-sync, already synced within the hour")
                            return

                    log.info(f"Running scheduled Planning Center sync for {sync_day} {sync_time}")
                    result = sync_assignments()
                    log.info(f"Auto-sync result: {result.get('message', 'Unknown')}")

    # Check every 5 minutes
    callback = PeriodicCallback(check_and_sync, 5 * 60 * 1000)
    callback.start()
    _auto_sync_callbacks.append(callback)
    log.info("Planning Center auto-sync scheduler started (checking every 5 minutes)")
