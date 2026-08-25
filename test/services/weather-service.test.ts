import { HTTPSOptions, HTTPSService, LogLevel, ServerLogService, WeatherService } from '../../src';

jest.mock('unifi-access', () => jest.fn()); // Working now, phew

/** A city coordinate, deliberately not an installation site. */
const CITY_LATITUDE: string = '52.03';
const CITY_LONGITUDE: string = '8.53';

describe('WeatherService', () => {
  jest.setTimeout(10000);
  beforeAll(async () => {
    WeatherService.initialize({
      lattitude: CITY_LATITUDE,
      longitude: CITY_LONGITUDE,
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

/** The private statics the forecast request is assembled from, plus the consumers it notifies. */
interface iWeatherServiceInternals {
  latitude: string;
  longitude: string;
  appID?: string;
  _dataUpdateCbs: { [name: string]: () => void };
  getWeatherData(): void;
}

/** Synthetic stand-in for the weather key, never a real one. */
const PLACEHOLDER_APPID: string = 'test-appid-placeholder';

/**
 * What the forecast endpoint answers, cut down to the fields the service reads - and carrying the coordinate
 * back, which the real endpoint does as well. That echo is why the answer may not be logged raw either.
 */
const FORECAST_ANSWER: string =
  `{"lat":${CITY_LATITUDE},"lon":${CITY_LONGITUDE},` +
  '"current":{"temp":21.4,"feels_like":21},"daily":[{"temp":{"max":27.5}}]}';

/**
 * The live forecast request carries the weather key and the plant's coordinate, and this repository is
 * public. `HTTPSOptions` logs the path it is **constructed** with at Debug, which is the level an operator
 * runs at - so whatever is assembled before that constructor returns ends up in a file that outlives the
 * process.
 *
 * Both halves are asserted below on purpose: that the request really carries key and coordinate, and that
 * neither reaches a log line. Without the first half a service that simply stopped assembling the query
 * would pass the second one while fetching nothing.
 */
describe('the live forecast request', () => {
  const internals: iWeatherServiceInternals = WeatherService as unknown as iWeatherServiceInternals;

  it('carries key and location in the request and in no log line', () => {
    const logged: string[] = [];
    const logSpy = jest
      .spyOn(ServerLogService, 'writeLog')
      .mockImplementation((_level: LogLevel, message: string): void => {
        logged.push(message);
      });
    let requested: HTTPSOptions | undefined;
    const requestSpy = jest
      .spyOn(HTTPSService, 'request')
      .mockImplementation(
        (
          options: HTTPSOptions,
          _postData?: string,
          _retries?: number,
          callback?: (data: string, statuscode: number) => void,
        ): void => {
          requested = options;
          callback?.(FORECAST_ANSWER, 200);
        },
      );
    // Set rather than handed to `initialize`: that one starts the ten minute refresh interval, and a case
    // about one request has no business leaving a timer behind.
    internals.latitude = CITY_LATITUDE;
    internals.longitude = CITY_LONGITUDE;
    internals.appID = PLACEHOLDER_APPID;

    try {
      internals.getWeatherData();

      // The request really does carry key and location. Without this half, a service that never assembles
      // them would satisfy the assurance below while fetching nothing.
      expect(requested?.path).toContain(PLACEHOLDER_APPID);
      expect(requested?.path).toContain(CITY_LATITUDE);
      expect(requested?.path).toContain(CITY_LONGITUDE);
      // ... and the answer really was taken apart, so the case is not passing on a request that failed.
      expect(WeatherService.lastResponse?.current.temp).toBe(21.4);

      // ... and none of the three ever reached a log line. `HTTPSOptions` logs the path it is *constructed*
      // with, so collapsing the redacted construction and the assignment of the real query into a single
      // constructor call - which is exactly what this code looks like it wants - shows up right here. The
      // raw answer is covered by the same three assertions, because it mirrors the coordinate back.
      logged.forEach((message: string) => {
        expect(message).not.toContain(PLACEHOLDER_APPID);
        expect(message).not.toContain(CITY_LATITUDE);
        expect(message).not.toContain(CITY_LONGITUDE);
      });
      // The redacted path still names the request, otherwise the log line would be worthless and the
      // redaction would be achieved by saying nothing at all.
      expect(logged.some((message: string) => message.includes('onecall'))).toBe(true);
    } finally {
      logSpy.mockRestore();
      requestSpy.mockRestore();
      internals.appID = undefined;
      WeatherService.lastResponse = undefined;
    }
  });
});

/**
 * A forecast request can end without an answer at all, and it can end with an answer that is not a forecast.
 * `HTTPSService.request` reports the first as `failureStatusCode`, and the endpoint reports the second as a
 * status code of its own: a refused key answers 401, an exhausted quota 429. All of those bodies parse as
 * JSON just as readily as a forecast does, so the shape of the body cannot be the thing that decides.
 */
describe('the answer of the forecast endpoint is checked before it is believed', () => {
  const internals: iWeatherServiceInternals = WeatherService as unknown as iWeatherServiceInternals;

  /** What a refused key answers with: readable JSON, and not a single field of a forecast. */
  const REFUSAL_ANSWER: string = '{"cod":401,"message":"Invalid API key"}';

  /**
   * Runs one forecast request against a canned outcome, with the service in a known state before and after.
   * @param response - The body the request ends with
   * @param statusCode - The status code it ends with
   * @returns - Every message that reached the log while the request ran
   */
  function requestWith(response: string, statusCode: number): string[] {
    const logged: string[] = [];
    const logSpy = jest
      .spyOn(ServerLogService, 'writeLog')
      .mockImplementation((_level: LogLevel, message: string): void => {
        logged.push(message);
      });
    const requestSpy = jest
      .spyOn(HTTPSService, 'request')
      .mockImplementation(
        (
          _options: HTTPSOptions,
          _postData?: string,
          _retries?: number,
          callback?: (data: string, statuscode: number) => void,
        ): void => {
          callback?.(response, statusCode);
        },
      );
    // Set rather than handed to `initialize`: that one starts the ten minute refresh interval, and a case
    // about one request has no business leaving a timer behind.
    internals.latitude = CITY_LATITUDE;
    internals.longitude = CITY_LONGITUDE;
    internals.appID = PLACEHOLDER_APPID;
    WeatherService.lastResponse = undefined;
    try {
      internals.getWeatherData();
      return logged;
    } finally {
      logSpy.mockRestore();
      requestSpy.mockRestore();
      internals.appID = undefined;
    }
  }

  afterEach(() => {
    internals._dataUpdateCbs = {};
    WeatherService.lastResponse = undefined;
  });

  it('keeps the last forecast when the request got no answer at all', () => {
    let notified: number = 0;
    WeatherService.addWeatherUpdateCb('case: no answer', () => notified++);

    const logged: string[] = requestWith(HTTPSService.failureResponse, HTTPSService.failureStatusCode);

    // Nothing was taken from a request that never got an answer, and nobody downstream was told there was
    // fresh weather.
    expect(WeatherService.lastResponse).toBeUndefined();
    expect(notified).toBe(0);
    // ... and no line claims an answer arrived, because none did.
    expect(logged.some((message: string) => message.includes('Response erhalten'))).toBe(false);
    // ... while the failure itself is still reported, so the silence is not the fix.
    expect(logged.some((message: string) => message.includes(`${HTTPSService.failureStatusCode}`))).toBe(true);
  });

  it('does not take a refused key for the current weather', () => {
    let notified: number = 0;
    WeatherService.addWeatherUpdateCb('case: refused key', () => notified++);

    // The body parses without complaint - `guardedFunction` never sees a thing. Only the status code
    // separates this from a forecast.
    const logged: string[] = requestWith(REFUSAL_ANSWER, 401);

    expect(WeatherService.lastResponse).toBeUndefined();
    expect(notified).toBe(0);
    expect(logged.some((message: string) => message.includes('401'))).toBe(true);
  });

  it('still processes an answer of the successful range', () => {
    // The other half: a caller whose request succeeds may not notice any of the above.
    let notified: number = 0;
    WeatherService.addWeatherUpdateCb('case: forecast', () => notified++);

    requestWith(FORECAST_ANSWER, 200);

    expect(WeatherService.lastResponse?.current.temp).toBe(21.4);
    expect(notified).toBe(1);
  });
});
