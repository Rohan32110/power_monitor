/*
 * Power Monitor — ESP32 Firmware
 * ================================
 * Simulates 3 office rooms, each with 2 fans and 3 lights.
 * Device state is published to the Power Monitor web app via HTTP POST.
 *
 * Wiring (see diagram.json):
 *   Yellow LEDs = Lights  (GPIO 2,4,5,18,19,21,22,23,25)
 *   Blue LEDs   = Fans    (GPIO 26,27,32,33,34,35)
 *   All LEDs use 220Ω current-limiting resistors.
 *
 * Libraries required:
 *   - WiFi (built-in)
 *   - HTTPClient (built-in)
 *   - ArduinoJson
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ── WiFi credentials ──────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ── Power Monitor API endpoint ────────────────────────────────────────────────
// Replace with your deployed Vercel URL or local dev URL
const char* API_ENDPOINT  = "https://your-project.vercel.app/api/state";

// ── Tick interval (ms) ────────────────────────────────────────────────────────
const unsigned long TICK_MS = 3000;

// ── Pin map ───────────────────────────────────────────────────────────────────
// Lights: 9 pins (3 rooms × 3 lights)
const int LIGHT_PINS[9] = { 2, 4, 5, 18, 19, 21, 22, 23, 25 };

// Fans: 6 pins (3 rooms × 2 fans)
const int FAN_PINS[6]   = { 26, 27, 32, 33, 34, 35 };

// Device IDs matching the web app simulator format
// Format: <room>_<type>_<number>
const char* LIGHT_IDS[9] = {
  "drawing_room_light_1", "drawing_room_light_2", "drawing_room_light_3",
  "work_room_1_light_1",  "work_room_1_light_2",  "work_room_1_light_3",
  "work_room_2_light_1",  "work_room_2_light_2",  "work_room_2_light_3"
};

const char* FAN_IDS[6] = {
  "drawing_room_fan_1", "drawing_room_fan_2",
  "work_room_1_fan_1",  "work_room_1_fan_2",
  "work_room_2_fan_1",  "work_room_2_fan_2"
};

// ── State ─────────────────────────────────────────────────────────────────────
bool lightState[9] = { false };
bool fanState[6]   = { false };
unsigned long lastTick = 0;

// ── Helper: is within office hours? (09:00–17:00) ────────────────────────────
bool isOfficeHours() {
  // Placeholder: replace with NTP-based time if available
  return true;
}

// ── Simulate random device toggle ────────────────────────────────────────────
void simulateTick() {
  bool office = isOfficeHours();
  for (int i = 0; i < 9; i++) {
    if (office) {
      // During office hours: 70% chance ON
      lightState[i] = (random(100) < 70);
    } else {
      // After hours: 10% chance ON
      lightState[i] = (random(100) < 10);
    }
    digitalWrite(LIGHT_PINS[i], lightState[i] ? HIGH : LOW);
  }
  for (int i = 0; i < 6; i++) {
    if (office) {
      fanState[i] = (random(100) < 60);
    } else {
      fanState[i] = (random(100) < 5);
    }
    digitalWrite(FAN_PINS[i], fanState[i] ? HIGH : LOW);
  }
}

// ── Build and POST JSON payload to web app ────────────────────────────────────
void postState() {
  if (WiFi.status() != WL_CONNECTED) return;

  StaticJsonDocument<2048> doc;
  JsonArray devices = doc.createNestedArray("devices");

  for (int i = 0; i < 9; i++) {
    JsonObject d = devices.createNestedObject();
    d["id"]     = LIGHT_IDS[i];
    d["status"] = lightState[i];
    d["wattage"] = lightState[i] ? 15 : 0;
  }
  for (int i = 0; i < 6; i++) {
    JsonObject d = devices.createNestedObject();
    d["id"]     = FAN_IDS[i];
    d["status"] = fanState[i];
    d["wattage"] = fanState[i] ? 60 : 0;
  }

  String body;
  serializeJson(doc, body);

  HTTPClient http;
  http.begin(API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);
  Serial.printf("[PowerMonitor] POST %s → HTTP %d\n", API_ENDPOINT, code);
  http.end();
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // Init output pins
  for (int i = 0; i < 9; i++) { pinMode(LIGHT_PINS[i], OUTPUT); digitalWrite(LIGHT_PINS[i], LOW); }
  for (int i = 0; i < 6; i++) { pinMode(FAN_PINS[i],   OUTPUT); digitalWrite(FAN_PINS[i],   LOW); }

  // Connect WiFi
  Serial.printf("\n[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[WiFi] Connected — IP: %s\n", WiFi.localIP().toString().c_str());

  randomSeed(analogRead(0));
}

// ── Loop ──────────────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();
  if (now - lastTick >= TICK_MS) {
    lastTick = now;
    simulateTick();
    postState();
  }
}
