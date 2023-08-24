import config from './mainConfig.example.json';
import { HoffmationBase, HoffmationInitializationObject } from '../src';
import { Dachs } from '../src/server/devices/dachs';

export class SamsungTvTest {
  public static async start(): Promise<void> {
    const init = new HoffmationInitializationObject(config);
    init.config.telegram = undefined;
    init.config.polly = undefined;
    init.config.persistence = undefined;
    init.config.muell = undefined;
    await HoffmationBase.initializeBeforeIoBroker(init);
    // const tv: iTvDevice = new SamsungTv('Test', 'Wohnz', '192.168.178.34', '64:E7:D8:6E:5A:26', '11335123');
    if (!init.config.dachs) throw new Error('No dachs config found');
    const dachs: Dachs = new Dachs(init.config.dachs);

    setTimeout(() => {
      console.log('shutdown-now');
      console.log('dachs-Data:', dachs.toJSON());
      process.exit(1);
    }, 65000);
  }
}

void SamsungTvTest.start();

process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});
