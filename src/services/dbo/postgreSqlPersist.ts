import { Pool, PoolConfig, QueryResultRow } from 'pg';
import {
  iAcDevice,
  iActuator,
  iActuatorStateSample,
  iBaseDevice,
  iBatteryDevice,
  iBatteryLevelSample,
  iButtonSwitch,
  iConsumptionWindowSample,
  iDesiredShutterPosition,
  iDimmableLamp,
  iHandle,
  iHeater,
  iAirQualityCollector,
  iAirQualityReadings,
  iHumidityCollector,
  iIlluminationSensor,
  iMotionSensor,
  iPersist,
  iRoomBase,
  iShutter,
  iShutterCalibration,
  iTemperatureCollector,
  iTemperatureMeasurement,
  iWeatherDaySummary,
  iZigbeeDevice,
  UNDEFINED_AIR_QUALITY_VALUE,
  UNDEFINED_TEMP_VALUE,
} from '../../interfaces';
import { CountToday, DesiredShutterPosition, EnergyCalculation, idSettings } from '../../models';
import { ServerLogService } from '../../logging';
import { ButtonPressType, DeviceCapability, LogLevel } from '../../enums';
import { Utils } from '../../utils';
import { ActuatorStateRow } from './actuator-state-row';
import { BatteryLevelRow } from './battery-level-row';
import { EnergyConsumptionRow } from './energy-consumption-row';
import { WeatherDaySummaryRow } from './weather-day-summary-row';

export class PostgreSqlPersist implements iPersist {
  /** @inheritDoc */
  initialized: boolean = false;
  private readonly psql: Pool;
  private readonly config: PoolConfig;

  public constructor(conf: PoolConfig) {
    this.config = conf;
    this.psql = new Pool(this.config);
  }

  /** @inheritDoc */
  addRoom(room: iRoomBase): void {
    // The name is bound rather than pasted in: it is a text a person gave, and an apostrophe in one - a room
    // called `Anna's Zimmer` - closes the literal it would sit in. The statement would then be unparseable,
    // the insert would fail with a logged warning, and the room would silently not be recorded. The floor is
    // a number and stays this file's own text.
    this.query(
      `
      insert into hoffmation_schema."BasicRooms" (name, etage)
      values ($1, ${room.etage}) ON CONFLICT (name)
    DO
      UPDATE SET
        etage = ${room.etage}
      ;
    `,
      [room.roomName],
    );
  }

  /** @inheritDoc */
  addDevice(device: iBaseDevice): void {
    // Room, key and custom name are texts a person gave, and the id is a text as well - each of them can
    // close the literal it would be pasted into. This row is the one the device data tables reference, so a
    // failed insert here is not one lost record but a whole device missing its anchor. The update half binds
    // the same placeholders: it is the one an interpolation is most easily left behind in. The device type is
    // a number and stays this file's own text.
    this.query(
      `
      insert into hoffmation_schema."DeviceInfo" ("deviceid", "roomname", "alldeviceskey", "customname", "devtype")
      values ($1, $2, $3, $4,
              ${device.deviceType}) ON CONFLICT ("deviceid")
    DO
      UPDATE SET
        "roomname" = $2,
        "alldeviceskey" = $3,
        "customname" = $4,
        "devtype" = ${device.deviceType}
      ;
    `,
      [device.id, device.info.room, device.info.allDevicesKey, device.info.customName],
    );
  }

  /** @inheritDoc */
  async getLastDesiredPosition(device: iShutter): Promise<iDesiredShutterPosition> {
    // The device id is bound rather than pasted in: it is a string, and a string inside quotes can close
    // them. The rest of the filter is this file's own text and stays in the statement - a bound id compares
    // against the column exactly as the literal did, so the reader answers what it always answered.
    const dbResult: iDesiredShutterPosition[] | null = await this.query<DesiredShutterPosition>(
      `SELECT position
       from hoffmation_schema."ShutterDeviceData"
       WHERE "deviceID" = $1
         and date >= CURRENT_DATE
         AND date
           < CURRENT_DATE + INTERVAL '1 DAY'
       ORDER BY date desc
         Limit 1`,
      [device.id],
    );
    if (dbResult !== null && dbResult.length > 0) {
      return dbResult[0];
    }

    ServerLogService.writeLog(
      LogLevel.Debug,
      `Es gibt noch keine persistierten Bewegungen für ${device.info.fullName}`,
    );
    return new DesiredShutterPosition(-1);
  }

  /** @inheritDoc */
  async motionSensorTodayCount(device: iMotionSensor): Promise<CountToday> {
    // Bound for the same reason as the reader above, and with the same result: the count is taken over the
    // rows whose id equals this string, whatever the string spells.
    const dbResult: CountToday[] | null = await this.query<CountToday>(
      `SELECT Count(*)
       from hoffmation_schema."MotionSensorDeviceData"
       WHERE "deviceID" = $1
         and "movementDetected"
         and date >= CURRENT_DATE
         AND date
           < CURRENT_DATE + INTERVAL '1 DAY'`,
      [device.id],
    );
    if (dbResult !== null && dbResult.length > 0) {
      const result = dbResult[0];
      result.count = Number(result.count);
      return result;
    }

    ServerLogService.writeLog(
      LogLevel.Debug,
      `Es gibt noch keine persistierten Bewegungen für ${device.info.fullName}`,
    );
    return new CountToday(0);
  }

