import { HoffmationBase, HoffmationInitializationObject, iTvDevice } from '../src';
import config from './mainConfig.example.json';
import { SamsungTv } from '../src/server/devices/tv/samsungTv';

export class SamsungTvTest {
  public static async start(): Promise<void> {
    const init = new HoffmationInitializationObject(config);
    init.config.telegram = undefined;
    init.config.polly = undefined;
    init.config.persistence = undefined;
    init.config.muell = undefined;
    await HoffmationBase.initializeBeforeIoBroker(init);
    // const tv: iTvDevice = new SamsungTv('Test', 'Wohnz', '192.168.178.34', '64:E7:D8:6E:5A:26', '11335123');
    const tv: iTvDevice = new SamsungTv('Test', 'Wohnz', '192.168.178.35', '80:8A:BD:47:8F:0C', '79389477');

    tv.turnOn();
    setTimeout(() => {
      tv.volumeUp();
    }, 4000);
    setTimeout(() => {
      tv.volumeUp();
    }, 8000);
    setTimeout(() => {
      console.log('shutdown-now');
      tv.turnOff();
      process.exit(1);
    }, 20000);
  }
}

void SamsungTvTest.start();

process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});
