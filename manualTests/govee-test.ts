import {
  CommandSource,
  GooveeService,
  HoffmationBase,
  HoffmationInitializationObject,
  LedSetLightCommand,
  OwnGoveeDevice,
  OwnGoveeDevices,
} from '../src';
import config from './mainConfig.example.json';

export class GoveeTestTest {
  public static async start(): Promise<void> {
    const init = new HoffmationInitializationObject(config);
    init.config.telegram = undefined;
    init.config.polly = undefined;
    init.config.persistence = undefined;
    init.config.muell = undefined;
    await HoffmationBase.initializeBeforeIoBroker(init);

    const device: OwnGoveeDevice = new OwnGoveeDevice('16:C1:36:35:30:0C:4A:FF', 'Vorne Links', 'Testraum');
    OwnGoveeDevices.addDevice(device);
    GooveeService.addOwnDevices(OwnGoveeDevices.ownDevices);
    GooveeService.initialize({
      url: 'http://localhost:3000',
    });
    setTimeout(() => {
      console.log('Turning Govee on');
      device.setLight(new LedSetLightCommand(CommandSource.Manual, true, 'Govee Test'));
    }, 2000);

    setTimeout(() => {
      console.log('Turning Govee off');
      device.setLight(new LedSetLightCommand(CommandSource.Manual, false, 'Govee Test'));
    }, 8000);
    setTimeout(() => {
      console.log('shutdown-now');
      process.exit(1);
    }, 10000);
  }
}

void GoveeTestTest.start();

process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});