  /** @inheritDoc */
  getShutterCalibration(_device: iShutter): Promise<iShutterCalibration> {
    ServerLogService.writeLog(LogLevel.Warn, "Postgres doesn't support Shutter Calibration yet.");
    return new Promise<iShutterCalibration>((_res, reject) => {
      reject('Not Implemented');
    });
  }

  async getTempMeasurements(device: iTemperatureCollector): Promise<iTemperatureMeasurement[]> {
    return this.getTemperatureHistory(device.id);
  }

  /** @inheritDoc */
  async getTemperatureHistory(deviceId: string, startDate?: Date, endDate?: Date): Promise<iTemperatureMeasurement[]> {
    const end = endDate ?? new Date();
    const start = startDate ?? new Date(end.getTime() - 24 * 60 * 60 * 1000);

    // The device id is bound rather than pasted in: it is a string this reader is handed, and a string inside
    // quotes can close them. The dates travel the same way for consistency - bound as ISO text, which is what
    // the naive column stores and hence the same comparison the statement makes with a literal.
    const dbResult: iTemperatureMeasurement[] | null = await this.query<iTemperatureMeasurement>(
      `SELECT temperature, date
       from hoffmation_schema."TemperatureSensorDeviceData"
       WHERE "deviceID" = $1
         and date >= $2
         AND date <= $3
       ORDER BY DATE DESC`,
      [deviceId, start.toISOString(), end.toISOString()],
    );
    if (dbResult === null || dbResult.length === 0) {
      PostgreSqlPersist.logEmptyAnswer('getTemperatureHistory', dbResult, start, end);
      return [];
    }
    const result: iTemperatureMeasurement[] = [];
    let dropped: number = 0;
    for (const entry of dbResult) {
      // The column is nullable and the write path stores a null whenever the sensor has nothing to say.
      // Converted directly an absent value becomes 0, and 0 °C is not an impossible reading but an ordinary
      // winter one - so it never looks wrong downstream, it only pulls every average it enters towards
      // freezing. A genuine zero survives: it is a temperature this installation really sees, and only an
      // absent or unreadable value is dropped.
      const temperature: number | undefined = PostgreSqlPersist.toFiniteNumber(entry.temperature);
      // A measurement without a timestamp cannot be placed: read as a Date an absent one lands on
      // 1970-01-01, which looks like a reading at the far edge of the window rather than like a missing one.
      const date: Date | undefined = PostgreSqlPersist.fromNaiveTimestamp(entry.date);
      if (temperature === undefined || date === undefined) {
        dropped++;
        continue;
      }
      result.push({
        temperature: temperature,
        date: date,
      });
    }
    PostgreSqlPersist.logDroppedRows('getTemperatureHistory', dropped);
    return result;
  }

  /** @inheritDoc */
  public async getBatteryLevelHistory(startDate: Date, endDate: Date): Promise<iBatteryLevelSample[]> {
    const dbResult: BatteryLevelRow[] | null = await this.query<BatteryLevelRow>(
      `SELECT "batteryLevel", "endDate"
       from hoffmation_schema."EnergyCalculation"
       WHERE "endDate" >= '${startDate.toISOString()}'
         AND "endDate" <= '${endDate.toISOString()}'
       ORDER BY "endDate" DESC`,
    );
    if (dbResult === null || dbResult.length === 0) {
      PostgreSqlPersist.logEmptyAnswer('getBatteryLevelHistory', dbResult, startDate, endDate);
      return [];
    }
    const result: iBatteryLevelSample[] = [];
    let dropped: number = 0;
    for (const entry of dbResult) {
      // "batteryLevel" was added to an existing table (see initialize()), so early rows carry no level.
      // Reading such a row as 0 % would invent a nightly low that never happened. The level is read at the
      // end of the interval (victron-device.ts:279-283 sets it right before persisting), so the reading is
      // dated with "endDate" - the same time base the consumption readings use.
      const stored: number | undefined = PostgreSqlPersist.toFiniteNumber(entry.batteryLevel);
      const date: Date | undefined = PostgreSqlPersist.fromNaiveTimestamp(entry.endDate);
      if (stored === undefined || date === undefined) {
        dropped++;
        continue;
      }
      // The column holds a fraction, not a percentage: victron-device.ts:279 divides the device's percentage
      // by 100 before persisting. Everything downstream of here - the reserve, the corrected sample, the
      // thresholds of the unit itself - is in percent, so the conversion happens here. Do not "tidy" this
      // multiplication away without changing that line.
      const level: number = Utils.round(stored * 100, 1);
      // Outside 0..100 this is not a state of charge: victron-device.ts:89-95 reports -1 when the battery
      // says nothing, which lands in the column as -0.01. An invented trough is worse than a missing one.
      // A plain 0 counts as "not reported" as well, and the trade-off behind that is deliberate: the column
      // cannot tell "not reported" from "really empty", because iEnergyCalculation.batteryLevel starts at 0
      // and an energy manager that never sets it (JsObjectEnergyManager) persists that 0 on every row. The
      // price is that a genuine zero reading is discarded - which beats fitting the model on an invented one,
      // and a battery that reports 0 % does not occur in practice: its management cuts off well before, and
      // an unknown level arrives as -1, never as 0.
      if (level <= 0 || level > 100) {
        dropped++;
        continue;
      }
      result.push({ level: level, date: date });
    }
    PostgreSqlPersist.logDroppedRows('getBatteryLevelHistory', dropped);
    return result;
  }

