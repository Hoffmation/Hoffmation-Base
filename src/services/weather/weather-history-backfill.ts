import { iPersist, iWeatherSettings } from '../../interfaces';
import { iWeatherDaySummary } from '../../interfaces/iWeatherDaySummary';
import { ServerLogService } from '../../logging';
import { LogLevel } from '../../enums';
import { HTTPSOptions } from '../HTTPSOptions';
import { HTTPSService } from '../https-service';
import { SettingsService } from '../../settings-service';
import { Utils } from '../../utils';
import { OpenWeatherDaySummary } from './open-weather-day-summary';
import { WeatherDaySummaryFetcher } from './weather-day-summary-fetcher';

/**
 * Fills the gaps in the stored daily weather aggregates from the One Call 3.0 day summary endpoint.
 *
 * Its own service instead of a method on the weather service: that one serves the live forecast, while this
 * one walks a window of past days and must stay bounded and throttled. The full recorded history is far larger
 * than a day's request quota, so the fitting window is the hard limit and the throttle keeps an accidentally
 * widened window from draining the quota in one burst.
 */
export class WeatherHistoryBackfill {
  /** Milliseconds between two calls to the weather service. */
  public static readonly defaultThrottleMs: number = 1500;
  /**
   * The band a daily air temperature in degrees Celsius can occupy. Wide on purpose - it is there to reject
   * what cannot be a temperature at all, not to second guess the weather service on a hot afternoon. The
   * bounds sit outside the coldest and the hottest reading ever recorded on the planet.
   */
  private static readonly minTemperature: number = -95;
  private static readonly maxTemperature: number = 60;
  private static readonly host: string = 'api.openweathermap.org';
  /**
   * The past days of the window that were already fetched on the running day, and the running day that was
   * recorded on.
   *
   * The attempt is remembered, not its outcome: a past day is archive, so a second fetch on the same calendar
   * day cannot yield anything the first one did not, whatever became of the first. That also covers the fetch
   * that succeeded while the write did not land - `persistWeatherDaySummary` reports nothing back, so a
   * failing write is invisible from here and would otherwise cost the full window once per run, and the
   * backfill runs far more often than once a day. The running day is remembered alongside, so a passing outage
   * heals on the next calendar day instead of staying suppressed until a restart.
   */
  private static attemptedPastDays: Set<string> = new Set<string>();
  private static attemptedPastDaysRecordedOn: string | undefined = undefined;

