import { deviceConfig, Devices, HoffmationBase, HoffmationInitializationObject } from '../src';
import config from './mainConfig.example.json';
import devs from './exampleDevice.json';
import { MockRoomImportEnforcer } from './mockRoomImportEnforcer';

export class ioBrokerConnectionTest {
  public static async start(): Promise<void> {
    const init = new HoffmationInitializationObject(config);
    init.config.telegram = undefined;
    init.config.polly = undefined;
    init.config.persistence = undefined;
    init.config.muell = undefined;

    // !!!! Set your ioBroker Url here !!!!!
    init.config.ioBrokerUrl = '8084';

    await HoffmationBase.initializeBeforeIoBroker(init);
    const devices: Devices = new Devices(devs as { [id: string]: deviceConfig }, new MockRoomImportEnforcer());
    HoffmationBase.startIoBroker(devices);
    setTimeout(() => {
      console.log('shutdown-now');
      process.exit(1);
    }, 20000);
  }
}

void ioBrokerConnectionTest.start();

process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});
