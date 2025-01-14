import { Pool, PoolConfig, QueryResultRow } from 'pg';
import {
  iAcDevice,
  iActuator,
  iBaseDevice,
  iBatteryDevice,
  iButtonSwitch,
  iDesiredShutterPosition,
  iDimmableLamp,
  iHandle,
  iHeater,
  iHumidityCollector,
  iIlluminationSensor,
  iMotionSensor,
  iPersist,
  iRoomBase,
  iShutter,
  iShutterCalibration,
  iTemperatureCollector,
  iZigbeeDevice,
  UNDEFINED_TEMP_VALUE,
} from '../../interfaces';
import { CountToday, DesiredShutterPosition, EnergyCalculation, idSettings } from '../../models';
import { ServerLogService } from '../../logging';
import { ButtonPressType, DeviceCapability, LogLevel } from '../../enums';
import { Utils } from '../../utils';

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
    this.query(`
        insert into hoffmation_schema."BasicRooms" (name, etage)
        values ('${room.roomName}', ${room.etage}) ON CONFLICT (name)
    DO
        UPDATE SET
            etage = ${room.etage}
        ;
    `);
  }

  /** @inheritDoc */
  addDevice(device: iBaseDevice): void {
    this.query(`
        insert into hoffmation_schema."DeviceInfo" ("deviceid", "roomname", "alldeviceskey", "customname", "devtype")
        values ('${device.id}', '${device.info.room}', '${device.info.allDevicesKey}', '${device.info.customName}',
                ${device.deviceType}) ON CONFLICT ("deviceid")
    DO
        UPDATE SET
            "roomname" = '${device.info.room}',
            "alldeviceskey" = '${device.info.allDevicesKey}',
            "customname" = '${device.info.customName}',
            "devtype" = ${device.deviceType}
        ;
    `);
  }

  /** @inheritDoc */
  async getLastDesiredPosition(device: iShutter): Promise<iDesiredShutterPosition> {
    const dbResult: iDesiredShutterPosition[] | null = await this.query<DesiredShutterPosition>(
      `SELECT position
       from hoffmation_schema."ShutterDeviceData"
       WHERE "deviceID" = '${device.id}'
         and date >= CURRENT_DATE
         AND date
           < CURRENT_DATE + INTERVAL '1 DAY'
       ORDER BY date desc
           Limit 1`,
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
    const dbResult: CountToday[] | null = await this.query<CountToday>(
      `SELECT Count(*)
       from hoffmation_schema."MotionSensorDeviceData"
       WHERE "deviceID" = '${device.id}'
         and "movementDetected"
         and date >= CURRENT_DATE
         AND date
           < CURRENT_DATE + INTERVAL '1 DAY'`,
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
    this.query(`
        insert into hoffmation_schema."ButtonSwitchPresses" ("deviceID", "pressType", "buttonName", "date")
        values ('${device.id}', ${pressType}, '${buttonName}', '${new Date().toISOString()}');
    `);
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
    this.query(`
        insert into hoffmation_schema."Settings" (id, settings, customname, date)
        values ('${id}', '${settings}', '${customName}', '${new Date().toISOString()}') ON CONFLICT (id, date)
    DO
        UPDATE SET
            settings = '${settings}',
            customname = '${customName}'
        ;
    `);
  }

  /** @inheritDoc */
  public async loadSettings(id: string): Promise<string | undefined> {
    const dbResult: idSettings[] | null = await this.query<idSettings>(
      `SELECT settings::text, id, date
       from hoffmation_schema."Settings"
       WHERE "id" = '${id}'
       ORDER BY "date" DESC
           LIMIT 1`,
    );
    if (dbResult !== null && dbResult.length > 0) {
      return dbResult[0].settings;
    }

    ServerLogService.writeLog(LogLevel.Info, `No persisted settings for ${id} found`);
    return undefined;
  }

  private async query<T extends QueryResultRow>(query: string): Promise<T[] | null> {
    if (!this.isPsqlReady()) {
      return null;
    }
    return new Promise<T[] | null>((resolve) => {
      this.psql
        .query<T>(query)
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