  /**
   * Fetches the daily weather aggregates that are missing within the fitting window and stores them, plus the
   * running day's aggregate on every run. Past days that are already stored are not fetched again, so a
   * service restart does not cost quota; the running day always is, because it is a forecast that moves. A past
   * day that was already fetched on the running day is not fetched again until the next calendar day.
   * @param persist - The persistence to read the present days from and to write the fetched ones to
   * @param referenceDate - The running day; the window ends on it, inclusive
   * @param historyWindowDays - Length of the history window in days; calls are bounded by it plus one
   * @param fetcher - The fetcher to use, defaults to the configured One Call 3.0 day summary endpoint
   * @param throttleMs - Milliseconds to wait between two calls
   * @returns - The number of days that were fetched and handed to the persistence. Not the number that
   * arrived: `persistWeatherDaySummary` reports nothing back, so whether a row landed cannot be seen from
   * here. Do not read this as a count of stored rows - look in the table for that.
   */
  public static async run(
    persist: iPersist | undefined,
    referenceDate: Date,
    historyWindowDays: number,
    fetcher?: WeatherDaySummaryFetcher,
    throttleMs: number = WeatherHistoryBackfill.defaultThrottleMs,
  ): Promise<number> {
    if (persist === undefined) {
      ServerLogService.writeLog(LogLevel.Debug, 'WeatherHistoryBackfill: no persistence configured --> nothing to do');
      return 0;
    }
    if (historyWindowDays < 1) {
      ServerLogService.writeLog(
        LogLevel.Debug,
        `WeatherHistoryBackfill: window of ${historyWindowDays} days --> nothing to do`,
      );
      return 0;
    }
    const activeFetcher: WeatherDaySummaryFetcher | undefined =
      fetcher ?? WeatherHistoryBackfill.createOpenWeatherFetcher();
    if (activeFetcher === undefined) {
      ServerLogService.writeLog(LogLevel.Warn, 'WeatherHistoryBackfill: no usable weather configuration --> skipped');
      return 0;
    }

    const days: Date[] = WeatherHistoryBackfill.windowDays(referenceDate, historyWindowDays);
    const present: Set<string> = new Set(
      (await persist.getWeatherDaySummaries(days[0], days[days.length - 1])).map((summary: iWeatherDaySummary) =>
        WeatherHistoryBackfill.dayKey(summary.date),
      ),
    );

    // The last day of the window is the running one. Its aggregate is a forecast and moves through the day,
    // so it is fetched on every run and the upsert overwrites it; a past day is archive and does not change,
    // so a stored one is never paid for twice.
    const runningDay: string = WeatherHistoryBackfill.dayKey(days[days.length - 1]);
    if (WeatherHistoryBackfill.attemptedPastDaysRecordedOn !== runningDay) {
      WeatherHistoryBackfill.resetAttemptedPastDays();
      WeatherHistoryBackfill.attemptedPastDaysRecordedOn = runningDay;
    }

    let fetched: number = 0;
    // Handed to the persistence, not confirmed as arrived - persistWeatherDaySummary reports nothing back.
    let handedOver: number = 0;
    let heldBack: number = 0;
    for (const day of days) {
      const key: string = WeatherHistoryBackfill.dayKey(day);
      if (key !== runningDay && present.has(key)) {
        continue;
      }
      if (key !== runningDay && WeatherHistoryBackfill.attemptedPastDays.has(key)) {
        heldBack++;
        continue;
      }
      if (fetched > 0 && throttleMs > 0) {
        await Utils.delay(throttleMs);
      }
      fetched++;
      if (key !== runningDay) {
        // Noted before the outcome is known, on purpose - see {@link attemptedPastDays}.
        WeatherHistoryBackfill.attemptedPastDays.add(key);
      }
      const summary: iWeatherDaySummary | undefined = await activeFetcher(day);
      if (summary === undefined) {
        continue;
      }
      persist.persistWeatherDaySummary(summary);
      handedOver++;
    }

    ServerLogService.writeLog(
      handedOver > 0 ? LogLevel.Info : LogLevel.Debug,
      `WeatherHistoryBackfill: handed ${handedOver} of ${fetched} fetched day(s) to the persistence within the last ` +
        `${historyWindowDays} days plus today, ${heldBack} day(s) held back after an earlier fetch today`,
    );
    return handedOver;
  }

  /**
   * Forgets which past days were already fetched, so the next run offers the whole window again. Called by
   * `run` itself on a change of the running day; separate so a test can start from a known state.
   */
  public static resetAttemptedPastDays(): void {
    WeatherHistoryBackfill.attemptedPastDays.clear();
    WeatherHistoryBackfill.attemptedPastDaysRecordedOn = undefined;
  }

  /**
   * Builds the fetcher against the One Call 3.0 day summary endpoint.
   * @param settings - The weather settings to use, defaults to the configured ones
   * @returns - The fetcher, or `undefined` when there is no location or no key to work with
   */
  public static createOpenWeatherFetcher(
    settings: iWeatherSettings | undefined = SettingsService.settings?.weather,
  ): WeatherDaySummaryFetcher | undefined {
    if (settings === undefined || !settings.appid || !settings.lattitude || !settings.longitude) {
      return undefined;
    }
    const location: iWeatherSettings = settings;
    return (date: Date) => WeatherHistoryBackfill.fetchDaySummary(location, date);
  }

  /**
   * The days of the fitting window, oldest first, **including the running day**. The running day is in there
   * on purpose: the gate reads today's cloud cover and maximum temperature out of the same table and through
   * the same reader as the history, so that both sides of the fit are the same quantity from the same field.
   * That is one extra call per run - the alternative was the gate deriving today's figures from a different
   * product, which measurably is not the same number.
   * @param referenceDate - The running day
   * @param historyWindowDays - Length of the history window in days
   * @returns - `historyWindowDays + 1` day starts, the last of which is the running day
   */
  private static windowDays(referenceDate: Date, historyWindowDays: number): Date[] {
    const midnight: Date = new Date(referenceDate);
    midnight.setHours(0, 0, 0, 0);
    const days: Date[] = [];
    for (let offset = historyWindowDays; offset >= 0; offset--) {
      const day: Date = new Date(midnight);
      // Calendar arithmetic instead of subtracting milliseconds, so a daylight saving change does not shift
      // every older day of the window by an hour.
      day.setDate(day.getDate() - offset);
      days.push(day);
    }
    return days;
  }

