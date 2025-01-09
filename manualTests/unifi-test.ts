import { ExampleConfig, HoffmationBase, HoffmationInitializationObject, Router, UnifiRouter } from '../src';

export class UnifiTest {
  public static async start(): Promise<void> {
    const init = new HoffmationInitializationObject(ExampleConfig);
    init.config.telegram = undefined;
    init.config.polly = undefined;
    init.config.persistence = undefined;
    init.config.muell = undefined;
    init.config.unifiSettings = {
      loginOptions: {
        host: '123.123.123.123',
        port: 8443,
        username: 'unifi',
        password: 'admin',
        sslverify: false,
      },
    };
    await HoffmationBase.initializeBeforeIoBroker(init);
    if (!init.config.unifiSettings.loginOptions) throw new Error('No unifi config found');
    const router: Router = new UnifiRouter(init.config.unifiSettings.loginOptions);
    // Test some device reconnect
    setTimeout(() => {
      console.log('Reconnect Device:');
      router.reconnectDeviceByMac('aa:bb:cc:dd:ee:ff');
    }, 10000);

    setTimeout(() => {
      console.log('shutdown-now');
      process.exit(1);
    }, 15000);
  }
}

void UnifiTest.start();

process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});
