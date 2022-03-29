![Photos of projects realised using this software](/examples/media/cover.webp "Cover image")

Web browser for Raspberry Pi that streams to addressable LEDs, motors and other outputs by sampling the image of the window at given 2D locations. It provides a web interface allowing the system to run headlessly.

## Supported outputs and inputs

- UART
- SPI
- PWM
- Bluetooth
- WebAudio
- WebBluetooth
- WebRTC

## Installation

- Connect a terminal to headless device running Raspberry Pi OS Lite: `ssh pi@<ip address>`.

- Run these commands to download the repository and dependencies, build, install and add to start up.

```bash
git clone --recurse-submodules -j8 https://github.com/itsdsk/disk-interaction-system.git
cd ./disk-interaction-system
chmod +x install.sh
./install.sh
```

- Follow the final instructions at end of [install.sh](install.sh).

## Configure the display topology

- Save a list of XY coordinates in a JSON file in the format described in [cpp/device/README.md](cpp/device/README.md).

## Open the web UI

- Nagivate to [http://raspberrypi.local](http://raspberrypi.local) from a device on the same local network.

## Update the configuration

- Go to the setup page of the web UI: [http://raspberrypi.local/setup](http://raspberrypi.local/setup).

- Copy your configuration JSON into the text input.

- Click update.

- Reboot the Pi.