  /** @inheritDoc */
  public async getEnergyConsumptionHistory(startDate: Date, endDate: Date): Promise<iConsumptionWindowSample[]> {
    const dbResult: EnergyConsumptionRow[] | null = await this.query<EnergyConsumptionRow>(
      `SELECT "selfConsumedKwH", "drawnKwH", "endDate"
       from hoffmation_schema."EnergyCalculation"
       WHERE "endDate" >= '${startDate.toISOString()}'
         AND "endDate" <= '${endDate.toISOString()}'
       ORDER BY "endDate" DESC`,
    );
    if (dbResult === null || dbResult.length === 0) {
      PostgreSqlPersist.logEmptyAnswer('getEnergyConsumptionHistory', dbResult, startDate, endDate);
      return [];
    }
    const result: iConsumptionWindowSample[] = [];
    let dropped: number = 0;
    for (const entry of dbResult) {
      // What the house used out of its own generation plus what it pulled from the grid. "injectedKwH" is
      // export and deliberately absent - both energy managers build the three so that
      // selfConsuming + drawing == total house consumption (phaseState.ts:11-14, victron-device.ts:126).
      const selfConsumed: number | undefined = PostgreSqlPersist.toFiniteNumber(entry.selfConsumedKwH);
      const drawn: number | undefined = PostgreSqlPersist.toFiniteNumber(entry.drawnKwH);
      // The row's energy belongs to the interval it closes, so it is timestamped with its end - a reading
      // dated at its start would be counted into the following window instead of its own.
      const date: Date | undefined = PostgreSqlPersist.fromNaiveTimestamp(entry.endDate);
      if (selfConsumed === undefined || drawn === undefined || date === undefined) {
        dropped++;
        continue;
      }
      result.push({ consumedKwh: selfConsumed + drawn, date: date });
    }
    PostgreSqlPersist.logDroppedRows('getEnergyConsumptionHistory', dropped);
    return result;
  }

  /** @inheritDoc */
  public async getActuatorHistory(deviceId: string, startDate: Date, endDate: Date): Promise<iActuatorStateSample[]> {
    // The device id is bound rather than pasted in: it is a string this reader is handed, and a string
    // inside quotes can close them. The dates travel the same way for consistency - bound as ISO text, which
    // is what the naive column stores and hence the same comparison the statement makes with a literal.
    const dbResult: ActuatorStateRow[] | null = await this.query<ActuatorStateRow>(
      `SELECT "on", date
       from hoffmation_schema."ActuatorDeviceData"
       WHERE "deviceID" = $1
         and date >= $2
         AND date <= $3
       ORDER BY DATE DESC`,
      [deviceId, startDate.toISOString(), endDate.toISOString()],
    );
    if (dbResult === null || dbResult.length === 0) {
      PostgreSqlPersist.logEmptyAnswer('getActuatorHistory', dbResult, startDate, endDate);
      return [];
    }
    const result: iActuatorStateSample[] = [];
    let dropped: number = 0;
    for (const entry of dbResult) {
      // A row without a state says nothing; counting it as off would understate the run time.
      const date: Date | undefined = PostgreSqlPersist.fromNaiveTimestamp(entry.date);
      if (entry.on === null || entry.on === undefined || date === undefined) {
        dropped++;
        continue;
      }
      result.push({ on: entry.on === true || entry.on === 'true' || entry.on === 't', date: date });
    }
    PostgreSqlPersist.logDroppedRows('getActuatorHistory', dropped);
    return result;
  }

  /** @inheritDoc */
  public async getWeatherDaySummaries(startDate: Date, endDate: Date): Promise<iWeatherDaySummary[]> {
    const dbResult: WeatherDaySummaryRow[] | null = await this.query<WeatherDaySummaryRow>(
      `SELECT date, "cloudCover", "tempMin", "tempMax"
       from hoffmation_schema."WeatherDaySummary"
       WHERE date >= '${startDate.toISOString()}'
         AND date <= '${endDate.toISOString()}'
       ORDER BY DATE DESC`,
    );
    if (dbResult === null || dbResult.length === 0) {
      PostgreSqlPersist.logEmptyAnswer('getWeatherDaySummaries', dbResult, startDate, endDate);
      return [];
    }
    const result: iWeatherDaySummary[] = [];
    let dropped: number = 0;
    for (const entry of dbResult) {
      const cloudCover: number | undefined = PostgreSqlPersist.toFiniteNumber(entry.cloudCover);
      const tempMin: number | undefined = PostgreSqlPersist.toFiniteNumber(entry.tempMin);
      const tempMax: number | undefined = PostgreSqlPersist.toFiniteNumber(entry.tempMax);
      // A half filled aggregate is dropped rather than completed: a substitute cloud cover would be fitted
      // as if it had been measured.
      const date: Date | undefined = PostgreSqlPersist.fromNaiveTimestamp(entry.date);
      if (cloudCover === undefined || tempMin === undefined || tempMax === undefined || date === undefined) {
        dropped++;
        continue;
      }
      result.push({ date: date, cloudCover: cloudCover, tempMin: tempMin, tempMax: tempMax });
    }
    PostgreSqlPersist.logDroppedRows('getWeatherDaySummaries', dropped);
    return result;
  }

