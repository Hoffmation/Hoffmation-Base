import { ActuatorSettings, Devices, DimmerSettings, iDeviceConfig, Utils } from '../../src';
import ExampleDevices from './exampleDevices.json';

jest.mock('unifi-protect', () => jest.fn()); // Working now, phew
jest.mock('unifi-access', () => jest.fn()); // Working now, phew

describe('Device Settings', () => {
  Utils.testInitializeServices();
  jest.setTimeout(10000);
  const deviceJSON: { [id: string]: iDeviceConfig } = ExampleDevices as {
    [id: string]: iDeviceConfig;
  };
  new Devices(deviceJSON);
  it('Acutator Settings should respect partial Object', () => {
    const actuatorSettings: ActuatorSettings = new ActuatorSettings();
    actuatorSettings.dawnOn = true;
    actuatorSettings.fromPartialObject(
      JSON.parse('{"dawnOn":false,"duskOn":false,"nightOn":false,"isStromStoss":false,"stromStossResendTime":180}'),
    );
    expect(actuatorSettings.dawnOn).toBeFalsy();
  });
  it('Dimmer Settings should override actuator Settings', () => {
    const dimmerSettings: DimmerSettings = new DimmerSettings();
    dimmerSettings.dawnOn = true;
    dimmerSettings.fromPartialObject(
      JSON.parse('{"dawnOn":false,"duskOn":false,"nightOn":false,"isStromStoss":false,"stromStossResendTime":180}'),
    );
    expect(dimmerSettings.dawnOn).toBeFalsy();
  });
});
