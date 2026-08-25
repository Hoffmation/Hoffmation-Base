import {
  AcSettings,
  ActuatorSettings,
  BlockAutomaticCommand,
  CommandSource,
  DachsDeviceSettings,
  Devices,
  DimmerSettings,
  iDeviceConfig,
  Utils,
  VictronDeviceSettings,
} from '../../src';
import ExampleDevices from './exampleDevices.json';

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

  /**
   * R12, R19 - the settings the history based start decision is made with: what an installation that states
   * nothing gets, and that every one of them can actually be stated.
   *
   * Two owners, on purpose. What the consumer keeps is what describes the consumer - the hardware of the unit
   * that would burn the fuel. Everything that describes the plant, from how its recorded history is read to
   * what its battery has to have left by the morning, is stated once, on the energy manager. Identical fields
   * on two settings classes would let an installation configure a ninety day window on one device and a thirty
   * day one on the other, or two reserves for one battery.
   */
  describe('the settings of the history based start decision', () => {
    it('defaults every field of both owners to its contract value, and carries no switch on either', () => {
      const consumer: DachsDeviceSettings = new DachsDeviceSettings();
      const manager: VictronDeviceSettings = new VictronDeviceSettings();

      // A switch that is never set is the politest way to bury the work behind it. What the decision says is
      // decided by the data situation, so there is nothing left to configure on either owner.
      expect(Object.keys(consumer)).not.toContain('useHistoryGate');
      expect(Object.keys(manager)).not.toContain('useEnergyHistory');
      // What stays on the consumer is its own hardware.
      expect(consumer.dachsRatedElectricalWattage).toBe(5500);
      expect(consumer.dachsConversionFactor).toBe(0.8);
      // The dials that describe the plant are not the consumer's; they moved rather than being copied, and at
      // the same numbers as before - what changed is who states them, not what an installation that states
      // nothing gets.
      expect(Object.keys(consumer)).not.toContain('historyWindowDays');
      expect(Object.keys(consumer)).not.toContain('historyMinimumDays');
      expect(Object.keys(consumer)).not.toContain('historyBandSigma');
      expect(Object.keys(consumer)).not.toContain('minimumMorningSocReserve');
      expect(Object.keys(consumer)).not.toContain('noSunThresholdHours');
      expect(manager.historyMinimumDayCoverage).toBe(0.9);
      expect(manager.historyConsumptionQuantile).toBe(0.9);
      expect(manager.historyMinimumConsumptionDays).toBe(10);
      expect(manager.historyMinimumDays).toBe(15);
      expect(manager.historyWindowDays).toBe(90);
      expect(manager.historyBandSigma).toBe(1.0);
      // The two thresholds the morning is judged by, at the same numbers the consumer used to carry them at.
      expect(manager.minimumMorningSocReserve).toBe(20);
      expect(manager.noSunThresholdHours).toBe(0.5);
    });

    it('carries every field of the asking device through fromPartialObject', () => {
      const cases: [string, number][] = [
        ['dachsRatedElectricalWattage', 3000],
        ['dachsConversionFactor', 0.5],
      ];
      for (const [field, value] of cases) {
        const settings: DachsDeviceSettings = new DachsDeviceSettings();
        settings.fromPartialObject(JSON.parse(`{"${field}": ${JSON.stringify(value)}}`));
        // A declared field whose assignment line was forgotten fails right here.
        expect((settings as unknown as Record<string, unknown>)[field]).toBe(value);
        const untouched: DachsDeviceSettings = new DachsDeviceSettings();
        for (const [otherField] of cases.filter(([name]) => name !== field)) {
          expect((settings as unknown as Record<string, unknown>)[otherField]).toBe(
            (untouched as unknown as Record<string, unknown>)[otherField],
          );
        }
      }
    });

    it('carries every plant wide dial through the energy manager fromPartialObject', () => {
      const cases: [string, number][] = [
        ['historyMinimumDayCoverage', 0.5],
        ['historyConsumptionQuantile', 0.8],
        ['historyMinimumConsumptionDays', 4],
        ['historyMinimumDays', 25],
        ['historyWindowDays', 30],
        ['historyBandSigma', 2.5],
        ['minimumMorningSocReserve', 15],
        ['noSunThresholdHours', 0.25],
      ];
      for (const [field, value] of cases) {
        const settings: VictronDeviceSettings = new VictronDeviceSettings();
        settings.fromPartialObject(JSON.parse(`{"${field}": ${JSON.stringify(value)}}`));
        // A declared field whose assignment line was forgotten fails right here - a dial that cannot be
        // configured on its new owner is not moved but lost.
        expect((settings as unknown as Record<string, unknown>)[field]).toBe(value);
        const untouched: VictronDeviceSettings = new VictronDeviceSettings();
        for (const [otherField] of cases.filter(([name]) => name !== field)) {
          expect((settings as unknown as Record<string, unknown>)[otherField]).toBe(
            (untouched as unknown as Record<string, unknown>)[otherField],
          );
        }
      }
    });
  });
});
