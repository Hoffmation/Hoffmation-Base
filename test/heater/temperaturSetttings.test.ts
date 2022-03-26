import { Daytime, TemperaturSettings } from '../../lib';

describe('TemperaturSettings', () => {
  const setting: TemperaturSettings = new TemperaturSettings(new Daytime(0, 0), new Daytime(6, 0), 20);
  const setting2: TemperaturSettings = new TemperaturSettings(new Daytime(22, 0), new Daytime(24, 0), 20);
  const roomSetting: { [name: string]: TemperaturSettings } = {
    Nacht: new TemperaturSettings(new Daytime(0), new Daytime(10), 18),
    Tagsüber: new TemperaturSettings(new Daytime(10), new Daytime(22), 19),
    Abend: new TemperaturSettings(new Daytime(22), new Daytime(24), 20),
  };

  it('00:00:00.001 should be in range', () => {
    expect(setting.isNowInRange(new Date('2022-03-21 00:00:00.001+0100'))).toBeTruthy();
  });
  it('05:59:59.999 should be in range', () => {
    expect(setting.isNowInRange(new Date('2022-03-21 05:59:59.999+0100'))).toBeTruthy();
  });
  it('06:00:00.001 should not be in range', () => {
    expect(setting.isNowInRange(new Date('2022-03-21 06:00:00.001+0100'))).toBeFalsy();
  });
  it('23:59:59.999 should be in range of setting2', () => {
    expect(setting2.isNowInRange(new Date('2022-03-21 23:59:59.999+0100'))).toBeTruthy();
  });

  it('23:59:59.999 should give last range', () => {
    expect(TemperaturSettings.getActiveSetting(roomSetting, new Date('2022-03-21 23:59:59.999+0100'))?.temperatur).toBe(
      20,
    );
  });

  it('06:04:41 should give first range', () => {
    expect(TemperaturSettings.getActiveSetting(roomSetting, new Date('2022-03-21 06:04:41+0100'))?.temperatur).toBe(18);
  });
});
