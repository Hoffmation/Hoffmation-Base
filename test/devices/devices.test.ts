import OwnDevices from './ownDevices.json';
import ExampleDevices from './exampleDevices.json';
import { deviceConfig } from '../../src/models/deviceConfig';
import { Devices } from '../../src/server/devices/devices';
import { Utils } from '../../src/server/services/utils/utils';

describe('Devices', () => {
  Utils.testInitializeServices();
  jest.setTimeout(10000);
  const deviceJSON: { [id: string]: deviceConfig } = (OwnDevices ? OwnDevices : ExampleDevices) as {
    [id: string]: deviceConfig;
  };
  new Devices(deviceJSON);
  it('Should be able to create device JSON', async () => {
    console.log(JSON.stringify(Devices.alLDevices));
    expect(JSON.stringify(Devices.alLDevices) !== '').toBeTruthy();
  });
});
