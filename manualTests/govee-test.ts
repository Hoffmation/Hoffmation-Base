import { GooveeService, HoffmationBase, HoffmationInitializationObject, OwnGoveeDevice, OwnGoveeDevices } from '../src';
import config from './mainConfig.example.json';

export class GoveeTestTest {
  public static async start(): Promise<void> {
    const init = new HoffmationInitializationObject(config);
    init.config.telegram = undefined;
    init.config.polly = undefined;
    init.config.persistence = undefined;
    init.config.muell = undefined;
    await HoffmationBase.initializeBeforeIoBroker(init);

    const device: OwnGoveeDevice = new OwnGoveeDevice('16:C1:36:35:30:0C:4A:FF', 'Vorne Links', 'Testraum', undefined);
    OwnGoveeDevices.addDevice(device);
    GooveeService.addOwnDevices(OwnGoveeDevices.ownDevices);
    GooveeService.initialize();
    setTimeout(() => {
      device.setLight(true, -1, true, 100, undefined, '#ff6a00', -1);
    }, 15000);
    setTimeout(() => {
      console.log('shutdown-now');
      process.exit(1);
    }, 55000);
  }
}

void GoveeTestTest.start();

process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});
