// Imported by module path rather than through the package barrel: the barrel pulls in every device, and a
// device that is being changed in parallel would fail this suite for a reason that has nothing to do with it.
// The logging barrel has to come first - it and the utils barrel reference each other, and only this
// direction has the ring storage in place by the time the log service initialises its static field.
import { ServerLogService } from '../../src/logging';
import { PostgreSqlPersist } from '../../src/services/dbo/postgreSqlPersist';
import { iPersist } from '../../src/interfaces/iPersist';
import { iBatteryLevelSample } from '../../src/interfaces/iBatteryLevelSample';
import { iActuatorStateSample } from '../../src/interfaces/iActuatorStateSample';
import { iConsumptionWindowSample } from '../../src/interfaces/iConsumptionWindowSample';
import { iWeatherDaySummary } from '../../src/interfaces/iWeatherDaySummary';
import { iTemperatureMeasurement } from '../../src/interfaces/iTemperatureMeasurement';
import { iShutter } from '../../src/interfaces/baseDevices/iShutter';
import { iMotionSensor } from '../../src/interfaces/baseDevices/iMotionSensor';
import { iRoomBase } from '../../src/interfaces/iRoomBase';
import { iBaseDevice } from '../../src/interfaces/baseDevices/iBaseDevice';
import { iButtonSwitch } from '../../src/interfaces/baseDevices/iButtonSwitch';
import { WeatherHistoryBackfill } from '../../src/services/weather/weather-history-backfill';
import { WeatherDaySummaryFetcher } from '../../src/services/weather/weather-day-summary-fetcher';
import { HTTPSOptions } from '../../src/services/HTTPSOptions';
import { HTTPSService } from '../../src/services/https-service';
import { ButtonPressType, LogLevel } from '../../src/enums';

const mockQuery = jest.fn();
const mockConnect = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockQuery,
    connect: mockConnect,
  })),
}));
jest.mock('unifi-access', () => jest.fn());

/**
 * The persistence side of the history based start decision: reading the recorded state of charge, the
 * recorded run times of the combined heat and power unit and the daily weather aggregates - plus the
 * bounded backfill that fills the gaps in the latter.
 *
 * All rows below are synthetic. No coordinate of a real installation and no weather key appears here; the
 * only location used is the city of Bielefeld.
 */

/** Synthetic device id, never an id of a real installation. */
const DACHS_DEVICE_ID: string = 'dachs-test-0001';
/** The city coordinate of the test data - a city, not an installation. */
const CITY_LATITUDE: string = '52.03';
const CITY_LONGITUDE: string = '8.53';
/**
 * A placeholder, never a real key - F-K24 below asserts that exactly this string is *absent* from every log
 * line, so no case here ever needs a real one.
 */
const PLACEHOLDER_APPID: string = 'test-appid-placeholder';
/** `historyWindowDays` default of the contract. */
const HISTORY_WINDOW_DAYS: number = 90;

/**
 * The start of a calendar day in the machine's zone - which is what the backfill works in, because it walks
 * calendar days rather than fixed offsets. Building these at UTC midnight instead made two of the backfill
 * assertions below pass under UTC and fail under Berlin.
 * @param isoDay - The day in `YYYY-MM-DD` form
 * @returns - Local midnight of that day
 */