  /** @inheritDoc */
  public persistWeatherDaySummary(summary: iWeatherDaySummary): void {
    // The values are bound, not written into the statement. Every other write in this file carries figures
    // this process produced itself; these come from the weather service, and they are read back out of this
    // table by a decision that switches an appliance. The fetcher already refuses what is not a number, but
    // that check sits one caller away from being bypassed - so the statement itself is fixed text and the
    // aggregate is data. The update half binds the same three placeholders: it is the one an interpolation
    // is most easily left behind in.
    this.query(
      `
      insert into hoffmation_schema."WeatherDaySummary" ("date", "cloudCover", "tempMin", "tempMax")
      values ($1, $2, $3, $4) ON CONFLICT ("date")
    DO
      UPDATE SET
        "cloudCover" = $2,
        "tempMin" = $3,
        "tempMax" = $4
      ;
    `,
      [summary.date.toISOString(), summary.cloudCover, summary.tempMin, summary.tempMax],
    );
  }

  /** @inheritDoc */
  async initialize(): Promise<void> {
    await this.psql.connect();
    // Execute BasicRoomsDDL
    await this.psql.query(
      `
DO $$
BEGIN
  CREATE SCHEMA IF NOT EXISTS hoffmation_schema;
  
  IF (SELECT to_regclass('hoffmation_schema."BasicRooms"') IS NULL) Then
    create table hoffmation_schema."BasicRooms"
    (
        name  varchar(30) not null
            constraint table_name_pk
                primary key,
        etage integer
    );

    create unique index table_name_name_uindex
        on hoffmation_schema."BasicRooms" (name);

  END IF;
  
  IF (SELECT to_regclass('hoffmation_schema."DeviceInfo"') IS NULL) Then    
    create table hoffmation_schema."DeviceInfo"
    (
        deviceid      varchar(60) not null
            constraint deviceinfo_pk
                primary key,
        roomname      varchar(30)
            constraint "DeviceInfo_BasicRooms_null_fk"
                references hoffmation_schema."BasicRooms",
        alldeviceskey varchar(60),
        customname    varchar(60),
        devtype       integer
    );

  END IF;


  IF (SELECT to_regclass('hoffmation_schema."IlluminationSensorDeviceData"') IS NULL) Then
    create table hoffmation_schema."IlluminationSensorDeviceData"
    (
        "deviceID"         varchar(60) not null
            constraint "IlluminationSensorDeviceData_DeviceInfo_null_fk"
                references hoffmation_schema."DeviceInfo"
                on delete set null,
        "illumination" int,
        date               timestamp   not null,
        constraint IlluminationSensorDeviceData_pk
          primary key ("deviceID", date)
    );

  END IF;
    
  IF (SELECT to_regclass('hoffmation_schema."ButtonSwitchPresses"') IS NULL) Then
    create table if not exists hoffmation_schema."ButtonSwitchPresses"
    (
        "deviceID"         varchar(60) not null
            constraint "ButtonSwitchPresses_DeviceInfo_null_fk"
                references hoffmation_schema."DeviceInfo"
                on delete set null,
        "pressType" int,
        "buttonName" varchar(30),
        date               timestamp   not null,
        constraint buttonswitchpresses_pk
            primary key ("deviceID", "pressType", date)
    );

  END IF;
    
  IF (SELECT to_regclass('hoffmation_schema."EnergyCalculation"') IS NULL) Then
    create table hoffmation_schema."EnergyCalculation"
    (
        "startDate"           timestamp not null
            constraint energycalculation_pk
                primary key,
        "endDate"             timestamp,
        "selfConsumedKwH" double precision,
        "injectedKwH"     double precision,
        "drawnKwH"        double precision
    );


    create unique index energycalculation_startdate_uindex
      on hoffmation_schema."EnergyCalculation" ("startDate");

  END IF;

  IF (SELECT to_regclass('hoffmation_schema."AcDeviceData"') IS NULL) Then    
    create table hoffmation_schema."AcDeviceData"
    (
        "deviceID" varchar(60) not null,
        "on"       boolean,
        "istTemperatur"  double precision,
        date       timestamp   not null,
        constraint acdevicedata_pk
            primary key ("deviceID", date)
    );
    
  END IF;


  IF (SELECT to_regclass('hoffmation_schema."ActuatorDeviceData"') IS NULL) Then    
    create table hoffmation_schema."ActuatorDeviceData"
    (
        "deviceID" varchar(60) not null,
        "on"       boolean,
        date       timestamp   not null,
        percentage integer,
        constraint ActuatorDeviceData_pk
            primary key ("deviceID", date)
    );
  
  END IF;

  IF (SELECT to_regclass('hoffmation_schema."MotionSensorDeviceData"') IS NULL) Then    
    create table hoffmation_schema."MotionSensorDeviceData"
    (
        "deviceID" varchar(60) not null,
        "movementDetected"       boolean,
        date       timestamp   not null,
        constraint motionsensordevicedata_pk
            primary key ("deviceID", date)
    );
  
  END IF;

  IF (SELECT to_regclass('hoffmation_schema."ShutterDeviceData"') IS NULL) Then    
    create table if not exists hoffmation_schema."ShutterDeviceData"
    (
        "deviceID"         varchar(60) not null
            constraint "ShutterDeviceData_DeviceInfo_null_fk"
                references hoffmation_schema."DeviceInfo"
                on delete set null,
        "position" double precision,
        date               timestamp   not null,
        "desiredPosition" double precision,
        constraint shutterdevicedata_pk
            primary key ("deviceID", date)
    );
    
  END IF;

  IF (SELECT to_regclass('hoffmation_schema."HandleDeviceData"') IS NULL) Then    
    create table if not exists hoffmation_schema."HandleDeviceData"
    (
        "deviceID"         varchar(60) not null
            constraint "HandleDeviceData_DeviceInfo_null_fk"
                references hoffmation_schema."DeviceInfo"
                on delete set null,
        "position" double precision,
        date               timestamp   not null,
        constraint handledevicedata_pk
            primary key ("deviceID", date)
    );
    
  END IF;

  IF (SELECT to_regclass('hoffmation_schema."TemperatureSensorDeviceData"') IS NULL) Then  
    create table if not exists hoffmation_schema."TemperatureSensorDeviceData"
    (
        "deviceID"        varchar(60) not null
            constraint "TemperatureSensorDeviceData_DeviceInfo_null_fk"
                references hoffmation_schema."DeviceInfo"
                on delete set null,
        temperature          double precision,
        date              timestamp   not null,
        "roomTemperature" double precision,
        constraint temperaturesensordevicedata_pk
            primary key ("deviceID", date)
    );
    
  END IF;

  IF (SELECT to_regclass('hoffmation_schema."HumiditySensorDeviceData"') IS NULL) Then  
    create table if not exists hoffmation_schema."HumiditySensorDeviceData"
    (
        "deviceID"        varchar(60) not null
            constraint "HumiditySensorDeviceData_DeviceInfo_null_fk"
                references hoffmation_schema."DeviceInfo"
                on delete set null,
        humidity          double precision,
        date              timestamp   not null,
        constraint humiditysensordevicedata_pk
            primary key ("deviceID", date)
    );

  END IF;

  IF (SELECT to_regclass('hoffmation_schema."AirQualitySensorDeviceData"') IS NULL) Then
    -- Deliberately without a foreign key on "DeviceInfo": creating one needs the REFERENCES privilege on
    -- that table, which an existing installation whose tables were created by another role may not grant.
    -- The sibling tables only get away with it because their CREATE is skipped once they exist.
    create table if not exists hoffmation_schema."AirQualitySensorDeviceData"
    (
        "deviceID"        varchar(60) not null,
        aqi               double precision,
        co2               double precision,
        nox               double precision,
        "pm1p0"           double precision,
        "pm2p5"           double precision,
        "pm4p0"           double precision,
        "pm10p0"          double precision,
        tvoc              double precision,
        vape              double precision,
        voc               double precision,
        date              timestamp   not null,
        constraint airqualitysensordevicedata_pk
            primary key ("deviceID", date)
    );

  END IF;

  IF (SELECT to_regclass('hoffmation_schema."BatteryDeviceData"') IS NULL) Then  
    create table if not exists hoffmation_schema."BatteryDeviceData"
    (
        "deviceID"        varchar(60) not null
            constraint "BatteryDeviceData_DeviceInfo_null_fk"
                references hoffmation_schema."DeviceInfo"
                on delete set null,
        battery          double precision,
        date              timestamp   not null,
        constraint batterydevicedata_pk
            primary key ("deviceID", date)
    );
    
  END IF;

  IF (SELECT to_regclass('hoffmation_schema."ZigbeeDeviceData"') IS NULL) Then
    create table if not exists hoffmation_schema."ZigbeeDeviceData"
    (
        "deviceID"        varchar(60) not null
            constraint "ZigbeeDeviceData_DeviceInfo_null_fk"
                references hoffmation_schema."DeviceInfo"
                on delete set null,
        date              timestamp   not null,
        available          boolean,
        linkQuality          double precision,
        lastUpdate          timestamp,
        constraint zigbeedevicedata_pk
            primary key ("deviceID", date)
    );

  END IF;

  
    
  IF (SELECT to_regclass('hoffmation_schema."HeaterDeviceData"') IS NULL) Then
    create table if not exists hoffmation_schema."HeaterDeviceData"
    (
        "deviceID"        varchar(60) not null
            constraint "HeaterDeviceData_DeviceInfo_null_fk"
                references hoffmation_schema."DeviceInfo",
        "level"              double precision,
        date              timestamp   not null,
        "roomTemperature" double precision,
        "desiredTemperature" double precision,
        "seasonTurnOff" boolean,
        constraint heaterevicedata_pk
            primary key ("deviceID", date)
    );
    
  END IF;
  
  IF (SELECT to_regclass('hoffmation_schema."Settings"') IS NULL) Then
    create table if not exists hoffmation_schema."Settings"
    (
        "id"            varchar(60) not null,
        "settings"      jsonb not null,
        "customname"    varchar(100) not null,
        date            timestamp   not null,
        constraint settings_pk
            primary key ("id", date)
    );
    
  END IF;

  IF (SELECT to_regclass('hoffmation_schema."WeatherDaySummary"') IS NULL) Then
    create table hoffmation_schema."WeatherDaySummary"
    (
        date         timestamp not null
            constraint weatherdaysummary_pk
                primary key,
        "cloudCover" double precision,
        "tempMin"    double precision,
        "tempMax"    double precision
    );

  END IF;

  IF (SELECT COUNT(column_name) = 0
    FROM information_schema.columns
    WHERE table_name = 'EnergyCalculation'
      and column_name = 'batteryStoredKwH') Then
    alter table hoffmation_schema."EnergyCalculation"
      add "batteryStoredKwH" double precision;
  END IF;
  
  IF (SELECT COUNT(column_name) = 0
    FROM information_schema.columns
    WHERE table_name = 'HeaterDeviceData'
      and column_name = 'windowOpen') Then
    alter table hoffmation_schema."HeaterDeviceData"
    add "windowOpen" boolean;
  END IF;
  
  
  IF (SELECT COUNT(column_name) = 0
    FROM information_schema.columns
    WHERE table_name = 'EnergyCalculation'
      and column_name = 'batteryLevel') Then
    alter table hoffmation_schema."EnergyCalculation"
      add "batteryLevel" double precision;
  END IF;
  IF (SELECT pg_typeof(settings) = to_regtype('varchar')
      FROM hoffmation_schema."Settings"
      LIMIT 1) THEN
      alter table hoffmation_schema."Settings"
          alter column settings type jsonb using settings::jsonb;
  END IF;
END
$$;`,
    );
    this.initialized = true;
    ServerLogService.writeLog(LogLevel.Info, 'Postgres DB initialized');
  }

