import {
  CommandSource,
  ExampleConfig,
  GooveeService,
  HoffmationBase,
  HoffmationInitializationObject,
  LedSetLightCommand,
  OwnGoveeDevice,
  OwnGoveeDevices,
} from '../src';

export class GoveeTestTest {
  public static async start(): Promise<void> {
    const init = new HoffmationInitializationObject(ExampleConfig);
    init.config.telegram = undefined;
    init.config.polly = undefined;
    init.config.persistence = undefined;
    init.config.muell = undefined;
    await HoffmationBase.initializeBeforeIoBroker(init);

    const device: OwnGoveeDevice = new OwnGoveeDevice('D9:9C:C8:35:34:31:78:5B', 'Vorne Links', 'Testraum');
    OwnGoveeDevices.addDevice(device);
    GooveeService.addOwnDevices(OwnGoveeDevices.ownDevices);
    GooveeService.initialize({
      url: 'http://goveeapi.hoffmation.com:3000',
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
