import { Dachs, ExampleConfig, HoffmationBase, HoffmationInitializationObject } from '../src';

export class DachsTest {
  public static async start(): Promise<void> {
    const init = new HoffmationInitializationObject(ExampleConfig);
    init.config.telegram = undefined;
    init.config.polly = undefined;
    init.config.persistence = undefined;
    init.config.muell = undefined;
    await HoffmationBase.initializeBeforeIoBroker(init);
    if (!init.config.dachs) throw new Error('No dachs config found');
    const dachs: Dachs = new Dachs(init.config.dachs);
    // In case you want to test starting the Dachs
    // setTimeout(() => {
    //   console.log('Starting Dachs:');
    //   dachs.setActuator(true);
    // }, 10000);

    setTimeout(() => {
      console.log('shutdown-now');
      console.log('dachs-Data:', dachs.toJSON());
      process.exit(1);
    }, 15000);
  }
}

void DachsTest.start();

process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});
