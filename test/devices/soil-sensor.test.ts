import {
  DeviceCapability,
  DeviceCluster,
  DeviceClusterType,
  DeviceType,
  Devices,
  iBaseDevice,
  iDeviceConfig,
  IoBrokerDeviceInfo,
  iSoilCollector,
  SoilSensorChangeAction,
  UNDEFINED_SOIL_MOISTURE_VALUE,
  Utils,
  ZigbeeCooloSoilSensor,
  ZigbeeSoilSensor,
} from '../../src';
import ExampleDevices from './exampleDevices.json';

jest.mock('unifi-access', () => jest.fn()); // Working now, phew

Utils.testInitializeServices();

/**
 * The COOLO CS-201Z and the soil sensor axis underneath it.
 *
 * What this pins is the one mistake that would be invisible afterwards: soil moisture and air humidity are
 * both percentages in the same range, so a swapped assignment produces perfectly plausible numbers and only
 * shows up weeks later in the recorded history as a plant that never dries out. Every reading below therefore
 * carries a value no other reading has.
 */
const SOIL_MOISTURE = 15;
const AIR_HUMIDITY = 91;
const AIR_TEMPERATURE = 19;
const BATTERY = 100;

/**
 * Builds the device straight from an ioBroker device object, the way the factory does.
 * @returns The device under test.
 */
function buildDevice(): ZigbeeCooloSoilSensor {
  const config: iDeviceConfig = {
    _id: 'zigbee.0.a4c138a09a343fab',
    type: 'device',
    common: { name: '00-Zigbee-Testroom-CooloSoil-1' },
    native: {},
  } as unknown as iDeviceConfig;
  const info: IoBrokerDeviceInfo = IoBrokerDeviceInfo.byDeviceConfig(config);
  // The factory sets this right after building the info (devices.ts:357); `id` - and with it every log line
  // and every persist call - guards on it, so a device built by hand needs it too.
  info.allDevicesKey = 'zigbee-a4c138a09a343fab';
  return new ZigbeeCooloSoilSensor(info);
}

/**
 * The ioBroker state object the adapter hands to `update`.
 * @param value - The value that arrived
 * @returns A state carrying it.
 */
function state(value: number): ioBroker.State {
  return { val: value, ack: true, ts: Date.now(), lc: Date.now(), from: 'test' } as unknown as ioBroker.State;
}

/**
 * Feeds the device the four readings the sensor reports.
 * @param device - The device to feed
 */
function feedAllReadings(device: ZigbeeCooloSoilSensor): void {
  device.update(['zigbee', '0', 'a4c138a09a343fab', 'soil_moisture'], state(SOIL_MOISTURE));
  device.update(['zigbee', '0', 'a4c138a09a343fab', 'humidity'], state(AIR_HUMIDITY));
  device.update(['zigbee', '0', 'a4c138a09a343fab', 'temperature'], state(AIR_TEMPERATURE));
  device.update(['zigbee', '0', 'a4c138a09a343fab', 'battery'], state(BATTERY));
}