  /** @inheritDoc */
  public persistAC(device: iAcDevice): void {
    this.query(`
      insert into hoffmation_schema."AcDeviceData" ("deviceID", "on", "date", "roomTemperature")
      values ('${device.id}', ${device.on}, '${new Date().toISOString()}', ${device.temperature});
    `);
  }

  /** @inheritDoc */
  public persistActuator(device: iActuator): void {
    let percentage: number | undefined = undefined;
    if (device.deviceCapabilities.includes(DeviceCapability.dimmablelamp)) {
      percentage = (device as iDimmableLamp).brightness;
    }
    this.query(`
      insert into hoffmation_schema."ActuatorDeviceData" ("deviceID", "on", "date", "percentage")
      values ('${device.id}', ${device.actuatorOn}, '${new Date().toISOString()}', ${percentage ?? 'null'});
    `);
  }

  /** @inheritDoc */
  public persistHeater(device: iHeater): void {
    let roomTemp: number | null = device.roomTemperature;
    let desiredTemperature: number | null = device.desiredTemperature;
    if (roomTemp == UNDEFINED_TEMP_VALUE) {
      roomTemp = null;
    }
    if (desiredTemperature == UNDEFINED_TEMP_VALUE) {
      desiredTemperature = null;
    }
    void this.query(`
      insert into hoffmation_schema."HeaterDeviceData"
      ("deviceID", "level", "date", "roomTemperature", "desiredTemperature", "seasonTurnOff", "windowOpen")
      values ('${device.id}', ${device.iLevel}, '${new Date().toISOString()}', ${roomTemp ?? 'null'}, ${
        desiredTemperature ?? 'null'
      }, ${device.seasonTurnOff}, ${device.windowOpen});
    `);
  }

