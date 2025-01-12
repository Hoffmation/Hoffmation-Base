import { Daytime, TemperatureSettings } from '../../lib';

jest.mock('unifi-protect', () => jest.fn()); // Working now, phew

describe('TemperatureSettings', () => {
  const setting: TemperatureSettings = new TemperatureSettings(new Daytime(0, 0), new Daytime(6, 0), 20, 'Nacht');
  const setting2: TemperatureSettings = new TemperatureSettings(new Daytime(22, 0), new Daytime(24, 0), 20, 'Abend');
  const roomSetting: TemperatureSettings[] = [
    new TemperatureSettings(new Daytime(0), new Daytime(10), 18, 'Nacht'),
    new TemperatureSettings(new Daytime(10), new Daytime(22), 19, 'Tagsüber'),
    new TemperatureSettings(new Daytime(22), new Daytime(24), 20, 'Abend'),
  ];

  it('00:00:00.001 should be in range', () => {
    expect(TemperatureSettings.isNowInRange(setting, new Date('2022-03-21 00:00:00.001'))).toBeTruthy();
  });
  it('05:59:59.999 should be in range', () => {
    expect(TemperatureSettings.isNowInRange(setting, new Date('2022-03-21 05:59:59.999'))).toBeTruthy();
  });
  it('06:00:00.001 should not be in range', () => {
    expect(TemperatureSettings.isNowInRange(setting, new Date('2022-03-21 06:00:00.001'))).toBeFalsy();
  });
  it('23:59:59.999 should be in range of setting2', () => {
    expect(TemperatureSettings.isNowInRange(setting2, new Date('2022-03-21 23:59:59.999'))).toBeTruthy();
  });

  it('23:59:59.999 should give last range', () => {
    expect(TemperatureSettings.getActiveSetting(roomSetting, new Date('2022-03-21 23:59:59.999'))?.temperature).toBe(
      20,
    );
  });

  it('06:04:41 should give first range', () => {
    expect(TemperatureSettings.getActiveSetting(roomSetting, new Date('2022-03-21 06:04:41'))?.temperature).toBe(18);
  });
});