  private static async fetchDaySummary(
    settings: iWeatherSettings,
    date: Date,
  ): Promise<iWeatherDaySummary | undefined> {
    const day: string = WeatherHistoryBackfill.dayKey(date);
    return new Promise<iWeatherDaySummary | undefined>((resolve) => {
      // HTTPSOptions logs the path it is constructed with, so it is constructed with a redacted one and the
      // real query - which carries location and key - is set afterwards. The repository is public.
      // Do NOT collapse these two into one constructor call: that puts the key into a log line. The guard is
      // "keeps key and location out of the path HTTPSOptions is constructed with" in
      // test/services/dachs-history-persistence.test.ts.
      const options: HTTPSOptions = new HTTPSOptions(
        WeatherHistoryBackfill.host,
        `/data/3.0/onecall/day_summary (${day})`,
        {},
        'GET',
        443,
      );
      options.path =
        `/data/3.0/onecall/day_summary?lat=${settings.lattitude}&lon=${settings.longitude}` +
        `&date=${day}&appid=${settings.appid}&units=metric`;
      // This promise settles because the callback always comes: `HTTPSService.request` reports every way a
      // request can end - an answer, an exhausted retry chain, a failing socket, an endpoint that accepts the
      // connection and then stays silent - to its callback exactly once, and bounds each attempt by its own
      // time limit. A failure arrives as `HTTPSService.failureStatusCode`, which is not 200 and is discarded
      // below like any other unusable answer. Nothing here has to watch the clock as well; a second deadline
      // would only be able to fire before the retry does and throw away the answer it was about to bring.
      HTTPSService.request(options, '', 1, (response: string, statusCode: number) => {
        resolve(WeatherHistoryBackfill.parseDaySummary(response, statusCode, date, day));
      });
    });
  }

  private static parseDaySummary(
    response: string,
    statusCode: number,
    date: Date,
    day: string,
  ): iWeatherDaySummary | undefined {
    if (statusCode !== 200) {
      // Neither the answer nor the request is logged: both carry the key and the location.
      ServerLogService.writeLog(LogLevel.Warn, `WeatherHistoryBackfill: day summary for ${day} answered ${statusCode}`);
      return undefined;
    }
    const parsed = Utils.guardedFunction(
      () => JSON.parse(response) as OpenWeatherDaySummary,
      undefined,
      `WeatherHistoryBackfill: unreadable day summary for ${day}`,
    ) as OpenWeatherDaySummary | undefined;
    // Each leaf is established as a number in a plausible range here rather than trusted from the shape
    // above. This is the boundary: what passes is written into the table the start decision is read from,
    // and nothing between here and that decision looks at the values again.
    const cloudCover: number | undefined = WeatherHistoryBackfill.plausibleReading(
      parsed?.cloud_cover?.afternoon,
      0,
      100,
    );
    const tempMin: number | undefined = WeatherHistoryBackfill.plausibleReading(
      parsed?.temperature?.min,
      WeatherHistoryBackfill.minTemperature,
      WeatherHistoryBackfill.maxTemperature,
    );
    const tempMax: number | undefined = WeatherHistoryBackfill.plausibleReading(
      parsed?.temperature?.max,
      WeatherHistoryBackfill.minTemperature,
      WeatherHistoryBackfill.maxTemperature,
    );
    if (cloudCover === undefined || tempMin === undefined || tempMax === undefined) {
      // No substitute values: a made up cloud cover would be fitted as if it had been measured. A value
      // outside its band is discarded exactly like a missing one, for the same reason.
      ServerLogService.writeLog(LogLevel.Warn, `WeatherHistoryBackfill: incomplete day summary for ${day}`);
      return undefined;
    }
    const dayStart: Date = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    return { date: dayStart, cloudCover: cloudCover, tempMin: tempMin, tempMax: tempMax };
  }

  /**
   * Establishes one field of the answer as a reading: a real number within the band its quantity can occupy.
   *
   * `typeof` rather than `Number(...)`: a value that has to be converted first is not a reading of the
   * quantity, and converting would turn `null` into 0 and `""` into 0 - both of which pass every band. The
   * band itself catches what is numeric but cannot be the quantity, `NaN` and the infinities included, since
   * neither compares inside it.
   * @param value - The field as it arrived
   * @param min - Lowest value the quantity can take
   * @param max - Highest value the quantity can take
   * @returns - The reading, or undefined when the field is not one
   */
  private static plausibleReading(value: unknown, min: number, max: number): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      return undefined;
    }
    return value;
  }

  private static dayKey(date: Date): string {
    const month: string = `${date.getMonth() + 1}`.padStart(2, '0');
    const day: string = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
