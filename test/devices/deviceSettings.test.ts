import {
  AcSettings,
  ActuatorSettings,
  BlockAutomaticCommand,
  CommandSource,
  Devices,
  DimmerSettings,
  iDeviceConfig,
  Utils,
} from '../../src';
import ExampleDevices from './exampleDevices.json';

jest.mock('unifi-protect', () => jest.fn()); // Working now, phew
jest.mock('unifi-access', () => jest.fn()); // Working now, phew

describe('Device Settings', () => {
  Utils.testInitializeServices();
  jest.setTimeout(10000);
  const deviceJSON: { [id: string]: iDeviceConfig } = ExampleDevices as {
    [id: string]: iDeviceConfig;
  };
  new Devices(deviceJSON);
  it('Acutator Settings should respect partial Object', () => {
    const actuatorSettings: ActuatorSettings = new ActuatorSettings();
    actuatorSettings.dawnOn = true;
    actuatorSettings.fromPartialObject(
      JSON.parse('{"dawnOn":false,"duskOn":false,"nightOn":false,"isStromStoss":false,"stromStossResendTime":180}'),
    );
    expect(actuatorSettings.dawnOn).toBeFalsy();
  });
  it('Dimmer Settings should override actuator Settings', () => {
    const dimmerSettings: DimmerSettings = new DimmerSettings();
    dimmerSettings.dawnOn = true;
    dimmerSettings.fromPartialObject(
      JSON.parse('{"dawnOn":false,"duskOn":false,"nightOn":false,"isStromStoss":false,"stromStossResendTime":180}'),
    );
    expect(dimmerSettings.dawnOn).toBeFalsy();
  });

  // The block an AC gets when it is switched off through its heat group. It used to be a hard-coded
  // hour in heatGroup.setAc, which happened to equal the configured default - so the duration could
  // not be tuned per device the way it can everywhere else.
  describe('AC block duration comes from the settings, not from the group', () => {
    it('falls back to the global default when the device says nothing', () => {
      const settings: AcSettings = new AcSettings();

      const block = settings.buildBlockAutomaticCommand(new BlockAutomaticCommand(CommandSource.Force, 1));

      // Same span the group hard-coded before, now reached through the shared mechanism.
      expect(block?.durationMS).toBe(BlockAutomaticCommand.defaultBlockAutomaticDurationMS ?? 30 * 60 * 1000);
    });

    it('uses a per-device duration once one is configured', () => {
      const settings: AcSettings = new AcSettings();
      settings.fromPartialObject(JSON.parse('{"blockAutomaticSettings":{"blockAutomaticDurationMS":300000}}'));

      const block = settings.buildBlockAutomaticCommand(new BlockAutomaticCommand(CommandSource.Force, 1));

      expect(block?.durationMS).toBe(300000);
    });

    it('honours a device that asks for no block at all', () => {
      const settings: AcSettings = new AcSettings();
      settings.fromPartialObject(JSON.parse('{"blockAutomaticSettings":{"dontBlockAutomaticIfNotProvided":true}}'));

      expect(settings.buildBlockAutomaticCommand(new BlockAutomaticCommand(CommandSource.Force, 1))).toBeNull();
    });
  });
});
