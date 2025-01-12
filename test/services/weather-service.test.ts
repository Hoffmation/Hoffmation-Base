import { ServerLogService, WeatherService } from '../../src';

jest.mock('unifi-protect', () => jest.fn()); // Working now, phew

describe('WeatherService', () => {
  jest.setTimeout(10000);
  beforeAll(async () => {
    WeatherService.initialize({
      lattitude: '51.5078011',
      longitude: '7.3301801',
    });
    await new Promise((r) => setTimeout(r, 5000));
  });
  ServerLogService.settings.logLevel = -1;
  it('Should calculate the Sun Direction for current time', () => {
    expect(WeatherService.sunDirection).toBeDefined();
    // console.log('Weather Direction for manual test: ', WeatherService.sunDirection);
  });

  afterAll(() => {
    WeatherService.stopInterval();
  });
});