  /** @inheritDoc */
  public persistHandleSensor(device: iHandle): void {
    const currentPos: number = device.position;
    this.query(`
      insert into hoffmation_schema."HandleDeviceData" ("deviceID", "position", "date")
      values ('${device.id}', ${currentPos}, '${new Date().toISOString()}');
    `);
  }

  /** @inheritDoc */
  public persistSwitchInput(device: iButtonSwitch, pressType: ButtonPressType, buttonName: string): void {
    // The button name is a text a person gave and the id is a text as well, so both are bound - an apostrophe
    // in either closes the literal it would be pasted into. The press type is a number and stays this file's
    // own text, and so does the timestamp: the column is `timestamp without time zone` and every recorded row
    // was written as an interpolated `toISOString()`.
    this.query(
      `
      insert into hoffmation_schema."ButtonSwitchPresses" ("deviceID", "pressType", "buttonName", "date")
      values ($1, ${pressType}, $2, '${new Date().toISOString()}');
    `,
      [device.id, buttonName],
    );
  }

  /** @inheritDoc */
  public persistMotionSensor(device: iMotionSensor): void {
    this.query(`
      insert into hoffmation_schema."MotionSensorDeviceData" ("deviceID", "movementDetected", "date")
      values ('${device.id}', ${device.movementDetected}, '${new Date().toISOString()}');
    `);
  }

