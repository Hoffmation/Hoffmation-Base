import { ExampleConfig, HoffmationBase, HoffmationInitializationObject, OwnUnifiDoor, UnifiAccess } from '../src';

export class UnifiAccessTest {
  public static async start(): Promise<void> {
    const init = new HoffmationInitializationObject(ExampleConfig);
    init.config.telegram = undefined;
    init.config.polly = undefined;
    init.config.persistence = undefined;
    init.config.muell = undefined;
    init.config.unifiSettings = {
      nvrOptions: {
        nvrAddress: 'xxx',
        username: 'api_hoffmation_protect',
        usernameAccess: 'api_hoffmation_access',
        password: 'yyy',
      },
    };
    await HoffmationBase.initializeBeforeIoBroker(init);
    if (!init.config.unifiSettings.nvrOptions) throw new Error('No unifi config found');
    const door: OwnUnifiDoor = new OwnUnifiDoor('Test', 'xxx', 'Haustuer');
    UnifiAccess.addDevice(door);
    const access: UnifiAccess = new UnifiAccess(init.config.unifiSettings.nvrOptions);
    // Test some device reconnect
    setTimeout(() => {
      console.log('Reconnect Device:');
    }, 10000);

    setTimeout(() => {
      console.log('shutdown-now');
      access.dispose();
      process.exit(1);
    }, 25000);
  }
}

void UnifiAccessTest.start();

process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});
