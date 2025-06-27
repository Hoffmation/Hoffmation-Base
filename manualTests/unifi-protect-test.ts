import {
  BaseGroup,
  ExampleConfig,
  GroupType,
  HoffmationBase,
  HoffmationInitializationObject,
  OwnUnifiCamera,
  RoomBase,
  RoomService,
  UnifiProtect,
} from '../src';

export class UnifiProtectTest {
  public static async start(): Promise<void> {
    const init = new HoffmationInitializationObject(ExampleConfig);
    init.config.telegram = undefined;
    init.config.polly = undefined;
    init.config.persistence = undefined;
    init.config.muell = undefined;
    init.config.unifiSettings = {
      nvrOptions: {
        nvrAddress: 'xxx',
        username: 'api_hoffmation',
        usernameAccess: 'api_hoffmation',
        password: 'yyy',
      },
    };
    await HoffmationBase.initializeBeforeIoBroker(init);
    RoomService.Rooms.set('TestRoom', new RoomBase(new Map<GroupType, BaseGroup>(), 'Test Room'));
    if (!init.config.unifiSettings.nvrOptions) throw new Error('No unifi config found');
    const cam: OwnUnifiCamera = new OwnUnifiCamera('Kamera Vorne Links', 'TestRoom', 'Vorne Links');
    UnifiProtect.addDevice(cam);
    const protect: UnifiProtect = new UnifiProtect(init.config.unifiSettings.nvrOptions);
    // Test some device reconnect
    setTimeout(() => {
      console.log('Reconnect Device:');
    }, 10000);

    setTimeout(() => {
      console.log('shutdown-now');
      protect.dispose();
      process.exit(1);
    }, 45000);
  }
}

void UnifiProtectTest.start();

process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});
