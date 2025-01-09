import { ServerLogService, SettingsService, Utils } from '../src.js';

describe('UtilsTest', () => {
  ServerLogService.settings.logLevel = -1;
  it('Degree in Between Calculates correctly for >0 Degrees', async () => {
    expect(Utils.degreeInBetween(0, 90, 45)).toBe(true);
  });
  it('Degree in Between Calculates correctly for <0 min Degrees', async () => {
    expect(Utils.degreeInBetween(-45, 45, 0)).toBe(true);
  });
  it('Degree in Between Calculates correctly for <0 min Degrees and high degree to Check', async () => {
    expect(Utils.degreeInBetween(-45, 45, 355)).toBe(true);
  });
  it('calculates time at daylight savings change correctly', async () => {
    SettingsService.settings = SettingsService.testConfig;
    const calculatedNextTodo = Utils.nextMatchingDate(0, 0, new Date('10/30/2022, 3:24:00 AM'));
    const expectedNextTodo = new Date('10/31/2022, 0:0:00 AM');
    expect(calculatedNextTodo.getTime()).toBe(expectedNextTodo.getTime());
  });
  it('calculates upcoming time correctly', async () => {
    SettingsService.settings = SettingsService.testConfig;
    const calculatedNextTodo = Utils.nextMatchingDate(3, 0, new Date('10/31/2022, 1:24:00 AM'));
    const expectedNextTodo = new Date('10/31/2022, 3:0:00 AM');
    expect(calculatedNextTodo.getTime()).toBe(expectedNextTodo.getTime());
  });
  it('calculates passed time correctly', async () => {
    SettingsService.settings = SettingsService.testConfig;
    const calculatedNextTodo = Utils.nextMatchingDate(3, 0, new Date('10/31/2022, 4:24:00 AM'));
    const expectedNextTodo = new Date('11/01/2022, 3:0:00 AM');
    expect(calculatedNextTodo.getTime()).toBe(expectedNextTodo.getTime());
  });
  it('calculates between days correctly', async () => {
    SettingsService.settings = SettingsService.testConfig;
    const today = new Date('11/12/2022, 3:0:00 AM');
    expect(Utils.beetweenDays(today, 99, 267)).toBeFalsy();
  });
  it('rounds Dot5 correctly up', async () => {
    expect(Utils.roundDot5(4.3)).toBe(4.5);
  });
  it('rounds Dot5 correctly down', async () => {
    expect(Utils.roundDot5(4.2)).toBe(4.0);
  });
});
