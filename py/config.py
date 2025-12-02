import os
import sys
import json
import logging
import argparse
import uuid
import time
from shutil import copyfile

import shure
import offline
import tornado_server
import db

APPNAME = 'micboard'

CONFIG_FILE_NAME = 'config.json'
DB_FILE_NAME = 'micboard.db'

# Global ConfigStore instance
_config_store = None

FORMAT = '%(asctime)s %(levelname)s:%(message)s'

config_tree = {}

gif_dir = ''

group_update_list = []

args = {}

def uuid_init():
    if 'uuid' not in config_tree:
        micboard_uuid = str(uuid.uuid4())
        logging.info('Adding UUID: {} to config.conf'.format(micboard_uuid))
        config_tree['uuid'] = micboard_uuid
        save_current_config()


def logging_init():
    formatter = logging.Formatter(FORMAT)
    log = logging.getLogger()
    log.setLevel(logging.DEBUG)

    sthandler = logging.StreamHandler(sys.stdout)
    fhandler = logging.handlers.RotatingFileHandler(log_file(),
                                                    maxBytes=10*1024*1024,
                                                    backupCount=5)

    sthandler.setFormatter(formatter)
    fhandler.setFormatter(formatter)

    log.addHandler(sthandler)
    log.addHandler(fhandler)


def web_port():
    if args['server_port'] is not None:
        return int(args['server_port'])

    elif 'MICBOARD_PORT' in os.environ:
        return int(os.environ['MICBOARD_PORT'])

    return config_tree['port']


def os_config_path():
    path = os.getcwd()
    if sys.platform.startswith('linux'):
        path = os.getenv('XDG_DATA_HOME', os.path.expanduser("~/.local/share"))
    elif sys.platform == 'win32':
        path = os.getenv('LOCALAPPDATA')
    elif sys.platform == 'darwin':
        path = os.path.expanduser('~/Library/Application Support/')
    return path


def config_path(folder=None):
    if args['config_path'] is not None:
        if os.path.exists(os.path.expanduser(args['config_path'])):
            path = os.path.expanduser(args['config_path'])
        else:
            logging.warning("Invalid config path")
            sys.exit()

    else:
        path = os.path.join(os_config_path(), APPNAME)
        if not os.path.exists(path):
            os.makedirs(path)

    if folder:
        return os.path.join(path, folder)
    return path

def log_file():
    return config_path('micboard.log')

# https://stackoverflow.com/questions/404744/determining-application-path-in-a-python-exe-generated-by-pyinstaller
def app_dir(folder=None):
    if getattr(sys, 'frozen', False):
        application_path = sys._MEIPASS
        return os.path.join(application_path, folder)

    if __file__:
        application_path = os.path.dirname(__file__)

    return os.path.join(os.path.dirname(application_path), folder)


def default_gif_dir():
    path = config_path('backgrounds')
    if not os.path.exists(path):
        os.makedirs(path)
    print("GIFCHECK!")
    return path

def get_gif_dir():
    if args['background_directory'] is not None:
        if os.path.exists(os.path.expanduser(args['background_directory'])):
            return os.path.expanduser(args['background_directory'])
        else:
            logging.warning("invalid config path")
            sys.exit()

    if config_tree.get('background-folder'):
        return os.path.expanduser(config_tree.get('background-folder'))
    return default_gif_dir()

def config_file():
    if os.path.exists(app_dir(CONFIG_FILE_NAME)):
        return app_dir(CONFIG_FILE_NAME)
    elif os.path.exists(config_path(CONFIG_FILE_NAME)):
        return config_path(CONFIG_FILE_NAME)
    else:
        copyfile(app_dir('democonfig.json'), config_path(CONFIG_FILE_NAME))
        return config_path(CONFIG_FILE_NAME)

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('-f', '--config-path', help='configuration directory')
    parser.add_argument('-p', '--server-port', help='server port')
    parser.add_argument('-b', '--background-directory', help='background directory')
    args,_ = parser.parse_known_args()

    return vars(args)


def db_file():
    """Return path to SQLite database file."""
    return config_path(DB_FILE_NAME)


def json_config_exists():
    """Check if a JSON config file exists (for migration)."""
    try:
        # Check app dir first (bundled config)
        if os.path.exists(app_dir(CONFIG_FILE_NAME)):
            return app_dir(CONFIG_FILE_NAME)
        # Check user config path
        elif os.path.exists(config_path(CONFIG_FILE_NAME)):
            return config_path(CONFIG_FILE_NAME)
    except Exception:
        pass
    return None


