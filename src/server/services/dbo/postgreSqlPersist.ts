import { iPersist } from './iPersist';
import { RoomBase } from '../../../models/rooms/RoomBase';
import { IoBrokerBaseDevice } from '../../devices/IoBrokerBaseDevice';
import { CountToday } from '../../../models/persistence/todaysCount';
import { TemperaturDataPoint } from '../../../models/persistence/temperaturDataPoint';
import { HmIpHeizgruppe } from '../../devices/hmIPDevices/hmIpHeizgruppe';
import { CurrentIlluminationDataPoint } from '../../../models/persistence/CurrentIlluminationDataPoint';
import { iPersistenceSettings } from '../../config/iConfig';
import { ShutterCalibration } from '../../../models/persistence/ShutterCalibration';
import { Pool } from 'pg';
import { ServerLogService } from '../log-service/log-service';
import { LogLevel } from '../../../models/logLevel';
import { EnergyCalculation } from '../../../models/persistence/EnergyCalculation';

export class PostgreSqlPersist implements iPersist {
  private psql: Pool;
  initialized: boolean = false;

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

  addTemperaturDataPoint(hzGrp: HmIpHeizgruppe): void {
    ServerLogService.writeLog(LogLevel.Trace, `Persisting Temperatur Data for ${hzGrp.info.customName}`);
    this.query(`
insert into hoffmation_schema."TemperaturData" ("date", humidity, "istTemperatur", level, name, "sollTemperatur")
values ('${new Date().toISOString()}',${hzGrp.humidity},${hzGrp.iTemperatur},${hzGrp.iLevel},'${
      hzGrp.info.customName
    }',${hzGrp.desiredTemperatur});`);

    this.query(`
insert into hoffmation_schema."HeatGroupCollection" ("date", humidity, "istTemperatur", level, name, "sollTemperatur")
values ('${new Date().toISOString()}',${hzGrp.humidity},${hzGrp.iTemperatur},${hzGrp.iLevel},'${
      hzGrp.info.customName
    }',${hzGrp.desiredTemperatur})
    ON CONFLICT (name)
    DO UPDATE SET
        "date" = '${new Date().toISOString()}',
        humidity = ${hzGrp.humidity},
        "istTemperatur" = ${hzGrp.iTemperatur},
        level = ${hzGrp.iLevel},
        "sollTemperatur" = ${hzGrp.desiredTemperatur}
;
    `);
  }

  async getCount(device: IoBrokerBaseDevice): Promise<CountToday> {
    const dbResult: CountToday[] | null = await this.query<CountToday>(
      `SELECT * FROM hoffmation_schema."DailyMovementCount" WHERE "deviceID" = '${device.info.fullID}'`,
    );
    if (dbResult !== null && dbResult.length > 0) {
      return dbResult[0];
    }

    ServerLogService.writeLog(LogLevel.Debug, `Es gibt noch keinen persistierten Counter für ${device.info.fullName}`);
    return new CountToday(device.info.fullID, 0);
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
    IF (SELECT to_regclass('hoffmation_schema."DailyMovementCount"') IS NULL) Then
-- auto-generated definition
create table "DailyMovementCount"
(
    counter    integer,
    date       timestamp   not null,
    "deviceID" varchar(60) not null,
    "roomName" varchar(30) not null
        constraint dailymovementcount_basicrooms_name_fk
            references hoffmation_schema."BasicRooms",
    constraint dailymovementcount_pk
        primary key (date, "deviceID")
);

alter table "DailyMovementCount"
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
    "drawnKwH"        double precision,
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
    IF (SELECT to_regclass('hoffmation_schema."PresenceToday"') IS NULL) Then
create table "PresenceToday"
(
    counter    integer,
    "deviceID" varchar(60) not null
        constraint presencetoday_pk
            primary key
);

alter table "PresenceToday"
    owner to postgres;

create unique index presencetoday_deviceid_uindex
    on "PresenceToday" ("deviceID");
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

  persistTodayCount(device: IoBrokerBaseDevice, count: number, oldCount: number): void {
    this.query(`
  insert into hoffmation_schema."PresenceToday" (counter, "deviceID")
  values (${count}, '${device.id}')
    ON CONFLICT ("deviceID")
    DO UPDATE SET
        counter = ${count}
  ;    
      `);
    if (count === 0) {
      const date = new Date();
      date.setHours(-24, 0, 0, 0);
      this.query(`
  insert into hoffmation_schema."DailyMovementCount" (counter, "date", "deviceID", "roomName")
  values (${oldCount}, '${date.toISOString()}', '${device.id}', '${device.info.room}')
    ON CONFLICT ("deviceID", "date")
    DO UPDATE SET
        counter = ${oldCount}
  ;    
      `);
    }
  }

  async readTemperaturDataPoint(hzGrp: HmIpHeizgruppe, limit: number): Promise<TemperaturDataPoint[]> {
    const dbResult: TemperaturDataPoint[] | null = await this.query<TemperaturDataPoint>(`
SELECT * FROM hoffmation_schema."TemperaturData" 
WHERE name = '${hzGrp.info.customName}'
ORDER BY "date" DESC
LIMIT ${limit}
    `);
    if (dbResult !== null && dbResult.length > 0) {
      return dbResult;
    }
    return [];
  }

  private async query<T>(query: string): Promise<T[] | null> {
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

  persistEnergyManager(calc: EnergyCalculation): void {
    this.query(`
insert into hoffmation_schema."EnergyCalculation" ("startDate", "endDate", "selfConsumedKwH", "injectedKwH",
                                                   "drawnKwH")
values ('${new Date(calc.startMs).toISOString()}','${new Date(calc.startMs).toISOString()}',
        ${calc.selfConsumedKwH}, ${calc.injectedKwH}, ${calc.drawnKwH});
    `);
  }
}
