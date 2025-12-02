#!/usr/bin/env python3
"""Shure QLXD receiver simulator for micboard development.

Simulates all metrics that micboard can display from a Shure QLXD receiver:
- Channel name, frequency, battery bars, battery runtime
- TX offset, RF antenna diversity, audio/RF levels
- Real-time SAMPLE messages with realistic variation
"""

import asyncio
import os
import random
import time

# Realistic UHF frequencies for Shure wireless (G50 band: 470-534 MHz)
FREQUENCIES = [
    '470125', '476250', '482375', '488500', '494625',
    '500750', '506875', '513000', '519125', '525250',
]

# Transmitter types
TX_TYPES = ['QLXD1', 'QLXD2', 'ULXD1', 'ULXD2']

# Channel name presets
CHANNEL_NAMES = [
    'Pastor', 'Worship', 'Backup', 'Guest',
    'Choir L', 'Choir R', 'Podium', 'Lectern',
    'HH-1', 'HH-2', 'LAV-1', 'LAV-2',
]


def generate_default_state(channel: int) -> dict:
    """Generate default state for a channel with realistic values."""
    return {
        # Channel identification
        'CHAN_NAME': CHANNEL_NAMES[(channel - 1) % len(CHANNEL_NAMES)],
        'FREQUENCY': FREQUENCIES[(channel - 1) % len(FREQUENCIES)],
        'GROUP_CHAN': f'{channel:02d},01',

        # Battery metrics
        'BATT_BARS': '005',        # 0-5 bars (5 = full)
        'BATT_CHARGE': '100',      # Percentage
        'BATT_CYCLE': '050',       # Cycle count
        'BATT_HEALTH': '100',      # Health percentage
        'BATT_RUN_TIME': '480',    # Minutes remaining (8 hours)
        'BATT_TEMP_C': '025',      # Temperature Celsius
        'BATT_TEMP_F': '077',      # Temperature Fahrenheit
        'BATT_TYPE': 'LION',       # Battery type

        # RF metrics
        'RF_ANTENNA': 'AB',        # AB, AX, XB, XX
        'RF_INT_DET': 'NONE',      # Interference detection
        'RX_RF_LVL': '080',        # RF level at receiver (0-115)
        'AUDIO_LVL': '000',        # Audio level (0-50)

        # Transmitter info
        'TX_TYPE': random.choice(TX_TYPES),
        'TX_OFFSET': f'{random.randint(0, 21):03d}',  # 0-21 dB
        'TX_RF_PWR': random.choice(['LOW', 'NORMAL', 'HIGH']),
        'TX_MUTE_STATUS': 'OFF',
        'TX_LOCK': 'OFF',
        'TX_MENU_LOCK': 'OFF',
        'TX_PWR_LOCK': 'OFF',

        # Encryption
        'ENCRYPTION': 'OFF',
        'ENCRYPTION_STATUS': 'OK',

        # Device info
        'FW_VER': '2.4.23',
        'DEVICE_ID': f'QLXD-SIM-{channel}',

        # Audio settings
        'AUDIO_GAIN': '000',
        'AUDIO_MUTE': 'OFF',
        'AUDIO_OUT_LVL_SW': 'MIC',  # MIC or LINE
    }


