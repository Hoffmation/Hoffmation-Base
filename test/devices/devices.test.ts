import ExampleDevices from './exampleDevices.json';
import { deviceConfig } from '../../src/models/deviceConfig';
import { Devices } from '../../src/server/devices/devices';
import { Utils } from '../../src/server/services/utils/utils';

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
});
