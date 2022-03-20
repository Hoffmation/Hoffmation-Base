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
import * as fs from 'fs';
import { ServerLogService } from '../log-service/log-service';
import { LogLevel } from '../../../models/logLevel';

export class PostgreSqlPersist implements iPersist {
  private psql: Pool;
  initialized: boolean = false;

  public constructor(config: iPersistenceSettings) {
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
      reject();
    });
  }

  async initialize(): Promise<void> {
    await this.psql.connect();
    // Execute BasicRoomsDDL
    await this.psql.query(fs.readFileSync('./postgres/ddlBasicRooms.sql').toString());
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
}
