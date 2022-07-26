import { ServerLogService, Utils } from '../src';

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
});