class ChannelState:
    """Manages state for a single channel with realistic simulation."""

    def __init__(self, channel: int, start_time: float):
        self.channel = channel
        self.start_time = start_time
        self.state = generate_default_state(channel)

        # Simulation state
        self.is_active = random.choice([True, True, True, False])  # 75% active
        self.audio_activity = random.uniform(0.3, 0.8)  # Base activity level
        self.rf_base = random.randint(70, 100)  # Base RF level
        self.battery_start = random.randint(3, 5)  # Starting battery bars
        self.state['BATT_BARS'] = f'{self.battery_start:03d}'
        self.runtime_minutes = random.randint(120, 480)  # 2-8 hours
        self.state['BATT_RUN_TIME'] = f'{self.runtime_minutes:05d}'

        # Antenna diversity simulation
        self.antenna_states = ['AB', 'AB', 'AB', 'AX', 'XB']  # Mostly AB
        self.current_antenna = 'AB'

    def update_battery(self, elapsed_seconds: float) -> None:
        """Simulate battery drain over time."""
        # Drain 1 bar every 2 hours (7200 seconds)
        bars_drained = int(elapsed_seconds / 7200)
        current_bars = max(0, self.battery_start - bars_drained)
        self.state['BATT_BARS'] = f'{current_bars:03d}'

        # Update runtime (decrease by elapsed minutes)
        elapsed_minutes = int(elapsed_seconds / 60)
        remaining = max(0, self.runtime_minutes - elapsed_minutes)
        self.state['BATT_RUN_TIME'] = f'{remaining:05d}'

        # Update charge percentage
        charge = int(100 * current_bars / 5)
        self.state['BATT_CHARGE'] = f'{charge:03d}'

    def get_sample_values(self) -> tuple[str, int, int]:
        """Generate realistic SAMPLE values (antenna, rf, audio)."""
        # Antenna diversity - occasionally switch
        if random.random() < 0.05:  # 5% chance to switch
            self.current_antenna = random.choice(self.antenna_states)

        # RF level - varies slightly around base
        rf_variation = random.randint(-10, 5)
        rf_level = max(20, min(115, self.rf_base + rf_variation))

        # Audio level - depends on activity
        if self.is_active:
            # Active channel: varies between silence and peaks
            if random.random() < self.audio_activity:
                audio_level = random.randint(10, 45)  # Speaking
            else:
                audio_level = random.randint(0, 5)  # Pause
        else:
            # Inactive: mostly silence with occasional noise
            audio_level = random.randint(0, 3)

        return self.current_antenna, rf_level, audio_level


