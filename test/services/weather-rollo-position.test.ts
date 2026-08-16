import { LogLevel, ServerLogService, ShutterSettings, WeatherResponse, WeatherService } from '../../src';

jest.mock('unifi-access', () => jest.fn());

/**
 * Builds a minimal weather response containing only the fields the shutter logic reads.
 * @param todayMaxTemp - The forecasted maximum temperature for today
 * @param currentCloudiness - The current cloudiness in percent
 * @returns A weather response usable as {@link WeatherService.lastResponse}
 */
function buildResponse(todayMaxTemp: number, currentCloudiness: number): WeatherResponse {
  return {
    current: { clouds: currentCloudiness },
    daily: [{ temp: { max: todayMaxTemp } }],
  } as unknown as WeatherResponse;
}

describe('WeatherService.weatherRolloPosition', () => {
  const noopLogger = (): void => {
    // Test logging is silenced on purpose.
  };
  const normalPos: number = 100;
  const desiredTemp: number = 21.5;
  // Close enough to the desired temperature to not trigger the shading on its own,
  // so these cases isolate the outside temperature path.
  const roomTemp: number = 22;
  let settings: ShutterSettings;

  /**
   * Runs the shutter logic with the shared room/position defaults.
   * @returns The target position
   */
  function position(): number {
    return WeatherService.weatherRolloPosition(normalPos, desiredTemp, roomTemp, noopLogger, settings);
  }

  beforeAll(() => {
    ServerLogService.settings.logLevel = -1;
    // Plenty of time left until sunset, so that branch never short-circuits the tests.
    jest.spyOn(WeatherService as unknown as { hoursTilSunset: () => number }, 'hoursTilSunset').mockReturnValue(5);
  });

  beforeEach(() => {
    settings = new ShutterSettings();
    settings.direction = 90; // East facing, like the kitchen windows.
    settings.heatReductionPosition = 45;
    // The shipped default of 27 closes every shutter all day long on an ordinary summer day,
    // so these cases assume a system configured to insulate only in real heat.
    settings.heatReductionThreshold = 33;
    // Morning sun in the east, so the east facing window is fully exposed.
    WeatherService.sunDirection = 90;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('cloudiness', () => {
    it('should not reduce on a hot but heavily overcast day', () => {
      WeatherService.lastResponse = buildResponse(28.32, 95);
      expect(position()).toBe(normalPos);
    });

    it('should fully reduce on a hot and clear day', () => {
      WeatherService.lastResponse = buildResponse(28.32, 10);
      expect(position()).toBe(45);
    });

    it('should partially reduce on a hot and partly cloudy day', () => {
      // Halfway between the 40% and 80% thresholds --> halfway between 45 and 100, rounded to 10% steps.
      WeatherService.lastResponse = buildResponse(28.32, 60);
      expect(position()).toBe(70);
    });

    it('should not reduce on an overcast day even when the sun does face the window', () => {
      WeatherService.lastResponse = buildResponse(25, 95);
      expect(position()).toBe(normalPos);
    });
  });

  describe('sun direction', () => {
    it('should reduce on a clear day when the sun faces the window', () => {
      WeatherService.lastResponse = buildResponse(25, 10);
      expect(position()).toBe(45);
    });

    it('should not reduce below the direction independent threshold when the sun faces elsewhere', () => {
      WeatherService.lastResponse = buildResponse(25, 10);
      WeatherService.sunDirection = 270; // West, the east facing window is out of range.
      expect(position()).toBe(normalPos);
    });

    it('should fully reduce while the sun is near the window', () => {
      WeatherService.lastResponse = buildResponse(28.32, 10);
      WeatherService.sunDirection = 130; // 40 degrees off, still within the direct tolerance.
      expect(position()).toBe(45);
    });

    it('should stop reducing once the sun has moved past the tolerance', () => {
      WeatherService.lastResponse = buildResponse(28.32, 10);
      WeatherService.sunDirection = 165; // 75 degrees off, beyond the direct tolerance.
      expect(position()).toBe(normalPos);
    });

    it('should give an east window its afternoon daylight back below the insulation threshold', () => {
      // Afternoon sun in the south-west, 125 degrees away from the east facing kitchen.
      WeatherService.lastResponse = buildResponse(28.32, 10);
      WeatherService.sunDirection = 215;
      expect(position()).toBe(normalPos);
    });

    it('should respect a widened direction tolerance', () => {
      WeatherService.lastResponse = buildResponse(28.32, 10);
      WeatherService.sunDirection = 165; // 75 degrees off.
      settings.heatReductionDirectionTolerance = 90;
      expect(position()).toBe(45);
    });
  });

  describe('room temperature trigger', () => {
    it('should shade a sunlit window on a cool autumn day when the room got too warm', () => {
      // Low october sun in the south, only 15 degrees outside, but the living room heated up.
      settings.direction = 180;
      WeatherService.sunDirection = 180;
      WeatherService.lastResponse = buildResponse(15, 10);
      expect(WeatherService.weatherRolloPosition(normalPos, 21, 23, noopLogger, settings)).toBe(45);
    });

    it('should leave the shutter alone on a cool day while the room is at its desired temperature', () => {
      settings.direction = 180;
      WeatherService.sunDirection = 180;
      WeatherService.lastResponse = buildResponse(15, 10);
      expect(WeatherService.weatherRolloPosition(normalPos, 21, 21.5, noopLogger, settings)).toBe(normalPos);
    });

    it('should not shade a window the sun does not face, however warm the room is', () => {
      settings.direction = 180;
      WeatherService.sunDirection = 90;
      WeatherService.lastResponse = buildResponse(15, 10);
      expect(WeatherService.weatherRolloPosition(normalPos, 21, 25, noopLogger, settings)).toBe(normalPos);
    });

    it('should ignore missing heat group values instead of treating them as overheated', () => {
      WeatherService.lastResponse = buildResponse(15, 10);
      expect(WeatherService.weatherRolloPosition(normalPos, -99, -99, noopLogger, settings)).toBe(normalPos);
    });
  });

  describe('insulation regime', () => {
    it('should reduce regardless of direction and cloudiness when it gets really hot', () => {
      WeatherService.lastResponse = buildResponse(36, 95);
      WeatherService.sunDirection = 270;
      expect(position()).toBe(45);
    });

    it('should not apply below the insulation threshold', () => {
      WeatherService.lastResponse = buildResponse(32, 95);
      WeatherService.sunDirection = 270;
      expect(position()).toBe(normalPos);
    });
  });

  describe('general guards', () => {
    it('should not reduce close to sunset even on a hot day', () => {
      WeatherService.lastResponse = buildResponse(36, 10);
      const sunsetSpy = jest
        .spyOn(WeatherService as unknown as { hoursTilSunset: () => number }, 'hoursTilSunset')
        .mockReturnValue(0.5);
      expect(position()).toBe(normalPos);
      sunsetSpy.mockRestore();
    });

    it('should not reduce while the room still needs to heat up', () => {
      WeatherService.lastResponse = buildResponse(28.32, 10);
      expect(WeatherService.weatherRolloPosition(normalPos, desiredTemp, 20, noopLogger, settings)).toBe(normalPos);
    });

    it('should respect a shutter that is supposed to be lower anyways', () => {
      WeatherService.lastResponse = buildResponse(28.32, 10);
      expect(WeatherService.weatherRolloPosition(30, desiredTemp, roomTemp, noopLogger, settings)).toBe(30);
    });

    it('should not reduce when today stays below the lowest threshold and the room is fine', () => {
      WeatherService.lastResponse = buildResponse(22, 0);
      expect(position()).toBe(normalPos);
    });

    it('should insulate unconditionally at the shipped default threshold', () => {
      // Documents the footgun: with the default of 27 an ordinary summer day darkens every room,
      // no matter the sun direction or cloudiness.
      settings.heatReductionThreshold = new ShutterSettings().heatReductionThreshold;
      expect(settings.heatReductionThreshold).toBe(27);
      WeatherService.lastResponse = buildResponse(28.32, 95);
      WeatherService.sunDirection = 270;
      expect(position()).toBe(45);
    });

    it('should log the decision inputs on reduction', () => {
      WeatherService.lastResponse = buildResponse(28.32, 10);
      const logs: string[] = [];
      WeatherService.weatherRolloPosition(
        normalPos,
        desiredTemp,
        roomTemp,
        (level: LogLevel, message: string) => {
          if (level === LogLevel.Info) {
            logs.push(message);
          }
        },
        settings,
      );
      expect(logs.some((m) => m.includes('cloudiness: 10%') && m.includes('sunDirection: 90'))).toBe(true);
    });
  });
});