describe('Soil sensor', () => {
  describe('the CS-201Z reads three quantities apart', () => {
    it('keeps soil moisture, air humidity and air temperature separate', () => {
      const device: ZigbeeCooloSoilSensor = buildDevice();

      feedAllReadings(device);

      // The whole point of the separate axis: the device reports both percentages at once, and neither may
      // land in the other's slot.
      expect(device.soilMoisture).toBe(SOIL_MOISTURE);
      expect(device.humidity).toBe(AIR_HUMIDITY);
      expect(device.iTemperature).toBe(AIR_TEMPERATURE);
      expect(device.batteryLevel).toBe(BATTERY);
      device.dispose();
    });

    it('reports the sentinel before anything arrived', () => {
      const device: ZigbeeCooloSoilSensor = buildDevice();

      // Not 0: a fresh sensor that reads as bone dry is what would make a watering decision act on nothing.
      expect(device.soilMoisture).toBe(UNDEFINED_SOIL_MOISTURE_VALUE);
      device.dispose();
    });

    it('carries the soil, temperature, humidity and battery capabilities', () => {
      const device: ZigbeeCooloSoilSensor = buildDevice();

      expect(device.deviceCapabilities).toContain(DeviceCapability.soilSensor);
      expect(device.deviceCapabilities).toContain(DeviceCapability.temperatureSensor);
      expect(device.deviceCapabilities).toContain(DeviceCapability.humiditySensor);
      expect(device.deviceCapabilities).toContain(DeviceCapability.batteryDriven);
      device.dispose();
    });

    it('is a ZigbeeSoilSensor, so a second brand inherits instead of copying', () => {
      const device: ZigbeeCooloSoilSensor = buildDevice();

      expect(device).toBeInstanceOf(ZigbeeSoilSensor);
      expect(device.deviceType).toBe(DeviceType.ZigbeeCooloSoilSensor);
      device.dispose();
    });
  });

  describe('the change callback', () => {
    it('fires on a new reading and carries the sensor', () => {
      const device: ZigbeeCooloSoilSensor = buildDevice();
      const seen: SoilSensorChangeAction[] = [];
      device.addSoilMoistureCallback((action) => seen.push(action));

      device.update(['zigbee', '0', 'a4c138a09a343fab', 'soil_moisture'], state(SOIL_MOISTURE));

      expect(seen).toHaveLength(1);
      expect(seen[0].newSoilMoisture).toBe(SOIL_MOISTURE);
      expect((seen[0].sensor as iSoilCollector).soilMoisture).toBe(SOIL_MOISTURE);
      device.dispose();
    });

    it('replays the last reading to a callback that registers late, but not the sentinel', () => {
      const withoutReading: ZigbeeCooloSoilSensor = buildDevice();
      const early: SoilSensorChangeAction[] = [];
      withoutReading.addSoilMoistureCallback((action) => early.push(action));
      // Nothing was ever reported, so there is nothing to replay - a -1 handed to a consumer would be read as
      // a measurement.
      expect(early).toHaveLength(0);
      withoutReading.dispose();

      const withReading: ZigbeeCooloSoilSensor = buildDevice();
      withReading.update(['zigbee', '0', 'a4c138a09a343fab', 'soil_moisture'], state(SOIL_MOISTURE));
      const late: SoilSensorChangeAction[] = [];
      withReading.addSoilMoistureCallback((action) => late.push(action));

      expect(late).toHaveLength(1);
      expect(late[0].newSoilMoisture).toBe(SOIL_MOISTURE);
      withReading.dispose();
    });
  });

  describe('the wiring', () => {
    beforeAll(() => {
      const deviceJSON: { [id: string]: iDeviceConfig } = ExampleDevices as unknown as {
        [id: string]: iDeviceConfig;
      };
      new Devices(deviceJSON);
    });

    it('is built by the factory from the ioBroker device name', () => {
      // `00-Zigbee-<room>-CooloSoil-<index>` is what an installation has to name the device; segment three is
      // what the factory switches on.
      const built: iBaseDevice = Devices.alLDevices['zigbee-a4c138a09a343fab'];
      expect(built).toBeInstanceOf(ZigbeeCooloSoilSensor);
      expect(built.deviceType).toBe(DeviceType.ZigbeeCooloSoilSensor);
    });

    it('joins the soil cluster and the two room aggregates', () => {
      const cluster: DeviceCluster = new DeviceCluster();

      cluster.addByDeviceType(Devices.alLDevices['zigbee-a4c138a09a343fab']);

      // The cluster stores ids and resolves them through `Devices.alLDevices`, so this has to run against the
      // registered device rather than a hand built one - a detached instance would never come back out.
      // It sits in a pot indoors, so its air readings are readings of the room air and count towards the room
      // aggregates. A sensor in a bed or a lawn would only get the soil cluster.
      const inSoil: iBaseDevice[] = cluster.getDevicesByType(DeviceClusterType.SoilSensor);
      expect(inSoil.map((d) => d.id)).toContain('zigbee-a4c138a09a343fab');
      expect(cluster.getDevicesByType(DeviceClusterType.TemperaturSensor).map((d) => d.id)).toContain(
        'zigbee-a4c138a09a343fab',
      );
      expect(cluster.getDevicesByType(DeviceClusterType.HumiditySensor).map((d) => d.id)).toContain(
        'zigbee-a4c138a09a343fab',
      );
    });
  });

  afterAll(() => {
    // `new Devices(...)` above builds every example device, and those keep their intervals running - same
    // teardown as devices.test.ts.
    Devices.energymanager?.dispose();
  });
});