class ShureSimulator:
    """Simulates a Shure QLXD receiver with multiple channels."""

    def __init__(self, device_id: str, channels: int = 4):
        self.device_id = device_id
        self.num_channels = channels
        self.start_time = time.time()

        # Initialize channel states
        self.channels: dict[int, ChannelState] = {
            ch: ChannelState(ch, self.start_time)
            for ch in range(1, channels + 1)
        }

        # Meter rate per channel (0 = disabled, else ms interval)
        self.meter_rate: dict[int, int] = {ch: 0 for ch in range(1, channels + 1)}

        # Track active metering tasks per client
        self.metering_tasks: dict[asyncio.StreamWriter, dict[int, asyncio.Task]] = {}

    def get_state(self, channel: int) -> dict:
        """Get current state for a channel, updating time-based values."""
        if channel not in self.channels:
            return {}

        ch_state = self.channels[channel]
        elapsed = time.time() - self.start_time
        ch_state.update_battery(elapsed)

        return ch_state.state

    def process_command(self, cmd: str) -> tuple[str | None, int | None, int | None]:
        """Parse < GET/SET > command, return (response, channel, meter_rate).

        meter_rate is set when METER_RATE is changed (0 to stop, >0 to start).
        """
        cmd = cmd.strip('<> \r\n')
        parts = cmd.split()

        if len(parts) < 3:
            return None, None, None

        action, channel_str, param = parts[0], parts[1], parts[2]

        try:
            channel = int(channel_str)
        except ValueError:
            return None, None, None

        if channel < 1 or channel > self.num_channels:
            return None, None, None

        state = self.get_state(channel)

        if action == 'GET':
            if param == 'ALL':
                # Return all params for channel - no newlines between messages
                # Micboard splits on '>' so messages must be concatenated
                responses = []
                for key, value in state.items():
                    responses.append(f'< REP {channel} {key} {value} >')
                return ''.join(responses), None, None
            elif param in state:
                value = state[param]
                return f'< REP {channel} {param} {value} >', None, None

        elif action == 'SET':
            if len(parts) >= 4:
                value = ' '.join(parts[3:])

                # Handle METER_RATE specially
                if param == 'METER_RATE':
                    try:
                        rate = int(value)
                        self.meter_rate[channel] = rate
                        return f'< REP {channel} {param} {value} >', channel, rate
                    except ValueError:
                        return None, None, None

                # Update state for other SET commands
                if channel in self.channels:
                    self.channels[channel].state[param] = value
                return f'< REP {channel} {param} {value} >', None, None

        return None, None, None

    def generate_sample(self, channel: int) -> str:
        """Generate a SAMPLE message for the given channel.

        Format: < SAMPLE {ch} ALL {antenna} {rf_level:03d} {audio_level:03d} >
        """
        if channel not in self.channels:
            return f'< SAMPLE {channel} ALL XX 000 000 >'

        antenna, rf_level, audio_level = self.channels[channel].get_sample_values()
        return f'< SAMPLE {channel} ALL {antenna} {rf_level:03d} {audio_level:03d} >'

    async def meter_loop(
        self,
        writer: asyncio.StreamWriter,
        channel: int,
        interval_ms: int
    ) -> None:
        """Send SAMPLE messages at the specified interval."""
        interval_sec = interval_ms / 1000.0
        try:
            while True:
                await asyncio.sleep(interval_sec)
                if self.meter_rate[channel] == 0:
                    break
                sample = self.generate_sample(channel)
                writer.write(sample.encode() + b'\n')
                await writer.drain()
        except (ConnectionResetError, BrokenPipeError):
            pass
        except asyncio.CancelledError:
            pass

    def start_metering(
        self,
        writer: asyncio.StreamWriter,
        channel: int,
        rate: int
    ) -> None:
        """Start or stop metering for a channel."""
        # Initialize task list for this writer if needed
        if writer not in self.metering_tasks:
            self.metering_tasks[writer] = {}

        # Cancel existing task for this channel if any
        if channel in self.metering_tasks[writer]:
            self.metering_tasks[writer][channel].cancel()
            del self.metering_tasks[writer][channel]

        # Start new metering task if rate > 0
        if rate > 0:
            task = asyncio.create_task(self.meter_loop(writer, channel, rate))
            self.metering_tasks[writer][channel] = task

    def stop_all_metering(self, writer: asyncio.StreamWriter) -> None:
        """Stop all metering tasks for a client."""
        if writer in self.metering_tasks:
            for task in self.metering_tasks[writer].values():
                task.cancel()
            del self.metering_tasks[writer]

    async def handle_client(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter
    ) -> None:
        """Handle TCP client connection."""
        addr = writer.get_extra_info('peername')
        print(f'{self.device_id}: Client connected from {addr}')

        try:
            while True:
                data = await reader.read(1024)
                if not data:
                    break

                for cmd in data.decode().split('>'):
                    cmd = cmd.strip()
                    if cmd:
                        response, channel, meter_rate = self.process_command(cmd + '>')
                        if response:
                            writer.write(response.encode() + b'\n')
                            await writer.drain()
                        # Handle metering rate changes
                        if meter_rate is not None and channel is not None:
                            self.start_metering(writer, channel, meter_rate)
        except Exception as e:
            print(f'{self.device_id}: Error: {e}')
        finally:
            print(f'{self.device_id}: Client disconnected')
            self.stop_all_metering(writer)
            writer.close()
            await writer.wait_closed()

    async def start(self, port: int = 2202) -> None:
        """Start TCP server."""
        server = await asyncio.start_server(
            self.handle_client, '0.0.0.0', port
        )
        print(f'{self.device_id}: Listening on port {port}')
        print(f'{self.device_id}: Simulating {self.num_channels} channels')
        async with server:
            await server.serve_forever()


async def main() -> None:
    device_id = os.environ.get('DEVICE_ID', 'QLXD-SIM')
    channels = int(os.environ.get('CHANNELS', '4'))
    port = int(os.environ.get('PORT', '2202'))

    simulator = ShureSimulator(device_id, channels)
    await simulator.start(port)


if __name__ == '__main__':
    asyncio.run(main())
