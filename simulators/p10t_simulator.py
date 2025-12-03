#!/usr/bin/env python3
"""PSM1000 (P10T) IEM Transmitter Simulator for micboard development.

Simulates Shure PSM1000 in-ear monitor transmitters for development testing.
Key differences from QLXD receiver simulator:
- Uses REP messages for audio metering (not SAMPLE)
- Stereo audio levels (LEFT/RIGHT)
- No battery or RF metrics
- 2 channels per device (PSM1KTx)
"""

import asyncio
import os
import random
import time

# Realistic UHF frequencies for Shure PSM1000 (G50 band: 470-534 MHz)
FREQUENCIES = [
    '518000', '520250', '522500', '524750', '527000',
    '529250', '531500', '533750', '536000', '538250',
]

# Channel name presets for IEM
CHANNEL_NAMES = [
    'IEM 1', 'IEM 2', 'IEM 3', 'IEM 4',
    'Drums', 'Bass', 'Keys', 'Guitar',
    'Lead Vox', 'BGV 1', 'BGV 2', 'MD',
]


def generate_default_state(channel: int) -> dict:
    """Generate default state for a P10T channel."""
    return {
        'CHAN_NAME': CHANNEL_NAMES[(channel - 1) % len(CHANNEL_NAMES)],
        'FREQUENCY': FREQUENCIES[(channel - 1) % len(FREQUENCIES)],
        'TX_OFFSET': '000',
        'AUDIO_IN_LVL_L': '0',
        'AUDIO_IN_LVL_R': '0',
    }


class ChannelState:
    """Manages state for a single P10T channel with realistic simulation."""

    def __init__(self, channel: int):
        self.channel = channel
        self.state = generate_default_state(channel)

        # Simulation patterns
        self.activity_pattern = random.choice(['active', 'active', 'intermittent', 'silent'])
        self.base_level = random.randint(200000, 1500000)

    def generate_audio_levels(self) -> tuple[int, int]:
        """Generate realistic stereo audio levels based on activity pattern.

        Audio level thresholds from iem.py:
        - < 10272: 0
        - 10272-23728: 10
        - 23728-85488: 20
        - 85488-246260: 30
        - 246260-641928: 40
        - 641928-1588744: 50
        - 1588744-2157767: 60
        - 2157767-2502970: 70
        - > 2502970: 80
        """
        if self.activity_pattern == 'silent':
            # Below threshold - silence
            left = random.randint(0, 5000)
            right = random.randint(0, 5000)
        elif self.activity_pattern == 'intermittent':
            # 30% silence, 70% audio
            if random.random() < 0.3:
                left = random.randint(0, 10000)
                right = random.randint(0, 10000)
            else:
                left = random.randint(200000, 2000000)
                right = random.randint(200000, 2000000)
        else:
            # Active - correlated stereo levels with variation
            base = random.randint(200000, 2000000)
            variance = int(base * 0.15)  # 15% L/R variance

            left = max(0, base + random.randint(-variance, variance))
            right = max(0, base + random.randint(-variance, variance))

            # Occasional peaks
            if random.random() < 0.1:
                peak_factor = random.uniform(1.2, 1.8)
                left = int(left * peak_factor)
                right = int(right * peak_factor)

        self.state['AUDIO_IN_LVL_L'] = str(left)
        self.state['AUDIO_IN_LVL_R'] = str(right)
        return left, right


class P10TSimulator:
    """Simulates a Shure PSM1000 IEM transmitter with multiple channels."""

    def __init__(self, device_id: str, channels: int = 2):
        self.device_id = device_id
        self.num_channels = channels

        # Initialize channel states
        self.channels: dict[int, ChannelState] = {
            ch: ChannelState(ch)
            for ch in range(1, channels + 1)
        }

        # Meter rate per channel (0 = disabled, else ms interval)
        self.meter_rate: dict[int, int] = {ch: 0 for ch in range(1, channels + 1)}

        # Track active metering tasks per client
        self.metering_tasks: dict[asyncio.StreamWriter, dict[int, asyncio.Task]] = {}

    def get_state(self, channel: int) -> dict:
        """Get current state for a channel."""
        if channel not in self.channels:
            return {}
        return self.channels[channel].state

    def process_command(self, cmd: str) -> tuple[str | None, int | None, int | None]:
        """Parse < GET/SET > command, return (response, channel, meter_rate).

        For P10T, all metering uses REP messages (not SAMPLE).
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
                # Update audio levels before returning
                self.channels[channel].generate_audio_levels()
                state = self.get_state(channel)
                # Return all params - no newlines between messages
                responses = []
                for key, value in state.items():
                    responses.append(f'< REP {channel} {key} {value} >')
                return ''.join(responses), None, None
            elif param in state:
                # Update audio levels if requested
                if param in ('AUDIO_IN_LVL_L', 'AUDIO_IN_LVL_R'):
                    self.channels[channel].generate_audio_levels()
                    state = self.get_state(channel)
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
                if param in state:
                    self.channels[channel].state[param] = value
                return f'< REP {channel} {param} {value} >', None, None

        return None, None, None

    def generate_meter_messages(self, channel: int) -> str:
        """Generate REP messages for audio metering.

        P10T sends separate REP messages for L and R channels.
        """
        if channel not in self.channels:
            return ''

        left, right = self.channels[channel].generate_audio_levels()
        return (
            f'< REP {channel} AUDIO_IN_LVL_L {left} >'
            f'< REP {channel} AUDIO_IN_LVL_R {right} >'
        )

    async def meter_loop(
        self,
        writer: asyncio.StreamWriter,
        channel: int,
        interval_ms: int
    ) -> None:
        """Send audio level REP messages at the specified interval."""
        interval_sec = interval_ms / 1000.0
        try:
            while True:
                await asyncio.sleep(interval_sec)
                if self.meter_rate[channel] == 0:
                    break
                messages = self.generate_meter_messages(channel)
                writer.write(messages.encode() + b'\n')
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
        print(f'{self.device_id}: P10T IEM Simulator listening on port {port}')
        print(f'{self.device_id}: Simulating {self.num_channels} channels')
        async with server:
            await server.serve_forever()


async def main() -> None:
    device_id = os.environ.get('DEVICE_ID', 'P10T-SIM')
    channels = int(os.environ.get('CHANNELS', '2'))
    port = int(os.environ.get('PORT', '2202'))

    simulator = P10TSimulator(device_id, channels)
    await simulator.start(port)


if __name__ == '__main__':
    asyncio.run(main())
