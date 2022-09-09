import { iPersist } from './iPersist';
import {
  CountToday,
  CurrentIlluminationDataPoint,
  EnergyCalculation,
  LogLevel,
  RoomBase,
  ShutterCalibration,
  TemperaturDataPoint,
} from '../../../models';
import { iAcDevice, iBaseDevice, iHeater, iLamp, iMotionSensor, IoBrokerBaseDevice } from '../../devices';
import { iPersistenceSettings } from '../../config';
import { Pool, QueryResultRow } from 'pg';
import { ServerLogService } from '../log-service';

export class PostgreSqlPersist implements iPersist {
  initialized: boolean = false;
  private readonly psql: Pool;

  public constructor(config: iPersistenceSettings) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.psql = new Pool(config.postgreSql!);
  }

  addRoom(room: RoomBase): void {
    this.query(`
insert into hoffmation_schema."BasicRooms" (name, etage)
values ('${room.roomName}',${room.settings.etage})
    ON CONFLICT (name)
    DO UPDATE SET
        etage = ${room.settings.etage}
;
    `);
  }

  addDevice(device: iBaseDevice): void {
    this.query(`
insert into hoffmation_schema."DeviceInfo" ("deviceid", "roomname", "alldeviceskey", "customname", "devtype")
values ('${device.id}','${device.info.room}','${device.info.allDevicesKey}','${device.info.customName}', ${device.deviceType})
    ON CONFLICT ("deviceid")
    DO UPDATE SET
        "roomname" = '${device.info.room}',
        "alldeviceskey" = '${device.info.allDevicesKey}',
        "customname" = '${device.info.customName}',
        "devtype" = ${device.deviceType}
;
    `);
  }

  addTemperaturDataPoint(heater: iHeater): void {
    ServerLogService.writeLog(LogLevel.Trace, `Persisting Temperatur Data for ${heater.info.customName}`);
    this.query(`
insert into hoffmation_schema."TemperaturData" ("date", "humidity", "istTemperatur", "level", "name", "sollTemperatur")
values ('${new Date().toISOString()}',${heater.humidity},${heater.iTemperature},${heater.iLevel},'${
      heater.info.customName
    }',${heater.desiredTemperature});`);

    this.query(`
insert into hoffmation_schema."HeatGroupCollection" ("date", "humidity", "istTemperatur", "level", "name", "sollTemperatur")
values ('${new Date().toISOString()}',${heater.humidity},${heater.iTemperature},${heater.iLevel},'${
      heater.info.customName
    }',${heater.desiredTemperature})
    ON CONFLICT (name)
    DO UPDATE SET
        "date" = '${new Date().toISOString()}',
        "humidity" = ${heater.humidity},
        "istTemperatur" = ${heater.iTemperature},
        "level" = ${heater.iLevel},
        "sollTemperatur" = ${heater.desiredTemperature}
;
    `);
  }

  async motionSensorTodayCount(device: iMotionSensor): Promise<CountToday> {
    const dbResult: CountToday[] | null = await this.query<CountToday>(
      `SELECT Count(*) 
from hoffmation_schema."MotionSensorDeviceData" 
WHERE "deviceID" = '${device.id}' and "movementDetected" and date >= CURRENT_DATE AND date < CURRENT_DATE + INTERVAL '1 DAY'`,
    );
    if (dbResult !== null && dbResult.length > 0) {
      return dbResult[0];
    }

    ServerLogService.writeLog(
      LogLevel.Debug,
      `Es gibt noch keine persistierten Bewegungen für ${device.info.fullName}`,
    );
    return new CountToday(0);
  }

  getShutterCalibration(_device: IoBrokerBaseDevice): Promise<ShutterCalibration> {
    ServerLogService.writeLog(LogLevel.Warn, `Postgres doesn't support Shutter Calibration yet.`);
    return new Promise<ShutterCalibration>((_res, reject) => {
      reject('Not Implemented');
    });
  }

  async initialize(): Promise<void> {
    await this.psql.connect();
    // Execute BasicRoomsDDL
    await this.psql.query(
      `
DO $$
BEGIN
    IF (SELECT to_regclass('hoffmation_schema."BasicRooms"') IS NULL) Then
create table "BasicRooms"
(
    name  varchar(30) not null
        constraint table_name_pk
            primary key,
    etage integer
);

alter table "BasicRooms"
    owner to postgres;

create unique index table_name_name_uindex
    on "BasicRooms" (name);

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
    alldeviceskey varchar(30),
    customname    varchar(60),
    devtype       integer
);

alter table hoffmation_schema."DeviceInfo"
    owner to postgres;

    END IF;

    IF (SELECT to_regclass('hoffmation_schema."CurrentIllumination"') IS NULL) Then
create table "CurrentIllumination"
(
    "roomName"            varchar(30)
        constraint currentillumination_basicrooms_name_fk
            references hoffmation_schema."BasicRooms",
    "deviceID"            integer not null,
    "currentIllumination" double precision,
    date                  timestamp with time zone,
    "lightIsOn"           boolean
);

alter table "CurrentIllumination"
    owner to postgres;
    END IF;
    IF (SELECT to_regclass('hoffmation_schema."EnergyCalculation"') IS NULL) Then
create table "EnergyCalculation"
(
    "startDate"           timestamp not null
        constraint energycalculation_pk
            primary key,
    "endDate"             timestamp,
    "selfConsumedKwH" double precision,
    "injectedKwH"     double precision,
    "drawnKwH"        double precision
);

alter table "EnergyCalculation"
    owner to postgres;

create unique index energycalculation_startdate_uindex
    on "EnergyCalculation" ("startDate");

    END IF;
    IF (SELECT to_regclass('hoffmation_schema."HeatGroupCollection"') IS NULL) Then
create table "HeatGroupCollection"
(
    date             timestamp,
    humidity         integer,
    "istTemperatur"  double precision,
    level            integer,
    name             varchar(60) not null
        constraint heatgroupcollection_pk
            primary key,
    "sollTemperatur" double precision
);

alter table "HeatGroupCollection"
    owner to postgres;

create unique index heatgroupcollection_name_uindex
    on "HeatGroupCollection" (name);

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

  alter table hoffmation_schema."AcDeviceData"
    owner to postgres;
END IF;


IF (SELECT to_regclass('hoffmation_schema."LampDeviceData"') IS NULL) Then    
  create table hoffmation_schema."LampDeviceData"
  (
      "deviceID" varchar(60) not null,
      "on"       boolean,
      date       timestamp   not null,
      constraint lampdevicedata_pk
          primary key ("deviceID", date)
  );

  alter table hoffmation_schema."LampDeviceData"
    owner to postgres;
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

  alter table hoffmation_schema."MotionSensorDeviceData"
    owner to postgres;
END IF;
    
    IF (SELECT to_regclass('hoffmation_schema."TemperaturData"') IS NULL) Then
create table "TemperaturData"
(
    date             timestamp,
    humidity         integer,
    "istTemperatur"  double precision,
    level            integer,
    name             text,
    "sollTemperatur" double precision,
    constraint temperaturdata_pk
        unique (date, name)
);

alter table "TemperaturData"
    owner to postgres;
    END IF;
END
$$;`,
    );
    this.initialized = true;
    ServerLogService.writeLog(LogLevel.Info, `Postgres DB initialized`);
  }

  public persistAC(device: iAcDevice): void {
    this.query(`
insert into hoffmation_schema."AcDeviceData" ("deviceID", "on", "date", "roomTemperature")
values ('${device.id}', ${device.on}, '${new Date().toISOString()}', ${device.temperature});
    `);
  }

  public persistLamp(device: iLamp): void {
    this.query(`
insert into hoffmation_schema."LampDeviceData" ("deviceID", "on", "date")
values ('${device.id}', ${device.lightOn}, '${new Date().toISOString()}');
    `);
  }

  public persistMotionSensor(device: iMotionSensor): void {
    this.query(`
insert into hoffmation_schema."MotionSensorDeviceData" ("deviceID", "movementDetected", "date")
values ('${device.id}', ${device.movementDetected}, '${new Date().toISOString()}');
    `);
  }

  persistCurrentIllumination(data: CurrentIlluminationDataPoint): void {
    this.query(`
insert into hoffmation_schema."CurrentIllumination" ("roomName", "deviceID", "currentIllumination", "date", "lightIsOn")
values ('${data.roomName}','${data.deviceID}',${data.currentIllumination},'${data.date.toISOString()}',${
      data.lightIsOn
    });
    `);
  }

  persistShutterCalibration(_data: ShutterCalibration): void {
    ServerLogService.writeLog(LogLevel.Warn, `Postgres doesn't support Shutter Calibration yet.`);
  }

  async readTemperaturDataPoint(heater: iHeater, limit: number): Promise<TemperaturDataPoint[]> {
    const dbResult: TemperaturDataPoint[] | null = await this.query<TemperaturDataPoint>(`
SELECT * FROM hoffmation_schema."TemperaturData" 
WHERE name = '${heater.info.customName}'
ORDER BY "date" DESC
LIMIT ${limit}
    `);
    if (dbResult !== null && dbResult.length > 0) {
      return dbResult;
    }
    return [];
  }

  persistEnergyManager(calc: EnergyCalculation): void {
    this.query(`
insert into hoffmation_schema."EnergyCalculation" ("startDate", "endDate", "selfConsumedKwH", "injectedKwH",
                                                   "drawnKwH")
values ('${new Date(calc.startMs).toISOString()}','${new Date(calc.endMs).toISOString()}',
        ${calc.selfConsumedKwH}, ${calc.injectedKwH}, ${calc.drawnKwH});
    `);
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
      ServerLogService.writeLog(LogLevel.Warn, `Db is not yet initialized`);
      return false;
    }
    if (!this.psql) {
      ServerLogService.writeLog(LogLevel.Error, `PSQL client missing`);
      return false;
    }
    return true;
  }
}
