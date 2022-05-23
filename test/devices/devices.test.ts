import { deviceConfig, Devices, Utils } from '../../src';
import ExampleDevices from './exampleDevices.json';

describe('Devices', () => {
  Utils.testInitializeServices();
  jest.setTimeout(10000);
  const deviceJSON: { [id: string]: deviceConfig } = ExampleDevices as {
    [id: string]: deviceConfig;
  };
  new Devices(deviceJSON);
  it('Should be able to create device JSON', () => {
    const json: string = JSON.stringify(Devices.alLDevices);
    expect(json !== '').toBeTruthy();
    const newObject: string = JSON.parse(json);
    expect(Object.keys(newObject).length > 0).toBeTruthy();
  });
  afterAll(() => {
    Devices.energymanager?.cleanup();
  });
});
