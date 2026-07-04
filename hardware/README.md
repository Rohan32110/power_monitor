# Power Monitor — Hardware Design

This folder contains the hardware reference design for the Power Monitor project.
The web app runs a software simulator (`lib/simulator.ts`) by default, but this folder
documents the real-world ESP32 circuit that would replace the simulator in a physical deployment.

---

## Folder Structure

```
hardware/
├── README.md                              ← this file
├── schematic/
│   └── power_monitor_schematic.svg        ← Tinkercad-style circuit schematic (open in browser)
└── wokwi/
    ├── diagram.json                       ← Wokwi simulator project (import at wokwi.com)
    └── power_monitor.ino                  ← Arduino sketch for ESP32
```

---

## Circuit Overview

| Attribute        | Value                                  |
|------------------|----------------------------------------|
| Microcontroller  | ESP32 DevKit v1                        |
| Total devices    | 15 (9 lights + 6 fans)                 |
| Rooms            | Drawing Room, Work Room 1, Work Room 2 |
| Lights per room  | 3 (15W each, yellow LED)               |
| Fans per room    | 2 (60W each, blue LED)                 |
| Resistors        | 220Ω per device (current limiting)     |
| Power supply     | 5V via Micro-USB                       |
| Connectivity     | WiFi 802.11 b/g/n (built-in ESP32)    |

---

## GPIO Pin Map

| GPIO | Device  | Room          |
|------|---------|---------------|
| D2   | Light 1 | Drawing Room  |
| D4   | Light 2 | Drawing Room  |
| D5   | Light 3 | Drawing Room  |
| D26  | Fan 1   | Drawing Room  |
| D27  | Fan 2   | Drawing Room  |
| D18  | Light 1 | Work Room 1   |
| D19  | Light 2 | Work Room 1   |
| D21  | Light 3 | Work Room 1   |
| D32  | Fan 1   | Work Room 1   |
| D33  | Fan 2   | Work Room 1   |
| D22  | Light 1 | Work Room 2   |
| D23  | Light 2 | Work Room 2   |
| D25  | Light 3 | Work Room 2   |
| D34  | Fan 1   | Work Room 2   |
| D35  | Fan 2   | Work Room 2   |
| GND  | Common ground (shared by all devices) |
| 3V3  | Not used for LEDs (5V logic via USB)  |

---

## Components Required

| Component               | Quantity | Notes                              |
|-------------------------|----------|------------------------------------|
| ESP32 DevKit v1         | 1        | Any 38-pin variant works           |
| Yellow LED (5mm)        | 9        | Represents office lights           |
| Blue LED (5mm)          | 6        | Represents office fans             |
| 220Ω resistor (1/4W)   | 15       | One per device, current limiting   |
| Breadboard (full size)  | 1-2      | To mount all components            |
| Jumper wires            | ~40      | Male-to-male                       |
| Micro-USB cable         | 1        | For power and flashing firmware    |

---

## Wokwi Simulation

1. Go to [wokwi.com](https://wokwi.com) and create a new ESP32 project.
2. Replace the default `diagram.json` with the contents of `wokwi/diagram.json`.
3. Add `power_monitor.ino` as the sketch file.
4. Click **Start Simulation**.

The simulation runs the same 3-tick logic as the web app simulator —
LEDs turn on/off to represent device state changes, and the sketch
POSTs the state to the API endpoint every 3 seconds.

---

## Arduino Sketch Setup

### 1. Install dependencies

Open Arduino IDE and install via Library Manager:
- `ArduinoJson` by Benoit Blanchon (v6.x)

### 2. Edit credentials

Open `wokwi/power_monitor.ino` and update:

```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_ENDPOINT  = "https://your-project.vercel.app/api/state";
```

### 3. Flash to ESP32

- Select board: `ESP32 Dev Module`
- Upload speed: `115200`
- Flash and open Serial Monitor at `115200 baud`

---

## How the Hardware Connects to the Web App

```
ESP32 (physical hardware)
        │
        │  WiFi HTTP POST every 3s
        │  Body: { "devices": [{ "id", "status", "wattage" }] }
        ▼
POST /api/state  (Next.js API route)
        │
        ├──► Updates in-memory simulator state
        ├──► Broadcasts via SSE to all connected clients (/api/stream)
        └──► Persists to Supabase (device_states, energy_logs, alerts)
```

Without hardware, `lib/simulator.ts` generates random state changes automatically
on the same 3-second tick cycle — the web app is fully functional either way.

---

## Schematic

![Power Monitor Circuit Schematic](https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-7OWowwQQKhEtjv3gh2sXlpVSyUmDhE.png)

The schematic above shows the full circuit with:
- ESP32 DevKit v1 at the center
- 3 room panels (Drawing Room, Work Room 1, Work Room 2)
- Yellow LEDs for lights, blue symbols for fans
- 220Ω resistors on every device line
- Common GND rail per room
- GPIO labels on every connection

The vector version `schematic/power_monitor_schematic.svg` can also be opened
directly in any browser for full-resolution, zoomable detail.
