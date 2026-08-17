import type { ComponentDef } from '../types';

// Built-in starter parts with typical datasheet-ish figures for common DIY /
// Arduino-adjacent projects. These are convenience starting points, not
// guarantees — every value is editable, and users are nudged to verify
// against their actual part's datasheet. Seeded into the user's own library
// on first load so they can be freely edited/deleted without touching this
// source file.
//
// Each load has three current figures: idle, active (typical/normal running
// — what the runtime estimate is based on), and peak (worst case under load
// — a stall, an RF burst, a motor kicking in — used only for the
// converter/battery overload checks). Where a part has no meaningful spike,
// peak == active.

const preset = (def: Omit<ComponentDef, 'isPreset'>): ComponentDef => ({ ...def, isPreset: true });

export const PRESET_LIBRARY: ComponentDef[] = [
  // ---- Boards ----
  preset({
    id: 'preset-arduino-uno',
    name: 'Arduino Uno R3',
    category: 'load',
    subtype: 'Microcontroller board',
    notes: 'Voltage range is the recommended VIN barrel-jack input. No native sleep mode, so idle current stays fairly high.',
    load: { voltageMin: 7, voltageMax: 12, activeCurrentMa: 50, idleCurrentMa: 20, peakCurrentMa: 50, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-arduino-nano',
    name: 'Arduino Nano',
    category: 'load',
    subtype: 'Microcontroller board',
    notes: 'VIN range via the onboard regulator. FTDI/CH340 USB chip adds some idle overhead.',
    load: { voltageMin: 7, voltageMax: 12, activeCurrentMa: 40, idleCurrentMa: 20, peakCurrentMa: 40, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-arduino-mega',
    name: 'Arduino Mega 2560',
    category: 'load',
    subtype: 'Microcontroller board',
    load: { voltageMin: 7, voltageMax: 12, activeCurrentMa: 93, idleCurrentMa: 40, peakCurrentMa: 93, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-arduino-leonardo',
    name: 'Arduino Leonardo',
    category: 'load',
    subtype: 'Microcontroller board',
    load: { voltageMin: 7, voltageMax: 12, activeCurrentMa: 45, idleCurrentMa: 20, peakCurrentMa: 45, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-esp32-devkit',
    name: 'ESP32 Dev Board',
    category: 'load',
    subtype: 'Microcontroller board (WiFi/BLE)',
    notes: '160mA is a reasonable sustained average; peak accounts for WiFi TX bursts (250mA+). Idle assumes light/deep sleep with board-level (LDO + USB chip) quiescent draw included, not the bare chip figure.',
    load: { voltageMin: 4.5, voltageMax: 5.5, activeCurrentMa: 160, idleCurrentMa: 15, peakCurrentMa: 260, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-esp8266-nodemcu',
    name: 'ESP8266 NodeMCU',
    category: 'load',
    subtype: 'Microcontroller board (WiFi)',
    notes: 'Peak accounts for WiFi TX bursts.',
    load: { voltageMin: 4.5, voltageMax: 5.5, activeCurrentMa: 80, idleCurrentMa: 10, peakCurrentMa: 170, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-pico',
    name: 'Raspberry Pi Pico',
    category: 'load',
    subtype: 'Microcontroller board',
    load: { voltageMin: 4.5, voltageMax: 5.5, activeCurrentMa: 25, idleCurrentMa: 1, peakCurrentMa: 25, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-pico-w',
    name: 'Raspberry Pi Pico W',
    category: 'load',
    subtype: 'Microcontroller board (WiFi)',
    notes: 'Peak accounts for WiFi TX bursts.',
    load: { voltageMin: 4.5, voltageMax: 5.5, activeCurrentMa: 80, idleCurrentMa: 1, peakCurrentMa: 150, dutyCyclePercent: 100 },
  }),

  // ---- Sensors ----
  preset({
    id: 'preset-dht22',
    name: 'DHT22 / AM2302 (Temp+Humidity)',
    category: 'load',
    subtype: 'Sensor',
    load: { voltageMin: 3.3, voltageMax: 6, activeCurrentMa: 1.5, idleCurrentMa: 0.05, peakCurrentMa: 1.5, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-dht11',
    name: 'DHT11 (Temp+Humidity)',
    category: 'load',
    subtype: 'Sensor',
    load: { voltageMin: 3, voltageMax: 5.5, activeCurrentMa: 4, idleCurrentMa: 0.15, peakCurrentMa: 4, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-bme280',
    name: 'BME280 (Temp+Humidity+Pressure)',
    category: 'load',
    subtype: 'Sensor',
    notes: 'I2C/SPI, very low power. Sleep current is near-negligible (~0.1µA).',
    load: { voltageMin: 1.7, voltageMax: 3.6, activeCurrentMa: 0.35, idleCurrentMa: 0.0002, peakCurrentMa: 0.35, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-hcsr04',
    name: 'HC-SR04 Ultrasonic Distance',
    category: 'load',
    subtype: 'Sensor',
    load: { voltageMin: 4.5, voltageMax: 5.5, activeCurrentMa: 15, idleCurrentMa: 2, peakCurrentMa: 15, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-hcsr501',
    name: 'HC-SR501 PIR Motion Sensor',
    category: 'load',
    subtype: 'Sensor',
    load: { voltageMin: 4.5, voltageMax: 20, activeCurrentMa: 15, idleCurrentMa: 0.1, peakCurrentMa: 15, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-mpu6050',
    name: 'MPU6050 Accel/Gyro',
    category: 'load',
    subtype: 'Sensor',
    load: { voltageMin: 2.375, voltageMax: 3.46, activeCurrentMa: 3.9, idleCurrentMa: 0.005, peakCurrentMa: 3.9, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-ldr-module',
    name: 'Photoresistor (LDR) Module',
    category: 'load',
    subtype: 'Sensor',
    load: { voltageMin: 3.3, voltageMax: 5, activeCurrentMa: 15, idleCurrentMa: 15, peakCurrentMa: 15, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-soil-moisture',
    name: 'Soil Moisture Sensor Module',
    category: 'load',
    subtype: 'Sensor',
    notes: 'Resistive probe modules draw current whenever powered; consider powering from a digital pin to cut current between readings.',
    load: { voltageMin: 3.3, voltageMax: 5, activeCurrentMa: 20, idleCurrentMa: 20, peakCurrentMa: 20, dutyCyclePercent: 100 },
  }),

  // ---- Actuators / outputs ----
  preset({
    id: 'preset-sg90',
    name: 'SG90 Micro Servo',
    category: 'load',
    subtype: 'Actuator',
    notes: 'Peak is stall current (holding against resistance); 250mA covers typical active movement.',
    load: { voltageMin: 4.8, voltageMax: 6, activeCurrentMa: 250, idleCurrentMa: 10, peakCurrentMa: 650, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-relay-1ch',
    name: '1-Channel 5V Relay Module',
    category: 'load',
    subtype: 'Actuator',
    notes: 'Peak accounts for coil energizing inrush.',
    load: { voltageMin: 4.75, voltageMax: 5.25, activeCurrentMa: 70, idleCurrentMa: 2, peakCurrentMa: 120, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-dc-motor-small',
    name: 'Small DC Gear Motor (generic)',
    category: 'load',
    subtype: 'Actuator',
    notes: 'Highly load-dependent; peak is a rough stall-current estimate (several times the running figure). Treat all these as rough estimates and verify against your motor.',
    load: { voltageMin: 3, voltageMax: 6, activeCurrentMa: 200, idleCurrentMa: 0, peakCurrentMa: 700, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-stepper-motor',
    name: 'Stepper Motor + Driver (generic NEMA17-ish)',
    category: 'load',
    subtype: 'Actuator',
    notes: 'Voltage is the motor supply rail feeding the driver board (A4988/DRV8825/TMC-style), not the coil voltage. Current figures are the approximate supply-side draw: idle assumes the driver still holds current at rest, active is typical microstepping motion, and peak is worst case — high torque / low speed moves, or multiple axes accelerating together. Very driver- and current-limit-setting dependent; treat as a starting point and check your driver’s current-limit setting.',
    load: { voltageMin: 8, voltageMax: 24, activeCurrentMa: 800, idleCurrentMa: 400, peakCurrentMa: 1700, dutyCyclePercent: 100 },
  }),
  preset({
    id: 'preset-ws2812-pixel',
    name: 'WS2812 / NeoPixel (per pixel)',
    category: 'load',
    subtype: 'Actuator',
    notes: 'Current is per single pixel at full white brightness. For a strip, multiply by pixel count (edit the current fields, or add multiple instances).',
    load: { voltageMin: 4.5, voltageMax: 5.5, activeCurrentMa: 60, idleCurrentMa: 1, peakCurrentMa: 60, dutyCyclePercent: 100 },
  }),

  // ---- Converters / regulators ----
  preset({
    id: 'preset-lm2596-buck',
    name: 'LM2596 Buck Converter Module',
    category: 'converter',
    subtype: 'Adjustable step-down',
    converter: { kind: 'buck', inputVoltageMin: 4.5, inputVoltageMax: 35, outputVoltage: 5, maxOutputCurrentMa: 2000, efficiencyPercent: 88 },
  }),
  preset({
    id: 'preset-mp1584-buck',
    name: 'MP1584EN Buck Converter Module',
    category: 'converter',
    subtype: 'Adjustable step-down',
    converter: { kind: 'buck', inputVoltageMin: 4.5, inputVoltageMax: 28, outputVoltage: 5, maxOutputCurrentMa: 3000, efficiencyPercent: 92 },
  }),
  preset({
    id: 'preset-mt3608-boost',
    name: 'MT3608 Boost Converter Module',
    category: 'converter',
    subtype: 'Adjustable step-up',
    converter: { kind: 'boost', inputVoltageMin: 2, inputVoltageMax: 24, outputVoltage: 5, maxOutputCurrentMa: 2000, efficiencyPercent: 93 },
  }),
  preset({
    id: 'preset-ams1117-33',
    name: 'AMS1117-3.3 LDO Regulator',
    category: 'converter',
    subtype: 'Linear (fixed 3.3V)',
    notes: 'LDO efficiency ≈ Vout/Vin, so it drops sharply with a large input/output differential — the default here assumes a ~5V input.',
    converter: { kind: 'ldo', inputVoltageMin: 4.5, inputVoltageMax: 12, outputVoltage: 3.3, maxOutputCurrentMa: 800, efficiencyPercent: 66 },
  }),

  // ---- Batteries / power sources ----
  preset({
    id: 'preset-18650',
    name: '18650 Li-ion Cell',
    category: 'battery',
    subtype: 'Cell',
    notes: 'Max discharge current is a conservative generic default — high-drain cells are rated for much more, cheap unprotected ones for less. Check your specific cell’s datasheet.',
    battery: { nominalVoltage: 3.7, capacityMah: 3000, chemistry: 'liion', seriesCount: 1, parallelCount: 1, usableFraction: 0.85, maxDischargeCurrentMa: 3000 },
  }),
  preset({
    id: 'preset-lipo-1s',
    name: 'LiPo 1S Pack (3.7V)',
    category: 'battery',
    subtype: 'Pack',
    notes: 'Max discharge current depends on the pack’s C-rating (capacity × C). Left unset here — fill it in from your pack’s label once you know it.',
    battery: { nominalVoltage: 3.7, capacityMah: 1000, chemistry: 'lipo', seriesCount: 1, parallelCount: 1, usableFraction: 0.85, maxDischargeCurrentMa: 0 },
  }),
  preset({
    id: 'preset-lifepo4-18650',
    name: 'LiFePO4 18650 Cell (3.2V)',
    category: 'battery',
    subtype: 'Cell',
    battery: { nominalVoltage: 3.2, capacityMah: 1500, chemistry: 'lifepo4', seriesCount: 1, parallelCount: 1, usableFraction: 0.9, maxDischargeCurrentMa: 3000 },
  }),
  preset({
    id: 'preset-aa-alkaline',
    name: 'AA Alkaline Cell',
    category: 'battery',
    subtype: 'Cell',
    notes: 'Use the series count to model a pack, e.g. 4x AA in series = 6V. Alkaline cells sag badly under sustained high current — the discharge limit here is conservative on purpose.',
    battery: { nominalVoltage: 1.5, capacityMah: 2000, chemistry: 'alkaline', seriesCount: 1, parallelCount: 1, usableFraction: 0.7, maxDischargeCurrentMa: 1000 },
  }),
  preset({
    id: 'preset-aaa-alkaline',
    name: 'AAA Alkaline Cell',
    category: 'battery',
    subtype: 'Cell',
    battery: { nominalVoltage: 1.5, capacityMah: 1000, chemistry: 'alkaline', seriesCount: 1, parallelCount: 1, usableFraction: 0.7, maxDischargeCurrentMa: 500 },
  }),
  preset({
    id: 'preset-nimh-aa',
    name: 'NiMH AA Rechargeable',
    category: 'battery',
    subtype: 'Cell',
    notes: 'NiMH tolerates higher discharge current much better than alkaline.',
    battery: { nominalVoltage: 1.2, capacityMah: 2000, chemistry: 'nimh', seriesCount: 1, parallelCount: 1, usableFraction: 0.9, maxDischargeCurrentMa: 2000 },
  }),
  preset({
    id: 'preset-9v-alkaline',
    name: '9V Alkaline Battery (PP3)',
    category: 'battery',
    subtype: 'Battery',
    notes: '9V alkalines are notoriously poor under load — sustained draws much above ~400mA sag hard. A classic case of "fine on a multimeter, dies under a real load" (e.g. a servo or relay).',
    battery: { nominalVoltage: 9, capacityMah: 550, chemistry: 'alkaline', seriesCount: 1, parallelCount: 1, usableFraction: 0.7, maxDischargeCurrentMa: 400 },
  }),
  preset({
    id: 'preset-usb-powerbank',
    name: 'USB Power Bank (5V out)',
    category: 'battery',
    subtype: 'Regulated pack',
    notes: 'Modeled as a regulated 5V source. Usable fraction is lowered to roughly account for the power bank’s own internal boost-conversion losses, since the printed capacity is measured at the cell, not at the 5V USB output. Max discharge current approximates a typical single USB-A port limit — check yours, some ports allow more.',
    battery: { nominalVoltage: 5, capacityMah: 10000, chemistry: 'other', seriesCount: 1, parallelCount: 1, usableFraction: 0.6, maxDischargeCurrentMa: 2000 },
  }),

  // ---- Other / pass-through ----
  preset({
    id: 'preset-toggle-switch',
    name: 'Toggle Switch',
    category: 'other',
    subtype: 'Pass-through',
    notes: 'In-line power switch. Draws nothing itself; wire power-in → power-out through it.',
  }),
  preset({
    id: 'preset-pushbutton',
    name: 'Pushbutton',
    category: 'other',
    subtype: 'Pass-through / signal',
  }),
  preset({
    id: 'preset-fuse',
    name: 'Fuse / PTC Resettable Fuse',
    category: 'other',
    subtype: 'Pass-through',
  }),
  preset({
    id: 'preset-junction',
    name: 'Junction / Power Rail Point',
    category: 'other',
    subtype: 'Pass-through',
    notes: 'Useful as a breadboard rail or wire-junction node when you want one power rail feeding several branches.',
  }),
];