  /** @inheritDoc */
  public persistShutter(device: iShutter): void {
    const currentLevel: number | null = device.currentLevel >= 0 ? device.currentLevel : null;
    const desiredLevel: number | null = device.desiredWindowShutterLevel >= 0 ? device.desiredWindowShutterLevel : null;
    this.query(`
      insert into hoffmation_schema."ShutterDeviceData" ("deviceID", "position", "date", "desiredPosition")
      values ('${device.id}', ${currentLevel}, '${new Date().toISOString()}', ${desiredLevel});
    `);
  }

  /** @inheritDoc */
  public persistTemperatureSensor(device: iTemperatureCollector): void {
    let roomTemp: number | null = device.roomTemperature;
    if (roomTemp === UNDEFINED_TEMP_VALUE) {
      roomTemp = null;
    }
    this.query(`
      insert into hoffmation_schema."TemperatureSensorDeviceData" ("deviceID", "temperature", "date", "roomTemperature")
      values ('${device.id}', ${device.iTemperature}, '${new Date().toISOString()}', ${roomTemp ?? 'null'});
    `);
  }

  /** @inheritDoc */
  public persistHumiditySensor(device: iHumidityCollector): void {
    this.query(`
      insert into hoffmation_schema."HumiditySensorDeviceData" ("deviceID", "humidity", "date")
      values ('${device.id}', ${device.humidity}, '${new Date().toISOString()}');
    `);
  }

  /** @inheritDoc */
  public persistAirQualitySensor(device: iAirQualityCollector): void {
    const readings: iAirQualityReadings = device.airQuality;
    const value = (metric: number): string => (metric === UNDEFINED_AIR_QUALITY_VALUE ? 'null' : `${metric}`);
    this.query(`
      insert into hoffmation_schema."AirQualitySensorDeviceData" ("deviceID", "aqi", "co2", "nox", "pm1p0", "pm2p5", "pm4p0", "pm10p0", "tvoc", "vape", "voc", "date")
      values ('${device.id}', ${value(readings.aqi)}, ${value(readings.co2)}, ${value(readings.nox)}, ${value(readings.pm1p0)}, ${value(readings.pm2p5)}, ${value(readings.pm4p0)}, ${value(readings.pm10p0)}, ${value(readings.tvoc)}, ${value(readings.vape)}, ${value(readings.voc)}, '${new Date().toISOString()}');
    `);
  }

  /** @inheritDoc */
  public persistBatteryDevice(device: iBatteryDevice): void {
    this.query(`
      insert into hoffmation_schema."BatteryDeviceData" ("deviceID", "battery", "date")
      values ('${device.id}', ${Utils.round(device.batteryLevel, 1)}, '${new Date().toISOString()}');
    `);
  }

  /** @inheritDoc */
  public persistZigbeeDevice(device: iZigbeeDevice): void {
    const dateValue = device.lastUpdate.getTime() > 0 ? `'${device.lastUpdate.toISOString()}'` : 'null';
    this.query(`
      insert into hoffmation_schema."ZigbeeDeviceData" ("deviceID", "date", "available", "linkQuality", "lastUpdate")
      values ('${device.id}', '${new Date().toISOString()}', ${device.available}, ${device.linkQuality},
              ${dateValue});
    `);
  }

  /** @inheritDoc */
  public persistIlluminationSensor(device: iIlluminationSensor): void {
    this.query(`
      insert into hoffmation_schema."IlluminationSensorDeviceData" ("deviceID", "illumination", "date")
      values ('${device.id}', ${device.currentIllumination}, '${new Date().toISOString()}');`);
  }

  /** @inheritDoc */
  public persistShutterCalibration(_data: iShutterCalibration): void {
    ServerLogService.writeLog(LogLevel.Warn, "Postgres doesn't support Shutter Calibration yet.");
  }

  /** @inheritDoc */
  public persistEnergyManager(calc: EnergyCalculation): void {
    this.query(`
      insert into hoffmation_schema."EnergyCalculation" ("startDate", "endDate", "selfConsumedKwH", "injectedKwH",
                                                         "drawnKwH", "batteryStoredKwH", "batteryLevel")
      values ('${new Date(calc.startMs).toISOString()}', '${new Date(calc.endMs).toISOString()}',
              ${calc.selfConsumedKwH}, ${calc.injectedKwH}, ${calc.drawnKwH}, ${calc.batteryStoredKwH},
              ${calc.batteryLevel});
    `);
  }

  /** @inheritDoc */
  public persistSettings(id: string, settings: string, customName: string): void {
    // Of the four write paths that carry a text this is the widest: `settings` is a `JSON.stringify` of a
    // whole settings object, so every value a person ever typed into any device setting arrives here. One
    // apostrophe anywhere inside it closes the literal it would be pasted into - the statement fails, the
    // failure is only a logged warning, and the setting is silently not stored until someone notices it gone
    // after a restart. All three texts are bound, in both halves of the upsert; the blob keeps its own
    // placeholder in the update half. The timestamp stays this file's own text: the column is `timestamp
    // without time zone` and every recorded row was written as an interpolated `toISOString()`.
    this.query(
      `
      insert into hoffmation_schema."Settings" (id, settings, customname, date)
      values ($1, $2, $3, '${new Date().toISOString()}') ON CONFLICT (id, date)
    DO
      UPDATE SET
        settings = $2,
        customname = $3
      ;
    `,
      [id, settings, customName],
    );
  }