def config():
    global args
    global config_tree
    global gif_dir
    global _config_store

    args = parse_args()
    logging_init()

    # Initialize SQLite store
    db_path = db_file()
    _config_store = db.init_store(db_path)

    # Check if migration from JSON is needed
    json_path = json_config_exists()
    pre_sqlite_path = config_path(CONFIG_FILE_NAME + '.pre-sqlite')

    if not _config_store.is_migrated():
        if json_path:
            logging.info(f"Migrating config from {json_path} to SQLite...")
            if _config_store.migrate_from_json(json_path):
                # Rename old file to prevent re-migration
                backup_path = json_path + '.pre-sqlite'
                os.rename(json_path, backup_path)
                logging.info(f"Migration complete. Original config backed up to {backup_path}")
            else:
                logging.error("Migration failed, falling back to demo config")
                _load_demo_config()
        elif os.path.exists(pre_sqlite_path):
            # Re-migrate from backup if DB was deleted
            logging.info(f"Re-migrating from backup {pre_sqlite_path}...")
            _config_store.migrate_from_json(pre_sqlite_path)
        else:
            # Fresh install - load demo config
            logging.info("No existing config found, loading demo config")
            _load_demo_config()

    # Run integrity check
    if not _config_store.integrity_check():
        logging.error("Database integrity check failed!")
        # Try to recover from backup
        if os.path.exists(pre_sqlite_path):
            logging.info("Attempting recovery from JSON backup...")
            os.remove(db_path)
            _config_store = db.init_store(db_path)
            _config_store.migrate_from_json(pre_sqlite_path)

    # Load config into memory
    config_tree = _config_store.get_all()

    # Initialize network devices from config
    _init_devices_from_config()

    uuid_init()
    gif_dir = get_gif_dir()
    config_tree['micboard_version'] = get_version_number()

    logging.info('Starting Micboard {}'.format(config_tree['micboard_version']))


def _load_demo_config():
    """Load demo config into SQLite database."""
    demo_path = app_dir('democonfig.json')
    if os.path.exists(demo_path):
        _config_store.migrate_from_json(demo_path)
    else:
        logging.error("Demo config not found!")


def _init_devices_from_config():
    """Initialize network devices from config_tree slots."""
    for chan in config_tree.get('slots', []):
        if chan['type'] in ['uhfr', 'qlxd', 'ulxd', 'axtd', 'p10t']:
            netDev = shure.check_add_network_device(chan['ip'], chan['type'])
            netDev.add_channel_device(chan)
        elif chan['type'] == 'offline':
            offline.add_device(chan)

def reconfig(slots):
    tornado_server.SocketHandler.close_all_ws()

    config_tree['slots'] = slots
    save_current_config()

    config_tree.clear()
    for device in shure.NetworkDevices:
        # device.socket_disconnect()
        device.disable_metering()
        del device.channels[:]

    del shure.NetworkDevices[:]
    del offline.OfflineDevices[:]

    time.sleep(2)

    config()
    for rx in shure.NetworkDevices:
        rx.socket_connect()

def get_version_number():
    with open(app_dir('package.json')) as package:
        pkginfo = json.load(package)

    return pkginfo['version']

def read_json_config(file):
    global config_tree
    global gif_dir
    with open(file) as config_file:
        config_tree = json.load(config_file)

        for chan in config_tree['slots']:
            if chan['type'] in ['uhfr', 'qlxd', 'ulxd', 'axtd', 'p10t']:
                netDev = shure.check_add_network_device(chan['ip'], chan['type'])
                netDev.add_channel_device(chan)

            elif chan['type'] == 'offline':
                offline.add_device(chan)


    gif_dir = get_gif_dir()
    config_tree['micboard_version'] = get_version_number()

def save_current_config():
    """Save entire config_tree to SQLite database."""
    if _config_store is None:
        logging.warning("ConfigStore not initialized, cannot save config")
        return
    _config_store.save_all(config_tree)


def update_planning_center_config(pc_data):
    """Update Planning Center configuration in both memory and SQLite."""
    config_tree['planning_center'] = pc_data
    if _config_store is not None:
        _config_store.update_planning_center(pc_data)
    else:
        logging.warning("ConfigStore not initialized, Planning Center config not persisted")

def get_group_by_number(group_number):
    for group in config_tree['groups']:
        if group['group'] == int(group_number):
            return group
    return None

def update_group(data):
    """Update a group in both memory and SQLite."""
    group_update_list.append(data)
    group = get_group_by_number(data['group'])
    if not group:
        group = {}
        group['group'] = data['group']
        config_tree['groups'].append(group)

    group['slots'] = data['slots']
    group['title'] = data['title']
    group['hide_charts'] = data['hide_charts']

    # Save to SQLite (granular update)
    if _config_store is not None:
        _config_store.update_group(data)
    else:
        logging.warning("ConfigStore not initialized, group update not persisted")

def get_slot_by_number(slot_number):
    for slot in config_tree['slots']:
        if slot['slot'] == slot_number:
            return slot
    return None

def update_slot(data):
    """Update a slot's extended fields in both memory and SQLite."""
    slot_cfg = get_slot_by_number(data['slot'])
    if not slot_cfg:
        logging.warning(f"Slot {data['slot']} not found")
        return

    save_name = False

    if data.get('extended_id'):
        slot_cfg['extended_id'] = data['extended_id']
        save_name = True
    elif 'extended_id' in slot_cfg:
        slot_cfg.pop('extended_id', None)

    if data.get('extended_name'):
        slot_cfg['extended_name'] = data['extended_name']
        save_name = True
    elif 'extended_name' in slot_cfg:
        slot_cfg.pop('extended_name', None)

    if save_name:
        try:
            slot_cfg['chan_name_raw'] = shure.get_network_device_by_slot(data['slot']).chan_name_raw
        except Exception:
            pass

    elif 'chan_name_raw' in slot_cfg:
        slot_cfg.pop('chan_name_raw')

    # Save to SQLite (granular update)
    if _config_store is not None:
        _config_store.update_slot(slot_cfg)
    else:
        logging.warning("ConfigStore not initialized, slot update not persisted")
