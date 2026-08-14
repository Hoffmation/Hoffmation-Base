import {
  BaseGroup,
  ExampleConfig,
  GroupType,
  HoffmationBase,
  HoffmationInitializationObject,
  OwnUnifiAirQualitySensor,
  RoomBase,
  RoomService,
  UnifiProtect,
} from '../src';

export class UnifiAirQualityTest {
  public static async start(): Promise<void> {
    const init = new HoffmationInitializationObject(ExampleConfig);
    init.config.telegram = undefined;
    init.config.polly = undefined;
    init.config.persistence = undefined;
    init.config.muell = undefined;
    init.config.unifiSettings = {
      nvrOptions: {
        nvrAddress: 'xxx',
        username: 'yyy',
        usernameAccess: 'yyyy',
        password: 'zzz',
      },
    };
    await HoffmationBase.initializeBeforeIoBroker(init);
    RoomService.Rooms.set('TestRoom', new RoomBase(new Map<GroupType, BaseGroup>(), 'Test Room'));
    if (!init.config.unifiSettings.nvrOptions) throw new Error('No unifi config found');

    const galerie: OwnUnifiAirQualitySensor = new OwnUnifiAirQualitySensor('Galerie', 'TestRoom', 'Galerie');
    const serverraum: OwnUnifiAirQualitySensor = new OwnUnifiAirQualitySensor('Serverraum', 'TestRoom', 'Serverraum');
    UnifiProtect.addAirQualitySensor(galerie);
    UnifiProtect.addAirQualitySensor(serverraum);

    for (const sensor of [galerie, serverraum]) {
      sensor.addAirQualityCallback((action) => {
        console.log(`${sensor.name}: air quality changed --> ${JSON.stringify(action.newReadings)}`);
      });
      sensor.addTempChangeCallback((action) => {
        console.log(`${sensor.name}: temperature --> ${action.newTemperature} °C`);
      });
      sensor.addHumidityCallback((action) => {
        console.log(`${sensor.name}: humidity --> ${action.newHumidity} %`);
      });
    }

    const protect: UnifiProtect = new UnifiProtect(init.config.unifiSettings.nvrOptions);

    setTimeout(() => {
      for (const sensor of [galerie, serverraum]) {
        console.log(
          `${sensor.name}: ${sensor.sTemperature}, ${sensor.humidity}% humidity, reports co2: ${sensor.airQualitySensor.reports('co2')}`,
        );
      }
      console.log('shutdown-now');
      protect.dispose();
      process.exit(0);
    }, 45000);
  }
}

void UnifiAirQualityTest.start();

process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});