  /** @inheritDoc */
  public async loadSettings(id: string): Promise<string | undefined> {
    // The id is bound rather than pasted in. Of the readers in this file it is the one whose argument does
    // not come out of the device list: besides ObjectSettings.initializeFromDb, which passes a holder's id,
    // ApiService.loadConfig hands through whatever its caller asks for - so this is a string from beyond
    // this process, and a string inside quotes can close them.
    const dbResult: idSettings[] | null = await this.query<idSettings>(
      `SELECT settings::text, id, date
       from hoffmation_schema."Settings"
       WHERE "id" = $1
       ORDER BY "date" DESC
         LIMIT 1`,
      [id],
    );
    if (dbResult !== null && dbResult.length > 0) {
      return dbResult[0].settings;
    }

    ServerLogService.writeLog(LogLevel.Info, `No persisted settings for ${id} found`);
    return undefined;
  }

  /**
   * Runs a statement, optionally with bind values.
   *
   * `values` is what makes a statement able to carry data that did not come from this process: the driver
   * sends text and values apart, so a value is never parsed as SQL, whatever it spells. Anything that is not
   * a literal fixed by this file belongs in there rather than in the string.
   * @param query - The statement, with `$1..$n` where values are bound
   * @param values - The values to bind, in the order of their placeholders
   * @returns - The rows, or null when the statement did not come back
   */
  private async query<T extends QueryResultRow>(query: string, values?: unknown[]): Promise<T[] | null> {
    if (!this.isPsqlReady()) {
      return null;
    }
    return new Promise<T[] | null>((resolve) => {
      this.psql
        .query<T>(query, values)
        .then((result) => {
          resolve(result.rows);
        })
        .catch((r) => {
          ServerLogService.writeLog(LogLevel.Warn, `Postgres Query failed: ${r}`);
          ServerLogService.writeLog(LogLevel.Debug, `Query: ${query}`);
          resolve(null);
        });
    });
  }

  /**
   * A missing or unreadable history is a defined state of the history based decisions, not a failure - but it
   * has to be visible once, otherwise "no answer" and "nothing recorded" look the same from the outside.
   * @param reader - The reader that came up empty
   * @param dbResult - null when the query itself did not come back, an empty set otherwise
   * @param startDate - Start of the requested window
   * @param endDate - End of the requested window
   */
  private static logEmptyAnswer(reader: string, dbResult: unknown[] | null, startDate: Date, endDate: Date): void {
    ServerLogService.writeLog(
      LogLevel.Debug,
      `${reader}: ${dbResult === null ? 'no answer' : 'no rows'} for ${startDate.toISOString()} - ${endDate.toISOString()}`,
    );
  }

  private static logDroppedRows(reader: string, dropped: number): void {
    if (dropped === 0) {
      return;
    }
    ServerLogService.writeLog(LogLevel.Debug, `${reader}: dropped ${dropped} unusable row(s)`);
  }

  /**
   * Turns what the driver made of a `timestamp without time zone` back into the instant it was stored for.
   *
   * The write path stores `new Date(...).toISOString()`. For a naive column PostgreSQL silently drops the
   * zone suffix of the literal and keeps the UTC wall clock. Reading it back, the driver rebuilds those
   * components with the **local** multi argument Date constructor (`postgres-date/index.js:49-50`, registered
   * for OID 1114 in `pg-types/lib/textParsers.js:175`), so the Date is off by the machine's zone offset - one
   * hour or two in Berlin, and the offset changes inside a single 90 day window at the daylight saving
   * switch. Reading the local components back out as UTC undoes exactly that.
   *
   * Only the read side compensates: `toISOString()` already stores the UTC wall clock and three years of
   * recorded history are written that way, so changing the write path would put old and new rows at odds.
   * @param value - The Date the driver produced, or null for an absent timestamp
   * @returns - The instant, or undefined when there is none to be had
   */
  private static fromNaiveTimestamp(value: Date | null): Date | undefined {
    if (value === null || isNaN(value.getTime())) {
      return undefined;
    }
    return new Date(
      Date.UTC(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
        value.getHours(),
        value.getMinutes(),
        value.getSeconds(),
        value.getMilliseconds(),
      ),
    );
  }

  private static toFiniteNumber(value: string | number | null | undefined): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed: number = Number(value);
    return isFinite(parsed) ? parsed : undefined;
  }

  private isPsqlReady() {
    if (!this.initialized) {
      ServerLogService.writeLog(LogLevel.Warn, 'Db is not yet initialized');
      return false;
    }
    if (!this.psql) {
      ServerLogService.writeLog(LogLevel.Error, 'PSQL client missing');
      return false;
    }
    return true;
  }
}