function day(isoDay: string): Date {
  const parts: number[] = isoDay.split('-').map((part) => Number(part));
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 * What the driver actually hands back for a `timestamp without time zone`: the write path stores
 * `toISOString()`, PostgreSQL drops the zone suffix and keeps the UTC wall clock, and then
 * `postgres-date/index.js:49-50` rebuilds those naive components with the **local** multi argument
 * constructor (registered for OID 1114 in `pg-types/lib/textParsers.js:175`). So the Date the driver produces
 * carries the stored wall clock in local components, off by the machine's zone offset. Handing an ISO string
 * back instead would model the column as zone aware, which the DDL says it is not.
 * @param instant - The moment the value was stored for
 * @returns - The Date the driver produces for it
 */
function driverTimestamp(instant: Date): Date {
  return new Date(
    instant.getUTCFullYear(),
    instant.getUTCMonth(),
    instant.getUTCDate(),
    instant.getUTCHours(),
    instant.getUTCMinutes(),
    instant.getUTCSeconds(),
    instant.getUTCMilliseconds(),
  );
}

function dayKey(date: Date): string {
  const month: string = `${date.getMonth() + 1}`.padStart(2, '0');
  const dayOfMonth: string = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${dayOfMonth}`;
}

/**
 * D-DB-1, column scale fassung - the column holds a fraction rather than a percentage
 * (victron-device.ts:279 divides by 100 before persisting). The levels are strings and numbers in turn: a
 * `double precision` column arrives as a number (`pg-types/lib/textParsers.js:172`), so both shapes are real.
 */
const D_DB_1: unknown[] = [
  { batteryLevel: '0.62', endDate: driverTimestamp(new Date('2026-06-21T00:00:00.000Z')) },
  { batteryLevel: 0.44, endDate: driverTimestamp(new Date('2026-06-21T04:00:00.000Z')) },
  { batteryLevel: '0.38', endDate: driverTimestamp(new Date('2026-06-21T06:00:00.000Z')) },
];

/**
 * Levels that are not a state of charge: no value at all (the column was added later), the "battery says
 * nothing" sentinel -1 as it lands in the column, the hard zero an energy manager that never sets the field
 * leaves behind, and a row without an interval end to date it at.
 */
const D_DB_1_UNUSABLE: unknown[] = [
  { batteryLevel: null, endDate: driverTimestamp(new Date('2026-06-21T00:00:00.000Z')) },
  { batteryLevel: '-0.01', endDate: driverTimestamp(new Date('2026-06-21T00:15:00.000Z')) },
  { batteryLevel: '0', endDate: driverTimestamp(new Date('2026-06-21T00:30:00.000Z')) },
  { batteryLevel: '0.44', endDate: null },
  { batteryLevel: '0.38', endDate: driverTimestamp(new Date('2026-06-21T00:45:00.000Z')) },
];

/** D-DB-4 - actuator state changes of the synthetic device. */
const D_DB_4: unknown[] = [
  { deviceID: DACHS_DEVICE_ID, on: true, date: driverTimestamp(new Date('2026-06-27T17:00:00.000Z')) },
  { deviceID: DACHS_DEVICE_ID, on: false, date: driverTimestamp(new Date('2026-06-27T18:30:00.000Z')) },
];

/**
 * House consumption rows. `injectedKwH` is carried along deliberately: it is export, and a reader that adds
 * it in would report 1.25 / 1.60 / 0.60 instead of 0.35 / 0.40 / 0.60.
 */
const D_DB_8: unknown[] = [
  {
    selfConsumedKwH: '0.2500',
    drawnKwH: '0.1000',
    injectedKwH: '0.9000',
    endDate: driverTimestamp(new Date('2026-06-21T16:15:00.000Z')),
  },
  {
    selfConsumedKwH: 0.4,
    drawnKwH: 0.0,
    injectedKwH: 1.2,
    endDate: driverTimestamp(new Date('2026-06-21T16:30:00.000Z')),
  },
  {
    selfConsumedKwH: '0.0000',
    drawnKwH: '0.6000',
    injectedKwH: '0.0000',
    endDate: driverTimestamp(new Date('2026-06-21T16:45:00.000Z')),
  },
];

/** Consumption rows that cannot be used: no value at all, and no interval end to date them at. */
const D_DB_9: unknown[] = [
  {
    selfConsumedKwH: null,
    drawnKwH: '0.1000',
    injectedKwH: '0.0000',
    endDate: driverTimestamp(new Date('2026-06-21T16:15:00.000Z')),
  },
  {
    selfConsumedKwH: '0.4000',
    drawnKwH: '0.0000',
    injectedKwH: '0.0000',
    endDate: driverTimestamp(new Date('2026-06-21T16:30:00.000Z')),
  },
  { selfConsumedKwH: '0.3000', drawnKwH: '0.2000', injectedKwH: '0.0000', endDate: null },
];

/** D-WEATHER-1 .. D-WEATHER-8. */
const D_WEATHER: iWeatherDaySummary[] = [
  { date: day('2026-06-21'), cloudCover: 8, tempMin: 14.0, tempMax: 27.5 },
  { date: day('2026-06-22'), cloudCover: 15, tempMin: 13.5, tempMax: 26.0 },
  { date: day('2026-06-24'), cloudCover: 78, tempMin: 15.0, tempMax: 21.0 },
  { date: day('2026-06-25'), cloudCover: 65, tempMin: 14.0, tempMax: 20.5 },
  { date: day('2026-06-27'), cloudCover: 42, tempMin: 14.5, tempMax: 24.0 },
  { date: day('2026-06-28'), cloudCover: 50, tempMin: 14.0, tempMax: 23.0 },
  { date: day('2026-09-15'), cloudCover: 92, tempMin: 11.0, tempMax: 15.5 },
  { date: day('2026-09-16'), cloudCover: 88, tempMin: 10.5, tempMax: 14.0 },
];

function createPersist(initialized: boolean = true): PostgreSqlPersist {
  const persist: PostgreSqlPersist = new PostgreSqlPersist({});
  persist.initialized = initialized;
  return persist;
}

function lastQuery(): string {
  return mockQuery.mock.calls[mockQuery.mock.calls.length - 1][0] as string;
}

/**
 * The bind values of the last statement - `undefined` for a statement that carries none.
 * @returns - What the driver was handed to bind into the placeholders
 */
function lastValues(): unknown[] | undefined {
  return mockQuery.mock.calls[mockQuery.mock.calls.length - 1][1] as unknown[] | undefined;
}

/**
 * The first statement that contains the given fragment, with its bind values.
 * @param fragment - A fragment identifying the statement
 * @returns - The statement text and what was bound into it
 */
function queryContaining(fragment: string): { sql: string; values: unknown[] | undefined } {
  const call = mockQuery.mock.calls.find((c) => (c[0] as string).includes(fragment)) as [string, unknown[]?];
  return { sql: call[0], values: call[1] };
}

/**
 * A persistence that only answers the two calls the backfill makes, recording what it was asked to store.
 * @param present - The aggregates that are already stored
 * @param writeLands - Whether a write actually lands; `false` models a write path that drops everything
 * @returns - The stub and the list it writes into
 */
function createBackfillPersistStub(
  present: iWeatherDaySummary[],
  writeLands: boolean = true,
): {
  persist: iPersist;
  stored: iWeatherDaySummary[];
} {
  const stored: iWeatherDaySummary[] = [];
  const persist = {
    getWeatherDaySummaries: (startDate: Date, endDate: Date): Promise<iWeatherDaySummary[]> =>
      Promise.resolve(
        present.filter((s) => s.date.getTime() >= startDate.getTime() && s.date.getTime() <= endDate.getTime()),
      ),
    persistWeatherDaySummary: (summary: iWeatherDaySummary): void => {
      // `persistWeatherDaySummary` returns void and is not awaited, and the query underneath logs a warning
      // and resolves null on a failure - while the persistence is not ready it does not even do that. So a
      // write that never lands is indistinguishable from one that did, from the backfill's side and hence
      // from here: the only observable difference is that the read path stays empty.
      if (!writeLands) {
        return;
      }
      stored.push(summary);
    },
  } as unknown as iPersist;
  return { persist: persist, stored: stored };
}

describe('Dachs history persistence', () => {
  ServerLogService.settings.logLevel = -1;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockConnect.mockResolvedValue(undefined);
    mockQuery.mockResolvedValue({ rows: [] });
    // The backfill remembers the past days it already fetched, and that memory is static. Without this every
    // case that shares a reference day with an earlier one would inherit those days.
    WeatherHistoryBackfill.resetAttemptedPastDays();
  });

  describe('R1 - reading the state of charge history', () => {
    it('maps rows to samples', async () => {
      mockQuery.mockResolvedValue({ rows: D_DB_1 });
      const persist: PostgreSqlPersist = createPersist();

      const result: iBatteryLevelSample[] = await persist.getBatteryLevelHistory(
        new Date('2026-06-21T00:00:00+02:00'),
        new Date('2026-06-22T00:00:00+02:00'),
      );

      expect(result).toHaveLength(3);
      // Percent, not the fraction the column holds. Passing the column through would make a usual night cost
      // 0.2 instead of 20 points, and the lower band edge would then hold at every state of charge.
      expect(result.map((s) => s.level)).toStrictEqual([62, 44, 38]);
      result.forEach((sample) => {
        expect(typeof sample.level).toBe('number');
        expect(sample.date).toBeInstanceOf(Date);
        expect(isNaN(sample.date.getTime())).toBe(false);
      });
      expect(result[0].date.toISOString()).toBe('2026-06-21T00:00:00.000Z');
    });

    it('drops levels that are not a state of charge', async () => {
      mockQuery.mockResolvedValue({ rows: D_DB_1_UNUSABLE });
      const persist: PostgreSqlPersist = createPersist();

      const result: iBatteryLevelSample[] = await persist.getBatteryLevelHistory(
        new Date('2026-06-21T00:00:00+02:00'),
        new Date('2026-06-22T00:00:00+02:00'),
      );

      // Only the last row survives: no value, the -1 sentinel of a silent battery, the hard zero of an energy
      // manager that never records the level, and a row without an interval end are all unusable - and none
      // of them may become an invented trough.
      expect(result).toHaveLength(1);
      expect(result[0].level).toBe(38);
      expect(result.every((s) => s.level > 0 && s.level <= 100)).toBe(true);
    });

    it('returns an empty list on an empty answer, a failing query and an uninitialized persistence', async () => {
      const start: Date = new Date('2026-06-21T00:00:00+02:00');
      const end: Date = new Date('2026-06-22T00:00:00+02:00');
      const persist: PostgreSqlPersist = createPersist();

      mockQuery.mockResolvedValue({ rows: [] });
      expect(await persist.getBatteryLevelHistory(start, end)).toStrictEqual([]);

      mockQuery.mockRejectedValue(new Error('connection reset'));
      expect(await persist.getBatteryLevelHistory(start, end)).toStrictEqual([]);

      // While the persistence is not ready the reader does not even reach the database.
      mockQuery.mockReset();
      expect(await createPersist(false).getBatteryLevelHistory(start, end)).toStrictEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('restricts the query to the requested window and fixes the order', async () => {
      const start: Date = new Date('2026-03-18T00:00:00+02:00');
      const end: Date = new Date('2026-06-16T00:00:00+02:00');
      const persist: PostgreSqlPersist = createPersist();

      await persist.getBatteryLevelHistory(start, end);

      const query: string = lastQuery();
      expect(query).toContain(start.toISOString());
      expect(query).toContain(end.toISOString());
      // The order has to be observable, because the calculation core is handed whatever this returns.
      expect(query).toContain('ORDER BY "endDate" DESC');
    });
  });

  describe('R2 - reading the run times', () => {
    it('maps rows to state samples', async () => {
      mockQuery.mockResolvedValue({ rows: D_DB_4 });
      const persist: PostgreSqlPersist = createPersist();

      const result: iActuatorStateSample[] = await persist.getActuatorHistory(
        DACHS_DEVICE_ID,
        new Date('2026-06-27T00:00:00+02:00'),
        new Date('2026-06-28T00:00:00+02:00'),
      );

      expect(result).toHaveLength(2);
      expect(result.map((s) => s.on)).toStrictEqual([true, false]);
      result.forEach((sample) => {
        expect(typeof sample.on).toBe('boolean');
        expect(sample.date).toBeInstanceOf(Date);
      });
      expect(result[0].date.toISOString()).toBe('2026-06-27T17:00:00.000Z');
    });

    it('returns an empty list on an empty answer and on a failing query', async () => {
      const persist: PostgreSqlPersist = createPersist();

      mockQuery.mockResolvedValue({ rows: [] });
      expect(
        await persist.getActuatorHistory(
          DACHS_DEVICE_ID,
          new Date('2026-06-27T00:00:00+02:00'),
          new Date('2026-06-28T00:00:00+02:00'),
        ),
      ).toStrictEqual([]);

      mockQuery.mockRejectedValue(new Error('connection reset'));
      expect(
        await persist.getActuatorHistory(
          DACHS_DEVICE_ID,
          new Date('2026-06-27T00:00:00+02:00'),
          new Date('2026-06-28T00:00:00+02:00'),
        ),
      ).toStrictEqual([]);
    });

    it('filters by device', async () => {
      const start: Date = new Date('2026-06-27T00:00:00+02:00');
      const end: Date = new Date('2026-06-28T00:00:00+02:00');
      const persist: PostgreSqlPersist = createPersist();

      await persist.getActuatorHistory(DACHS_DEVICE_ID, start, end);

      // The device id is bound, not pasted into the statement: an id is a string this reader is handed from
      // outside, and a string inside quotes can close them. The filter is still asserted, through the
      // placeholders rather than through the statement text.
      const query: string = lastQuery();
      expect(query).toContain('"deviceID" = $1');
      expect(query).not.toContain(DACHS_DEVICE_ID);
      expect(lastValues()).toEqual([DACHS_DEVICE_ID, start.toISOString(), end.toISOString()]);
    });

    it('cannot have a device id close out of its own literal', async () => {
      // Not a scenario anyone expects for a device id - it is the shape of the mistake this makes
      // structurally impossible, tested where the reader is rather than argued about in a comment.
      const hostileId: string = `x' OR '1'='1`;
      const persist: PostgreSqlPersist = createPersist();

      await persist.getActuatorHistory(hostileId, new Date('2026-06-27T00:00:00Z'), new Date('2026-06-28T00:00:00Z'));

      expect(lastQuery()).not.toContain(hostileId);
      expect(lastQuery()).not.toContain(`OR '1'='1`);
      expect((lastValues() as unknown[])[0]).toBe(hostileId);
    });
  });

  describe('reading the temperature history', () => {
    it('binds the device id instead of pasting it into the statement', async () => {
      const start: Date = new Date('2026-06-27T00:00:00+02:00');
      const end: Date = new Date('2026-06-28T00:00:00+02:00');
      const persist: PostgreSqlPersist = createPersist();

      await persist.getTemperatureHistory(DACHS_DEVICE_ID, start, end);

      // Same shape as the actuator reader next to it: the id is a string this reader is handed from outside,
      // and a string inside quotes can close them. The window is still asserted, through the placeholders.
      const query: string = lastQuery();
      expect(query).toContain('"deviceID" = $1');
      expect(query).not.toContain(DACHS_DEVICE_ID);
      expect(lastValues()).toEqual([DACHS_DEVICE_ID, start.toISOString(), end.toISOString()]);
      expect(query).toContain('ORDER BY DATE DESC');
    });

    it('cannot have a device id close out of its own literal', async () => {
      // Not a shape anyone expects for a device id - it is the mistake this makes structurally impossible,
      // tested where the reader is rather than argued about in a comment.
      const hostileId: string = `x' OR '1'='1`;
      const persist: PostgreSqlPersist = createPersist();

      await persist.getTemperatureHistory(
        hostileId,
        new Date('2026-06-27T00:00:00Z'),
        new Date('2026-06-28T00:00:00Z'),
      );

      expect(lastQuery()).not.toContain(hostileId);
      expect(lastQuery()).not.toContain(`OR '1'='1`);
      expect((lastValues() as unknown[])[0]).toBe(hostileId);
    });

    it('drops a measurement without a value or without a date instead of inventing either', async () => {
      // The column is nullable (see the DDL in initialize()), and the write path stores a null whenever the
      // sensor has nothing to say. Read through a plain conversion an absent value becomes 0, which is not an
      // impossible temperature but a perfectly ordinary winter reading - so it never looks wrong anywhere
      // downstream, it just pulls every average it enters towards freezing. An absent timestamp read as a Date
      // lands on 1970-01-01, which is a plausible looking measurement at the far edge of every window rather
      // than a missing one.
      mockQuery.mockResolvedValue({
        rows: [
          { temperature: null, date: driverTimestamp(new Date('2026-06-27T16:00:00.000Z')) },
          { temperature: '', date: driverTimestamp(new Date('2026-06-27T16:30:00.000Z')) },
          { temperature: 'n/a', date: driverTimestamp(new Date('2026-06-27T16:45:00.000Z')) },
          { temperature: '21.5', date: null },
          { temperature: '19.0', date: driverTimestamp(new Date('2026-06-27T17:00:00.000Z')) },
        ],
      });
      const persist: PostgreSqlPersist = createPersist();

      const result: iTemperatureMeasurement[] = await persist.getTemperatureHistory(
        DACHS_DEVICE_ID,
        new Date('2026-06-27T00:00:00+02:00'),
        new Date('2026-06-28T00:00:00+02:00'),
      );

      expect(result).toHaveLength(1);
      expect(result[0].temperature).toBe(19);
      expect(result.some((m) => m.temperature === 0)).toBe(false);
      expect(result.every((m) => isFinite(m.temperature))).toBe(true);
      expect(result.some((m) => m.date.getFullYear() === 1970)).toBe(false);
    });

    it('keeps a genuine zero degrees, which is a reading and not an absent one', async () => {
      // The other half of the case above: freezing point is a temperature this installation really sees, and
      // dropping it would trade an invented reading for a missing one.
      mockQuery.mockResolvedValue({
        rows: [
          { temperature: '0', date: driverTimestamp(new Date('2026-01-15T06:00:00.000Z')) },
          { temperature: 0, date: driverTimestamp(new Date('2026-01-15T07:00:00.000Z')) },
          { temperature: '-4.5', date: driverTimestamp(new Date('2026-01-15T08:00:00.000Z')) },
        ],
      });
      const persist: PostgreSqlPersist = createPersist();

      const result: iTemperatureMeasurement[] = await persist.getTemperatureHistory(
        DACHS_DEVICE_ID,
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-02-01T00:00:00.000Z'),
      );

      expect(result).toHaveLength(3);
      expect(result.map((m) => m.temperature)).toStrictEqual([0, 0, -4.5]);
    });
  });

  describe('the remaining readers that filter by an id', () => {
    /**
     * An id that closes the literal it would be pasted into and appends a condition of its own. Not a shape
     * anyone expects for a device id - it is the mistake this makes structurally impossible, asserted where
     * the reader is rather than argued about in a comment.
     */
    const HOSTILE_ID: string = `x' OR '1'='1`;

    /**
     * A device that is nothing but an id and a name to log - which is all these two readers touch.
     * @param id - The id the reader is to filter by
     * @returns - The stub, typed as whatever the reader asks for
     */
    function deviceStub<T>(id: string): T {
      return { id: id, info: { fullName: `stub ${id}` } } as unknown as T;
    }

    it('binds the device id of the last desired shutter position', async () => {
      const persist: PostgreSqlPersist = createPersist();

      await persist.getLastDesiredPosition(deviceStub<iShutter>(DACHS_DEVICE_ID));

      const query: string = lastQuery();
      expect(query).toContain('"deviceID" = $1');
      expect(query).not.toContain(DACHS_DEVICE_ID);
      expect(lastValues()).toEqual([DACHS_DEVICE_ID]);
      // The window and the order are the reader's own text and stay in the statement.
      expect(query).toContain('date >= CURRENT_DATE');
      expect(query).toContain('ORDER BY date desc');
    });

    it('cannot have a shutter id close out of its own literal', async () => {
      const persist: PostgreSqlPersist = createPersist();

      await persist.getLastDesiredPosition(deviceStub<iShutter>(HOSTILE_ID));

      expect(lastQuery()).not.toContain(HOSTILE_ID);
      expect(lastQuery()).not.toContain(`OR '1'='1`);
      expect((lastValues() as unknown[])[0]).toBe(HOSTILE_ID);
    });

    it('binds the device id of the movement count', async () => {
      const persist: PostgreSqlPersist = createPersist();

      await persist.motionSensorTodayCount(deviceStub<iMotionSensor>(DACHS_DEVICE_ID));

      const query: string = lastQuery();
      expect(query).toContain('"deviceID" = $1');
      expect(query).not.toContain(DACHS_DEVICE_ID);
      expect(lastValues()).toEqual([DACHS_DEVICE_ID]);
      // The second condition of the filter is the reader's own text: without it the count would include the
      // rows that record no movement.
      expect(query).toContain('"movementDetected"');
    });

    it('cannot have a motion sensor id close out of its own literal', async () => {
      const persist: PostgreSqlPersist = createPersist();

      await persist.motionSensorTodayCount(deviceStub<iMotionSensor>(HOSTILE_ID));

      expect(lastQuery()).not.toContain(HOSTILE_ID);
      expect(lastQuery()).not.toContain(`OR '1'='1`);
      expect((lastValues() as unknown[])[0]).toBe(HOSTILE_ID);
    });

    it('binds the id of the settings blob', async () => {
      const settingsId: string = 'express-config-0001';
      mockQuery.mockResolvedValue({ rows: [{ settings: '{"a":1}', id: settingsId, date: new Date() }] });
      const persist: PostgreSqlPersist = createPersist();

      const settings: string | undefined = await persist.loadSettings(settingsId);

      expect(settings).toBe('{"a":1}');
      const query: string = lastQuery();
      expect(query).toContain('"id" = $1');
      expect(query).not.toContain(settingsId);
      expect(lastValues()).toEqual([settingsId]);
      // Newest first and one row - the table keeps one record per id and date, so the reader picks the latest.
      expect(query).toContain('ORDER BY "date" DESC');
      expect(query).toContain('LIMIT 1');
    });

    it('cannot have a settings id close out of its own literal', async () => {
      // This id is the one of the three that does not come out of the device list: ApiService.loadConfig
      // passes through whatever its caller asks for, so it is a string from beyond this process.
      const persist: PostgreSqlPersist = createPersist();

      await persist.loadSettings(HOSTILE_ID);

      expect(lastQuery()).not.toContain(HOSTILE_ID);
      expect(lastQuery()).not.toContain(`OR '1'='1`);
      expect((lastValues() as unknown[])[0]).toBe(HOSTILE_ID);
    });
  });

  describe('reading the house consumption history', () => {
    it('adds self consumed and drawn energy and leaves the injected energy out', async () => {
      mockQuery.mockResolvedValue({ rows: D_DB_8 });
      const persist: PostgreSqlPersist = createPersist();

      const result: iConsumptionWindowSample[] = await persist.getEnergyConsumptionHistory(
        new Date('2026-06-21T18:00:00+02:00'),
        new Date('2026-06-21T19:00:00+02:00'),
      );

      expect(result).toHaveLength(3);
      // Injected energy is export, not consumption. Counting it in would give 1.25 / 1.60 / 0.60 instead.
      expect(result[0].consumedKwh).toBeCloseTo(0.35, 6);
      expect(result[1].consumedKwh).toBeCloseTo(0.4, 6);
      expect(result[2].consumedKwh).toBeCloseTo(0.6, 6);
      result.forEach((sample) => {
        expect(typeof sample.consumedKwh).toBe('number');
        expect(sample.date).toBeInstanceOf(Date);
      });
      // The gate sums readings over a half open window `(from, to]`. A reading dated at its start would be
      // counted into the following window instead of the one its energy was consumed in.
      expect(result[0].date.toISOString()).toBe('2026-06-21T16:15:00.000Z');
      expect(result[2].date.toISOString()).toBe('2026-06-21T16:45:00.000Z');
    });

    it('returns an empty list on an empty answer, a failing query and an uninitialized persistence', async () => {
      const start: Date = new Date('2026-06-21T18:00:00+02:00');
      const end: Date = new Date('2026-06-21T19:00:00+02:00');
      const persist: PostgreSqlPersist = createPersist();

      mockQuery.mockResolvedValue({ rows: [] });
      expect(await persist.getEnergyConsumptionHistory(start, end)).toStrictEqual([]);

      mockQuery.mockRejectedValue(new Error('connection reset'));
      expect(await persist.getEnergyConsumptionHistory(start, end)).toStrictEqual([]);

      expect(await createPersist(false).getEnergyConsumptionHistory(start, end)).toStrictEqual([]);
    });

    it('drops an unusable reading instead of reading it as nothing consumed', async () => {
      mockQuery.mockResolvedValue({ rows: D_DB_9 });
      const persist: PostgreSqlPersist = createPersist();

      const result: iConsumptionWindowSample[] = await persist.getEnergyConsumptionHistory(
        new Date('2026-06-21T18:00:00+02:00'),
        new Date('2026-06-21T19:00:00+02:00'),
      );

      // A zero would read as "this quarter hour consumed nothing" and pull the quantile of the night down.
      expect(result).toHaveLength(1);
      expect(result[0].consumedKwh).toBeCloseTo(0.4, 6);
      expect(result.some((s) => s.consumedKwh === 0)).toBe(false);
    });

    it('restricts the query to the requested window and fixes the order', async () => {
      const start: Date = new Date('2026-03-18T00:00:00+02:00');
      const end: Date = new Date('2026-06-16T00:00:00+02:00');
      const persist: PostgreSqlPersist = createPersist();

      await persist.getEnergyConsumptionHistory(start, end);

      const query: string = lastQuery();
      expect(query).toContain(start.toISOString());
      expect(query).toContain(end.toISOString());
      expect(query).toContain('ORDER BY "endDate" DESC');
      expect(query).not.toContain('injectedKwH');
    });
  });

  describe('the two series that come out of the same table share one time base', () => {
    it('dates a state of charge reading and a consumption reading of the same interval alike', async () => {
      const intervalEnd: Date = new Date('2026-06-21T16:15:00.000Z');
      mockQuery.mockImplementation((sql: string) => {
        if (sql.includes('"batteryLevel"')) {
          return Promise.resolve({ rows: [{ batteryLevel: '0.62', endDate: driverTimestamp(intervalEnd) }] });
        }
        if (sql.includes('"selfConsumedKwH"')) {
          return Promise.resolve({
            rows: [
              {
                selfConsumedKwH: '0.2500',
                drawnKwH: '0.1000',
                injectedKwH: '0.9000',
                endDate: driverTimestamp(intervalEnd),
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });
      const persist: PostgreSqlPersist = createPersist();
      const start: Date = new Date('2026-06-21T18:00:00+02:00');
      const end: Date = new Date('2026-06-21T19:00:00+02:00');

      const soc: iBatteryLevelSample[] = await persist.getBatteryLevelHistory(start, end);
      const consumption: iConsumptionWindowSample[] = await persist.getEnergyConsumptionHistory(start, end);

      expect(soc).toHaveLength(1);
      expect(consumption).toHaveLength(1);
      // Both readings come out of the very same EnergyCalculation row. A quarter hour of offset between the
      // two series would spoil the fit silently: nothing throws, the weights are just wrong.
      expect(soc[0].date.getTime()).toBe(consumption[0].date.getTime());
      expect(soc[0].date.toISOString()).toBe(intervalEnd.toISOString());
    });
  });

  describe('F-K24 - the weather key never reaches a log line', () => {
    it('keeps key and location out of the path HTTPSOptions is constructed with', async () => {
      const logged: string[] = [];
      const logSpy = jest
        .spyOn(ServerLogService, 'writeLog')
        .mockImplementation((_level: LogLevel, message: string) => {
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
          ) => {
            requested = options;
            callback?.('{"cloud_cover":{"afternoon":8},"temperature":{"min":14,"max":27.5}}', 200);
          },
        );

      try {
        const fetcher: WeatherDaySummaryFetcher | undefined = WeatherHistoryBackfill.createOpenWeatherFetcher({
          lattitude: CITY_LATITUDE,
          longitude: CITY_LONGITUDE,
          appid: PLACEHOLDER_APPID,
        });
        expect(fetcher).toBeDefined();

        const summary: iWeatherDaySummary | undefined = await (fetcher as WeatherDaySummaryFetcher)(day('2026-06-21'));

        // The request really does carry key and location. Without this half, a fetcher that simply never
        // assembles them would satisfy the assurance below while fetching nothing.
        expect(requested?.path).toContain(PLACEHOLDER_APPID);
        expect(requested?.path).toContain(CITY_LATITUDE);
        expect(requested?.path).toContain(CITY_LONGITUDE);
        expect(summary?.cloudCover).toBe(8);

        // ... and none of the three ever reached a log line. HTTPSOptions logs the path it is *constructed*
        // with, so collapsing the redacted construction and the assignment of the real query into a single
        // constructor call - which is exactly what this code looks like it wants - shows up right here.
        logged.forEach((message) => {
          expect(message).not.toContain(PLACEHOLDER_APPID);
          expect(message).not.toContain(CITY_LATITUDE);
          expect(message).not.toContain(CITY_LONGITUDE);
        });
        // The redacted path still names the request, otherwise the log line would be worthless and the
        // redaction would be achieved by saying nothing at all.
        expect(logged.some((message) => message.includes('day_summary'))).toBe(true);
      } finally {
        logSpy.mockRestore();
        requestSpy.mockRestore();
      }
    });
  });

  describe('the answer of the weather service is checked before it is believed', () => {
    /**
     * Runs the configured fetcher against one canned answer of the weather service.
     * @param body - The body the service answers with
     * @param statusCode - The status code it answers with
     * @returns - What the fetcher made of that answer
     */
    async function fetchWith(body: string, statusCode: number = 200): Promise<iWeatherDaySummary | undefined> {
      const requestSpy = jest
        .spyOn(HTTPSService, 'request')
        .mockImplementation(
          (
            _options: HTTPSOptions,
            _postData?: string,
            _retries?: number,
            callback?: (data: string, statuscode: number) => void,
          ) => {
            callback?.(body, statusCode);
          },
        );
      try {
        const fetcher: WeatherDaySummaryFetcher | undefined = WeatherHistoryBackfill.createOpenWeatherFetcher({
          lattitude: CITY_LATITUDE,
          longitude: CITY_LONGITUDE,
          appid: PLACEHOLDER_APPID,
        });
        return await (fetcher as WeatherDaySummaryFetcher)(day('2026-06-21'));
      } finally {
        requestSpy.mockRestore();
      }
    }

    it('takes a well formed answer', async () => {
      // The other half of every rejection below: without this the checks could reject everything and still
      // look right.
      const summary: iWeatherDaySummary | undefined = await fetchWith(
        '{"cloud_cover":{"afternoon":8},"temperature":{"min":14,"max":27.5}}',
      );

      expect(summary?.cloudCover).toBe(8);
      expect(summary?.tempMin).toBe(14);
      expect(summary?.tempMax).toBe(27.5);
      expect(dayKey(summary?.date as Date)).toBe('2026-06-21');
    });

    it('reads the precipitation of the day when the endpoint sends it', async () => {
      const summary: iWeatherDaySummary | undefined = await fetchWith(
        '{"cloud_cover":{"afternoon":8},"temperature":{"min":14,"max":27.5},"precipitation":{"total":6.4}}',
      );

      expect(summary?.precipitation).toBe(6.4);
      // A dry day is a reading, not a missing one.
      const dry: iWeatherDaySummary | undefined = await fetchWith(
        '{"cloud_cover":{"afternoon":8},"temperature":{"min":14,"max":27.5},"precipitation":{"total":0}}',
      );
      expect(dry?.precipitation).toBe(0);
    });

    it('keeps the day when the precipitation is missing', async () => {
      // The regression this exists for. Precipitation was added to an aggregate three other decisions already
      // read, and the completeness check above discards a day whose fields do not all arrive. Had the new
      // field joined that check, every answer without it - an endpoint that does not send it, a plan that
      // does not include it - would drop the whole day, and the start decision would lose its history one
      // gradually thinning window at a time, weeks after the change.
      const summary: iWeatherDaySummary | undefined = await fetchWith(
        '{"cloud_cover":{"afternoon":8},"temperature":{"min":14,"max":27.5}}',
      );

      expect(summary).toBeDefined();
      expect(summary?.cloudCover).toBe(8);
      expect(summary?.tempMin).toBe(14);
      expect(summary?.tempMax).toBe(27.5);
      // Absent, not zero: a 0 would claim the day was dry.
      expect(summary?.precipitation).toBeUndefined();
    });

    it('drops an implausible precipitation without dropping the day', async () => {
      for (const total of ['-3', '"6.4"', 'null', '99999']) {
        const summary: iWeatherDaySummary | undefined = await fetchWith(
          `{"cloud_cover":{"afternoon":8},"temperature":{"min":14,"max":27.5},"precipitation":{"total":${total}}}`,
        );

        expect(summary).toBeDefined();
        expect(summary?.cloudCover).toBe(8);
        expect(summary?.precipitation).toBeUndefined();
      }
    });

    it('rejects a field that is not a number instead of passing it on', async () => {
      // This is the shape that matters: the answer comes from outside the installation, and its values are
      // written into the table the start decision is later read from. A field that is not a number is not a
      // measurement, whatever it happens to spell.
      expect(await fetchWith(`{"cloud_cover":{"afternoon":"8'); --"},"temperature":{"min":14,"max":27.5}}`)).toBe(
        undefined,
      );
      expect(await fetchWith('{"cloud_cover":{"afternoon":8},"temperature":{"min":"14","max":27.5}}')).toBe(undefined);
      expect(
        await fetchWith('{"cloud_cover":{"afternoon":8},"temperature":{"min":14,"max":{"value":27.5}}}'),
      ).toBeUndefined();
      // A null is one of those, and the least obvious one: it passes a check for `undefined`, is stored as SQL
      // NULL, and is dropped again on the way out - while the backfill has noted the day as done and never
      // offers it again. The day would stay blind for good.
      expect(await fetchWith('{"cloud_cover":{"afternoon":null},"temperature":{"min":14,"max":27.5}}')).toBe(undefined);
      expect(await fetchWith('{"cloud_cover":{"afternoon":8},"temperature":{"min":null,"max":27.5}}')).toBe(undefined);
      expect(await fetchWith('{"cloud_cover":{"afternoon":8},"temperature":{"min":14,"max":null}}')).toBe(undefined);
    });

    it('rejects a value outside its plausible band without substituting one', async () => {
      // A cloud cover is a percentage and a temperature at ground level has known extremes. Anything beyond
      // them is not a reading, and it is discarded like a missing one - a substitute would be fitted as if it
      // had been measured.
      expect(await fetchWith('{"cloud_cover":{"afternoon":150},"temperature":{"min":14,"max":27.5}}')).toBe(undefined);
      expect(await fetchWith('{"cloud_cover":{"afternoon":-5},"temperature":{"min":14,"max":27.5}}')).toBe(undefined);
      expect(await fetchWith('{"cloud_cover":{"afternoon":8},"temperature":{"min":-300,"max":27.5}}')).toBe(undefined);
      expect(await fetchWith('{"cloud_cover":{"afternoon":8},"temperature":{"min":14,"max":1e9}}')).toBe(undefined);
      // The edges of the band are readings, not rejects.
      expect((await fetchWith('{"cloud_cover":{"afternoon":0},"temperature":{"min":-20,"max":0}}'))?.cloudCover).toBe(
        0,
      );
      expect((await fetchWith('{"cloud_cover":{"afternoon":100},"temperature":{"min":0,"max":40}}'))?.cloudCover).toBe(
        100,
      );
    });

    it('rejects an answer that is not an object at all', async () => {
      expect(await fetchWith('null')).toBe(undefined);
      expect(await fetchWith('[1,2,3]')).toBe(undefined);
      expect(await fetchWith('not json')).toBe(undefined);
      expect(await fetchWith('{"cloud_cover":{"afternoon":8},"temperature":{"min":14,"max":27.5}}', 401)).toBe(
        undefined,
      );
    });

    it('settles even when the request never answers', async () => {
      // The endpoint accepts the connection and then says nothing - the one way a request produces no event
      // of its own at all. HTTPSService bounds each attempt by its own time limit and reports the silence to
      // the callback, so this is what the fetcher sees. Modelled here rather than mocked away, because a
      // fetcher that never settled would leave `run` awaiting forever and its caller's running flag set - the
      // backfill would be dead until the process restarts.
      const requestSpy = jest
        .spyOn(HTTPSService, 'request')
        .mockImplementation(
          (
            _options: HTTPSOptions,
            _postData?: string,
            _retries?: number,
            callback?: (data: string, statuscode: number) => void,
          ) => {
            setTimeout(
              () => callback?.(HTTPSService.failureResponse, HTTPSService.failureStatusCode),
              HTTPSService.requestTimeoutMs,
            );
          },
        );
      jest.useFakeTimers();
      try {
        const fetcher: WeatherDaySummaryFetcher | undefined = WeatherHistoryBackfill.createOpenWeatherFetcher({
          lattitude: CITY_LATITUDE,
          longitude: CITY_LONGITUDE,
          appid: PLACEHOLDER_APPID,
        });
        const pending: Promise<iWeatherDaySummary | undefined> = (fetcher as WeatherDaySummaryFetcher)(
          day('2026-06-21'),
        );
        let settled: boolean = false;
        void pending.then(() => {
          settled = true;
        });

        await jest.advanceTimersByTimeAsync(HTTPSService.requestTimeoutMs - 1);
        // Not one moment before the HTTPS service reports: the fetcher settles on that callback and on
        // nothing else. A deadline of its own here would be shorter than the retry chain it sits on and would
        // throw away the answer a retry was about to bring.
        expect(settled).toBe(false);

        await jest.advanceTimersByTimeAsync(2);
        expect(settled).toBe(true);
        // The failure is discarded, not read as a measurement: `failureStatusCode` is not 200.
        expect(await pending).toBe(undefined);
      } finally {
        jest.useRealTimers();
        requestSpy.mockRestore();
      }
    });

    it('a run whose requests never answer still finishes', async () => {
      // The consequence of the case above, from the caller's side: `run` must come back, otherwise the
      // running flag its callers hold stays set for good.
      const requestSpy = jest
        .spyOn(HTTPSService, 'request')
        .mockImplementation(
          (
            _options: HTTPSOptions,
            _postData?: string,
            _retries?: number,
            callback?: (data: string, statuscode: number) => void,
          ) => {
            // The silent endpoint again, for every day of the window.
            setTimeout(
              () => callback?.(HTTPSService.failureResponse, HTTPSService.failureStatusCode),
              HTTPSService.requestTimeoutMs,
            );
          },
        );
      const { persist, stored } = createBackfillPersistStub([]);
      jest.useFakeTimers();
      try {
        const run: Promise<number> = WeatherHistoryBackfill.run(
          persist,
          new Date('2026-06-16T12:00:00+02:00'),
          2,
          WeatherHistoryBackfill.createOpenWeatherFetcher({
            lattitude: CITY_LATITUDE,
            longitude: CITY_LONGITUDE,
            appid: PLACEHOLDER_APPID,
          }),
          0,
        );
        // Three days in the window, each one silent for the length of an HTTPS attempt, one after the other.
        await jest.advanceTimersByTimeAsync(3 * HTTPSService.requestTimeoutMs + 1000);

        expect(await run).toBe(0);
        expect(stored).toHaveLength(0);
      } finally {
        jest.useRealTimers();
        requestSpy.mockRestore();
      }
    });
  });

  describe('K16 - a timestamp survives the round trip through a naive column', () => {
    // The battery, actuator and consumption readers state the same round trip in the cases that map their
    // rows: each of those asserts the read instant of a `driverTimestamp` row against the moment it was
    // stored for. What is left here is the reader whose offset can change inside one answer, and the reader
    // whose column is a calendar day rather than an instant.

    it('returns the instants two temperature measurements were stored for, either side of the clock change', async () => {
      // Both rows in one answer, and deliberately on either side of the daylight saving switch: the offset of
      // the machine's zone is not one constant, so a reader that adds a fixed correction would still put one
      // of the two an hour off. A 90 day window can span the switch.
      const winter: Date = new Date('2026-01-15T06:00:00.000Z');
      const summer: Date = new Date('2026-07-15T06:00:00.000Z');
      mockQuery.mockResolvedValue({
        rows: [
          { temperature: '21.5', date: driverTimestamp(summer) },
          { temperature: '4.5', date: driverTimestamp(winter) },
        ],
      });
      const persist: PostgreSqlPersist = createPersist();

      const result: iTemperatureMeasurement[] = await persist.getTemperatureHistory(
        DACHS_DEVICE_ID,
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-08-01T00:00:00.000Z'),
      );

      expect(result).toHaveLength(2);
      expect(result[0].date.toISOString()).toBe(summer.toISOString());
      expect(result[1].date.toISOString()).toBe(winter.toISOString());
    });

    it('finds the weather aggregate of the very day it was stored for', async () => {
      // The backfill dates an aggregate at local midnight and the write path persists toISOString().
      const localMidnight: Date = new Date(2026, 5, 21);
      mockQuery.mockResolvedValue({
        rows: [{ date: driverTimestamp(localMidnight), cloudCover: 8, tempMin: 14.0, tempMax: 27.5 }],
      });
      const persist: PostgreSqlPersist = createPersist();

      const result: iWeatherDaySummary[] = await persist.getWeatherDaySummaries(
        new Date(2026, 5, 1),
        new Date(2026, 6, 1),
      );

      expect(result).toHaveLength(1);
      // The consumer matches days by their calendar day. One day of drift makes the whole fit run on the
      // following day's weather - and every assertion that only checks "a value came back" stays green.
      expect(result[0].date.toDateString()).toBe(localMidnight.toDateString());
      expect(result[0].date.getTime()).toBe(localMidnight.getTime());
    });
  });

  describe('R13 - a missing history is a defined state on the data side', () => {
    it('answers an empty list for missing weather aggregates without a substitute value', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const persist: PostgreSqlPersist = createPersist();

      const result: iWeatherDaySummary[] = await persist.getWeatherDaySummaries(day('2026-06-21'), day('2026-06-28'));

      expect(result).toStrictEqual([]);
    });

    it('drops a half filled aggregate instead of completing it', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { date: driverTimestamp(day('2026-06-27')), cloudCover: null, tempMin: '14.5', tempMax: '24.0' },
          { date: driverTimestamp(day('2026-06-28')), cloudCover: '50', tempMin: '14.0', tempMax: '23.0' },
        ],
      });
      const persist: PostgreSqlPersist = createPersist();

      const result: iWeatherDaySummary[] = await persist.getWeatherDaySummaries(day('2026-06-27'), day('2026-06-28'));

      expect(result).toHaveLength(1);
      expect(result[0].cloudCover).toBe(50);
    });
  });

  describe('R17 - the weather day table and its backfill', () => {
    it('creates the weather day table with the IF NOT EXISTS pattern', async () => {
      const persist: PostgreSqlPersist = createPersist(false);

      await persist.initialize();

      const ddl: string = mockQuery.mock.calls[0][0] as string;
      expect(ddl).toContain('to_regclass(\'hoffmation_schema."WeatherDaySummary"\') IS NULL');
      expect(ddl).toContain('create table hoffmation_schema."WeatherDaySummary"');

      const blockStart: number = ddl.indexOf('create table hoffmation_schema."WeatherDaySummary"');
      const block: string = ddl.substring(blockStart, ddl.indexOf('END IF;', blockStart));
      expect(block).toContain('date         timestamp not null');
      expect(block).toContain('primary key');
      expect(block).toContain('"cloudCover" double precision');
      expect(block).toContain('"tempMin"    double precision');
      expect(block).toContain('"tempMax"    double precision');
      expect(block).toContain('"precipitation" double precision');

      // This runs against a database with three years of history: nothing may be removed.
      // `delete` on its own also appears in the pre-existing `on delete set null` referential actions, which
      // remove nothing - only a statement that deletes or drops counts here.
      expect(ddl).not.toMatch(/\bdelete\s+from\b/i);
      expect(ddl).not.toMatch(/\btruncate\b/i);
      expect(ddl).not.toMatch(/\bdrop\b/i);

      // Extending a table is allowed; doing it over and over on a running installation is not. `precipitation`
      // was added after the table already existed in the field, so a create-only block cannot reach those rows
      // and an `alter` is the only way. What this pins is that the `alter` can fire at most once: it sits
      // behind the same `information_schema` guard as the four that came before it, so from the second start
      // onwards the condition is false and the statement is not reached.
      const alterStart: number = ddl.search(/alter\s+table[^;]*WeatherDaySummary/i);
      expect(alterStart).toBeGreaterThan(-1);
      const guard: string = ddl.substring(ddl.lastIndexOf('IF (SELECT', alterStart), alterStart);
      expect(guard).toContain("table_name = 'WeatherDaySummary'");
      expect(guard).toContain("column_name = 'precipitation'");
      expect(guard).toContain('COUNT(column_name) = 0');

      // The five additive column changes - four from before this feature plus `precipitation` - pinned, so a
      // sixth cannot slip in unnoticed.
      expect(ddl.match(/alter table/gi)).toHaveLength(5);
    });

    it('round trips a weather day summary and keeps one record per day', async () => {
      const rows: Map<string, Record<string, string | number | Date>> = new Map();
      // The values arrive through the placeholders now, so the stub takes them from there instead of reading
      // them back out of the statement text. `ON CONFLICT ("date")` is what makes the second write of a day
      // replace the first, which is why the stub keys on the date value.
      mockQuery.mockImplementation((sql: string, values?: unknown[]) => {
        if (sql.includes('insert into hoffmation_schema."WeatherDaySummary"') && values !== undefined) {
          const writtenDate: string = values[0] as string;
          rows.set(writtenDate, {
            // The written value goes into a naive column and comes back through the driver - modelling that
            // is what makes this a round trip rather than an echo.
            date: driverTimestamp(new Date(writtenDate)),
            cloudCover: values[1] as number,
            tempMin: values[2] as number,
            tempMax: values[3] as number,
          });
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('from hoffmation_schema."WeatherDaySummary"')) {
          return Promise.resolve({ rows: [...rows.values()] });
        }
        return Promise.resolve({ rows: [] });
      });
      const persist: PostgreSqlPersist = createPersist();

      D_WEATHER.forEach((summary) => persist.persistWeatherDaySummary(summary));
      const readBack: iWeatherDaySummary[] = await persist.getWeatherDaySummaries(day('2026-06-21'), day('2026-09-16'));

      expect(readBack).toHaveLength(8);
      readBack.forEach((summary) => {
        expect(typeof summary.cloudCover).toBe('number');
        expect(typeof summary.tempMin).toBe('number');
        expect(typeof summary.tempMax).toBe('number');
        expect(summary.date).toBeInstanceOf(Date);
      });
      expect(readBack.find((s) => dayKey(s.date) === '2026-06-21')?.tempMax).toBe(27.5);

      // The upsert is expressed in the statement, not only in the stub above.
      const insertStatement: string = mockQuery.mock.calls
        .map((call) => call[0] as string)
        .find((sql) => sql.includes('insert into hoffmation_schema."WeatherDaySummary"')) as string;
      expect(insertStatement).toContain('ON CONFLICT ("date")');

      persist.persistWeatherDaySummary({ ...D_WEATHER[0], cloudCover: 12 });
      const afterSecondWrite: iWeatherDaySummary[] = await persist.getWeatherDaySummaries(
        day('2026-06-21'),
        day('2026-09-16'),
      );
      expect(afterSecondWrite).toHaveLength(8);
      expect(afterSecondWrite.find((s) => dayKey(s.date) === '2026-06-21')?.cloudCover).toBe(12);
    });

    it('binds the aggregate instead of writing it into the statement', async () => {
      const persist: PostgreSqlPersist = createPersist();
      const summary: iWeatherDaySummary = D_WEATHER[0];

      persist.persistWeatherDaySummary(summary);

      const { sql, values } = queryContaining('insert into hoffmation_schema."WeatherDaySummary"');
      // This is the only write path in the repository whose values come from beyond the installation. What is
      // written here is read back by the start decision, so the statement has to be fixed text and the values
      // data - the update half included, which is the half an interpolation is most easily left behind in.
      expect(sql).toContain('values ($1, $2, $3, $4, $5)');
      expect(sql).toContain('"cloudCover" = $2');
      expect(sql).toContain('"tempMin" = $3');
      expect(sql).toContain('"tempMax" = $4');
      // The fifth is bound like the others, but its update half is not a plain overwrite: an aggregate that
      // arrives without precipitation must not erase a figure an earlier fetch of the same day delivered.
      expect(sql).toContain('"precipitation" = COALESCE($5, hoffmation_schema."WeatherDaySummary"."precipitation")');
      // Absent arrives as null rather than 0: the column has to be able to say "not recorded", and a 0 would
      // say "it did not rain".
      expect(values).toEqual([
        summary.date.toISOString(),
        summary.cloudCover,
        summary.tempMin,
        summary.tempMax,
        summary.precipitation ?? null,
      ]);
      // No value of the aggregate appears in the statement text at all.
      expect(sql).not.toContain(summary.date.toISOString());
      expect(sql).not.toContain(`${summary.cloudCover}`);
      expect(sql).not.toContain(`${summary.tempMax}`);
    });

    it('cannot be made to carry a value out of its own statement', async () => {
      // The fetcher rejects a non numeric field before it gets here, so this cannot come out of the weather
      // service today. It is asserted anyway, at the layer that has to hold regardless of who calls it: the
      // reason a check in the fetcher is not the whole answer is that it is one caller away from being
      // bypassed.
      const persist: PostgreSqlPersist = createPersist();
      const hostile = {
        date: day('2026-06-21'),
        cloudCover: `0); DROP TABLE hoffmation_schema."WeatherDaySummary"; --`,
        tempMin: 14,
        tempMax: 27.5,
      } as unknown as iWeatherDaySummary;

      persist.persistWeatherDaySummary(hostile);

      const { sql, values } = queryContaining('insert into hoffmation_schema."WeatherDaySummary"');
      expect(sql).not.toContain('DROP TABLE');
      expect(sql).not.toMatch(/;\s*--/);
      // It stays a value - the driver binds it, the database rejects it as a number, and nothing of it is
      // ever parsed as SQL.
      expect((values as unknown[])[1]).toBe(hostile.cloudCover);
    });

    it('stays inside the fitting window', async () => {
      const requested: Date[] = [];
      const fetcher: WeatherDaySummaryFetcher = (date: Date) => {
        requested.push(date);
        return Promise.resolve({ date: date, cloudCover: 50, tempMin: 10, tempMax: 20 });
      };
      const { persist, stored } = createBackfillPersistStub([]);

      const result: number = await WeatherHistoryBackfill.run(
        persist,
        new Date('2026-06-16T12:00:00+02:00'),
        HISTORY_WINDOW_DAYS,
        fetcher,
        0,
      );

      // The history window plus the running day - the gate reads today's aggregate out of the same table.
      expect(requested).toHaveLength(HISTORY_WINDOW_DAYS + 1);
      expect(dayKey(requested[0])).toBe('2026-03-18');
      expect(dayKey(requested[requested.length - 1])).toBe('2026-06-16');
      // The recorded history starts in 2023; a run over all of it would be roughly 1050 calls against a
      // quota of 1000.
      expect(requested.every((d) => d.getTime() >= day('2026-03-18').getTime())).toBe(true);
      expect(result).toBe(HISTORY_WINDOW_DAYS + 1);
      expect(stored).toHaveLength(HISTORY_WINDOW_DAYS + 1);
    });

    it('refetches the running day even when it is stored, but leaves a stored past day alone', async () => {
      const requested: Date[] = [];
      const fetcher: WeatherDaySummaryFetcher = (date: Date) => {
        requested.push(date);
        return Promise.resolve({ date: date, cloudCover: 50, tempMin: 10, tempMax: 20 });
      };
      const { persist } = createBackfillPersistStub([
        { date: day('2026-06-16'), cloudCover: 8, tempMin: 14.0, tempMax: 27.5 },
        { date: day('2026-05-20'), cloudCover: 42, tempMin: 14.5, tempMax: 24.0 },
      ]);

      await WeatherHistoryBackfill.run(persist, new Date('2026-06-16T12:00:00+02:00'), HISTORY_WINDOW_DAYS, fetcher, 0);

      const requestedKeys: string[] = requested.map(dayKey);
      // The running day's aggregate is a forecast and moves through the day. Skipping it because a row
      // exists would freeze whatever the first run of the day happened to see - and the gate reads exactly
      // that row, so it would decide on a morning value all evening.
      expect(requestedKeys).toContain('2026-06-16');
      expect(requestedKeys.filter((key) => key === '2026-06-16')).toHaveLength(1);
      // A past day is archive: it does not change, so a stored one is not paid for a second time - and that
      // shows in the count as well, which is the whole point of reading the stored days first.
      expect(requestedKeys).not.toContain('2026-05-20');
      expect(requested).toHaveLength(HISTORY_WINDOW_DAYS);
    });

    it('covers a day that succeeded through the stored ones and frees the failed ones on the next calendar day', async () => {
      const requested: Date[] = [];
      // Only one past day can be obtained - the mixed case, where the memory of the failures must not swallow
      // the day that worked.
      const fetcher: WeatherDaySummaryFetcher = (date: Date) => {
        requested.push(date);
        return Promise.resolve(
          dayKey(date) === '2026-05-20' ? { date: date, cloudCover: 42, tempMin: 14.5, tempMax: 24.0 } : undefined,
        );
      };
      const present: iWeatherDaySummary[] = [];
      const { persist, stored } = createBackfillPersistStub(present);

      await WeatherHistoryBackfill.run(persist, new Date('2026-06-16T12:00:00+02:00'), HISTORY_WINDOW_DAYS, fetcher, 0);
      expect(stored.map((summary) => dayKey(summary.date))).toEqual(['2026-05-20']);
      present.push(...stored);

      requested.length = 0;
      await WeatherHistoryBackfill.run(persist, new Date('2026-06-16T12:00:00+02:00'), HISTORY_WINDOW_DAYS, fetcher, 0);
      expect(requested.map(dayKey)).toEqual(['2026-06-16']);

      requested.length = 0;
      await WeatherHistoryBackfill.run(persist, new Date('2026-06-17T12:00:00+02:00'), HISTORY_WINDOW_DAYS, fetcher, 0);

      const requestedKeys: string[] = requested.map(dayKey);
      // A new calendar day tries the window once more: a passing outage has to be able to heal, and a new day
      // enters the window anyway. What is stored stays out of it.
      expect(requestedKeys).toHaveLength(HISTORY_WINDOW_DAYS);
      expect(requestedKeys).not.toContain('2026-05-20');
      expect(requestedKeys).toContain('2026-06-16');
      expect(requestedKeys).toContain('2026-06-17');
    });

    it('does not fetch a past day again on the same calendar day when the write never landed', async () => {
      const requested: Date[] = [];
      // Every fetch succeeds - the write is what fails here. That is the shape of a dead database or an
      // insert that keeps failing while the weather key is perfectly fine.
      const fetcher: WeatherDaySummaryFetcher = (date: Date) => {
        requested.push(date);
        return Promise.resolve({ date: date, cloudCover: 50, tempMin: 10, tempMax: 20 });
      };
      const { persist, stored } = createBackfillPersistStub([], false);

      await WeatherHistoryBackfill.run(persist, new Date('2026-06-16T12:00:00+02:00'), HISTORY_WINDOW_DAYS, fetcher, 0);
      expect(requested).toHaveLength(HISTORY_WINDOW_DAYS + 1);
      expect(stored).toHaveLength(0);

      requested.length = 0;
      await WeatherHistoryBackfill.run(persist, new Date('2026-06-16T13:00:00+02:00'), HISTORY_WINDOW_DAYS, fetcher, 0);

      // Nothing was stored, so the stored days do not hold the window back; and remembering only the fetch
      // failures would not either, because every fetch succeeded. The whole window would go out again on
      // every run - hourly, against a daily quota that one window nearly exhausts on its own.
      expect(requested.map(dayKey)).toEqual(['2026-06-16']);
    });

    it('throttles between calls', async () => {
      const throttleMs: number = 1500;
      const callMoments: number[] = [];
      const fetcher: WeatherDaySummaryFetcher = (date: Date) => {
        callMoments.push(Date.now());
        return Promise.resolve({ date: date, cloudCover: 50, tempMin: 10, tempMax: 20 });
      };
      const { persist } = createBackfillPersistStub([]);

      jest.useFakeTimers();
      try {
        const run: Promise<number> = WeatherHistoryBackfill.run(
          persist,
          new Date('2026-06-16T12:00:00+02:00'),
          HISTORY_WINDOW_DAYS,
          fetcher,
          throttleMs,
        );
        await jest.advanceTimersByTimeAsync((HISTORY_WINDOW_DAYS + 1) * throttleMs + 1000);
        await run;
      } finally {
        jest.useRealTimers();
      }

      expect(callMoments).toHaveLength(HISTORY_WINDOW_DAYS + 1);
      // The throttle is what keeps an accidentally widened window from draining the quota in one burst.
      for (let i = 1; i < callMoments.length; i++) {
        expect(callMoments[i] - callMoments[i - 1]).toBeGreaterThanOrEqual(throttleMs);
      }
    });

    it('does nothing without a persistence, without a window and without weather configuration', async () => {
      const fetcher: WeatherDaySummaryFetcher = jest.fn();
      const { persist } = createBackfillPersistStub([]);

      expect(await WeatherHistoryBackfill.run(undefined, new Date(), HISTORY_WINDOW_DAYS, fetcher)).toBe(0);
      expect(await WeatherHistoryBackfill.run(persist, new Date(), 0, fetcher)).toBe(0);
      expect(fetcher).not.toHaveBeenCalled();

      // Without a key there is no fetcher at all - and no key or installation coordinate is needed to
      // establish that.
      expect(WeatherHistoryBackfill.createOpenWeatherFetcher(undefined)).toBeUndefined();
      expect(
        WeatherHistoryBackfill.createOpenWeatherFetcher({
          lattitude: CITY_LATITUDE,
          longitude: CITY_LONGITUDE,
        }),
      ).toBeUndefined();
      expect(await WeatherHistoryBackfill.run(persist, new Date(), HISTORY_WINDOW_DAYS)).toBe(0);
    });
  });

  describe('the write paths bind the texts a person gave', () => {
    /**
     * A name of the shape an operator really types. The apostrophe is the point: pasted into a literal it
     * closes it, and everything behind it is read as SQL. The inch mark rides along because it is the other
     * character that turns up in equipment names.
     */
    const HUMAN_NAME: string = `Anna's 24" Lampe`;
    /** A name without anything special in it - the counter case to every rejection below. */
    const PLAIN_NAME: string = 'Wohnzimmer Nord';
    /** A text that closes its literal and appends a statement of its own. */
    const HOSTILE_TEXT: string = `x'); DROP TABLE hoffmation_schema."Settings"; --`;
    /** Synthetic ids, never ids of a real installation. */
    const BUTTON_DEVICE_ID: string = 'button-test-0001';
    const SETTINGS_ID: string = 'settings-test-0001';
    /** An arbitrary device type - a number, and it stays in the statement text. */
    const DEVICE_TYPE: number = 7;

    /**
     * Every literal opens and closes with an apostrophe, so a well formed statement carries an even number of
     * them. An apostrophe pasted into a literal makes the count odd - the literal is left open, and the
     * database answers with a syntax error rather than storing the row.
     * @param sql - The statement as it would go to the database
     * @returns - How many apostrophes it carries
     */
    function apostropheCount(sql: string): number {
      return (sql.match(/'/g) ?? []).length;
    }

    /**
     * A room that is nothing but a name and a floor - which is all the writer touches.
     * @param name - The name the operator gave the room
     * @returns - The stub, typed as the writer asks for it
     */
    function roomStub(name: string): iRoomBase {
      return { roomName: name, etage: 2 } as unknown as iRoomBase;
    }

    /**
     * A device carrying the three texts of its info block plus its id and type.
     * @param customName - The name the operator gave the device
     * @param room - The room name the device is filed under
     * @returns - The stub, typed as the writer asks for it
     */
    function deviceStub(customName: string, room: string = 'Testraum'): iBaseDevice {
      return {
        id: 'device-test-0001',
        deviceType: DEVICE_TYPE,
        info: { room: room, allDevicesKey: 'test-all-0001', customName: customName },
      } as unknown as iBaseDevice;
    }

    /**
     * A button switch that is nothing but an id.
     * @returns - The stub, typed as the writer asks for it
     */
    function buttonStub(): iButtonSwitch {
      return { id: BUTTON_DEVICE_ID } as unknown as iButtonSwitch;
    }

    it('binds a room name instead of pasting it into the statement', () => {
      const persist: PostgreSqlPersist = createPersist();

      persist.addRoom(roomStub(PLAIN_NAME));

      const { sql, values } = queryContaining('insert into hoffmation_schema."BasicRooms"');
      expect(sql).not.toContain(PLAIN_NAME);
      expect(values).toEqual([PLAIN_NAME]);
      // The counter case to every rejection: an ordinary name is still written, unchanged and in full. The
      // floor is a number and stays the writer's own text, upsert half included.
      expect(sql).toContain('values ($1, 2)');
      expect(sql).toContain('etage = 2');
      expect(sql).toContain('ON CONFLICT (name)');
    });

    it('keeps a room name with an apostrophe from breaking its own statement', () => {
      const persist: PostgreSqlPersist = createPersist();

      persist.addRoom(roomStub(HUMAN_NAME));

      const { sql, values } = queryContaining('insert into hoffmation_schema."BasicRooms"');
      // Pasted in, the apostrophe of the name closes the literal it sits in: the statement is no longer
      // parseable, the insert fails, and the room is silently not recorded.
      expect(apostropheCount(sql) % 2).toBe(0);
      expect(sql).not.toContain(HUMAN_NAME);
      expect(values).toEqual([HUMAN_NAME]);
    });

    it('binds the texts of a device instead of pasting them into the statement', () => {
      const persist: PostgreSqlPersist = createPersist();
      const device: iBaseDevice = deviceStub(PLAIN_NAME);

      persist.addDevice(device);

      const { sql, values } = queryContaining('insert into hoffmation_schema."DeviceInfo"');
      expect(values).toEqual([device.id, 'Testraum', 'test-all-0001', PLAIN_NAME]);
      expect(sql).not.toContain(PLAIN_NAME);
      expect(sql).not.toContain(device.id);
      // The update half is the one an interpolation is most easily left behind in, so it is named here.
      expect(sql).toContain('values ($1, $2, $3, $4');
      expect(sql).toContain('"roomname" = $2');
      expect(sql).toContain('"alldeviceskey" = $3');
      expect(sql).toContain('"customname" = $4');
      // The type is a number and stays the writer's own text.
      expect(sql).toContain(`"devtype" = ${DEVICE_TYPE}`);
      expect(sql).toContain('ON CONFLICT ("deviceid")');
    });

    it('keeps a device name with an apostrophe from breaking its own statement', () => {
      const persist: PostgreSqlPersist = createPersist();

      persist.addDevice(deviceStub(HUMAN_NAME, `Anna's Zimmer`));

      const { sql, values } = queryContaining('insert into hoffmation_schema."DeviceInfo"');
      // Two apostrophes from two different texts, and the row a whole installation's foreign keys hang off.
      expect(apostropheCount(sql) % 2).toBe(0);
      expect(sql).not.toContain(HUMAN_NAME);
      expect(sql).not.toContain(`Anna's Zimmer`);
      expect((values as unknown[])[1]).toBe(`Anna's Zimmer`);
      expect((values as unknown[])[3]).toBe(HUMAN_NAME);
    });

    it('binds a button name instead of pasting it into the statement', () => {
      const persist: PostgreSqlPersist = createPersist();

      persist.persistSwitchInput(buttonStub(), ButtonPressType.double, 'Taste oben');

      const { sql, values } = queryContaining('insert into hoffmation_schema."ButtonSwitchPresses"');
      expect(values).toEqual([BUTTON_DEVICE_ID, 'Taste oben']);
      expect(sql).not.toContain('Taste oben');
      expect(sql).not.toContain(BUTTON_DEVICE_ID);
      // The press type is a number and stays the writer's own text - without it every press would be recorded
      // as the same kind.
      expect(sql).toContain(`values ($1, ${ButtonPressType.double}, $2`);
    });

    it('keeps a button name with an apostrophe from breaking its own statement', () => {
      const persist: PostgreSqlPersist = createPersist();

      persist.persistSwitchInput(buttonStub(), ButtonPressType.double, HUMAN_NAME);

      const { sql, values } = queryContaining('insert into hoffmation_schema."ButtonSwitchPresses"');
      expect(apostropheCount(sql) % 2).toBe(0);
      expect(sql).not.toContain(HUMAN_NAME);
      expect((values as unknown[])[1]).toBe(HUMAN_NAME);
    });

    it('binds the settings blob, its id and its name - in both halves of the upsert', () => {
      const persist: PostgreSqlPersist = createPersist();
      const blob: string = JSON.stringify({ someValue: 42 });

      persist.persistSettings(SETTINGS_ID, blob, PLAIN_NAME);

      const { sql, values } = queryContaining('insert into hoffmation_schema."Settings"');
      expect(values).toEqual([SETTINGS_ID, blob, PLAIN_NAME]);
      expect(sql).not.toContain(SETTINGS_ID);
      expect(sql).not.toContain(blob);
      expect(sql).not.toContain(PLAIN_NAME);
      expect(sql).toContain('values ($1, $2, $3');
      // The blob is placed twice, and the second placement is the one that carries the value on every write
      // after the first of a given second.
      expect(sql).toContain('settings = $2');
      expect(sql).toContain('customname = $3');
      expect(sql).toContain('ON CONFLICT (id, date)');
    });

    it('keeps a settings value with an apostrophe from breaking its own statement', () => {
      const persist: PostgreSqlPersist = createPersist();
      // Every device setting of the installation ends up inside this blob, so any text a person ever typed
      // into one arrives here - and the blob is placed twice, which is what makes this the worst of the four.
      const blob: string = JSON.stringify({ customName: HUMAN_NAME, room: `Anna's Zimmer` });

      persist.persistSettings(SETTINGS_ID, blob, HUMAN_NAME);

      const { sql, values } = queryContaining('insert into hoffmation_schema."Settings"');
      expect(apostropheCount(sql) % 2).toBe(0);
      expect(sql).not.toContain(HUMAN_NAME);
      expect(values).toEqual([SETTINGS_ID, blob, HUMAN_NAME]);
    });

    it('round trips a settings blob with an apostrophe in it unchanged', async () => {
      // The other half of every assertion above: refusing or mangling the text would satisfy them just as
      // well. What goes in has to come back out, character for character - the plain blob and the awkward one
      // alike.
      const plainBlob: string = JSON.stringify({ customName: PLAIN_NAME });
      const humanBlob: string = JSON.stringify({ customName: HUMAN_NAME, room: `Anna's Zimmer` });
      const rows: Map<string, string> = new Map();
      mockQuery.mockImplementation((sql: string, values?: unknown[]) => {
        if (sql.includes('insert into hoffmation_schema."Settings"') && values !== undefined) {
          rows.set(values[0] as string, values[1] as string);
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('from hoffmation_schema."Settings"') && values !== undefined) {
          const found: string | undefined = rows.get(values[0] as string);
          return Promise.resolve({
            rows: found === undefined ? [] : [{ settings: found, id: values[0], date: new Date() }],
          });
        }
        return Promise.resolve({ rows: [] });
      });
      const persist: PostgreSqlPersist = createPersist();

      persist.persistSettings('settings-plain-0001', plainBlob, PLAIN_NAME);
      persist.persistSettings(SETTINGS_ID, humanBlob, HUMAN_NAME);

      expect(await persist.loadSettings('settings-plain-0001')).toBe(plainBlob);
      const readBack: string | undefined = await persist.loadSettings(SETTINGS_ID);
      expect(readBack).toBe(humanBlob);
      expect(JSON.parse(readBack as string).room).toBe(`Anna's Zimmer`);
      expect(JSON.parse(readBack as string).customName).toBe(HUMAN_NAME);
    });

    it('cannot have a text close out of the statement it is written into', () => {
      // Not a shape anyone expects in a room or device name - it is the mistake the binding makes
      // structurally impossible, asserted at each of the four writers rather than argued about in a comment.
      const persist: PostgreSqlPersist = createPersist();

      persist.addRoom(roomStub(HOSTILE_TEXT));
      persist.addDevice(deviceStub(HOSTILE_TEXT));
      persist.persistSwitchInput(buttonStub(), ButtonPressType.double, HOSTILE_TEXT);
      persist.persistSettings(SETTINGS_ID, JSON.stringify({ customName: HOSTILE_TEXT }), HOSTILE_TEXT);

      const statements: string[] = mockQuery.mock.calls.map((call) => call[0] as string);
      expect(statements).toHaveLength(4);
      statements.forEach((sql) => {
        expect(sql).not.toContain('DROP TABLE');
        expect(sql).not.toMatch(/;\s*--/);
        expect(apostropheCount(sql) % 2).toBe(0);
      });
      // It stays a value in each of them: the driver sends it apart from the statement, so nothing of it is
      // ever parsed as SQL.
      const bound: string[] = mockQuery.mock.calls.flatMap((call) => (call[1] as string[] | undefined) ?? []);
      expect(bound.filter((value) => value === HOSTILE_TEXT).length).toBeGreaterThanOrEqual(4);
    });

    it('leaves the timestamps of these writers in the statement', () => {
      // Deliberately not bound. The columns are `timestamp without time zone` and three years of recorded
      // history were written as an interpolated `toISOString()`; a bound Date and an interpolated one can
      // date differently, and old and new rows would then carry different time bases.
      const persist: PostgreSqlPersist = createPersist();

      persist.persistSwitchInput(buttonStub(), ButtonPressType.double, PLAIN_NAME);
      persist.persistSettings(SETTINGS_ID, JSON.stringify({ someValue: 42 }), PLAIN_NAME);

      const isoLiteral: RegExp = /'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z'/;
      ['"ButtonSwitchPresses"', '"Settings"'].forEach((table) => {
        const { sql, values } = queryContaining(`insert into hoffmation_schema.${table}`);
        expect(sql).toMatch(isoLiteral);
        (values as unknown[]).forEach((value) => {
          expect(value).not.toBeInstanceOf(Date);
          expect(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)).toBe(false);
        });
      });
    });
  });
});
