import { DailyMovementCount } from '../../../models/persistence/DailyMovementCount';
import { RoomBase } from '../../../models/rooms/RoomBase';
import { Db, MongoClient, Collection, FindOptions } from 'mongodb';
import { IoBrokerBaseDevice } from '../../devices/IoBrokerBaseDevice';
import { RoomDetailInfo } from '../../../models/persistence/RoomDetailInfo';
import { CountToday } from '../../../models/persistence/todaysCount';
import { TemperaturDataPoint } from '../../../models/persistence/temperaturDataPoint';
import { ServerLogService } from '../log-service';
import { HmIpHeizgruppe } from '../../devices/hmIPDevices/hmIpHeizgruppe';
import { CurrentIlluminationDataPoint } from '../../../models/persistence/CurrentIlluminationDataPoint';
import { BasicRoomInfo } from '../../../models/persistence/BasicRoomInfo';
import { LogLevel } from '../../../models/logLevel';
import { iPersistenceSettings } from '../../config/iConfig';

export class Persist {
  private static TemperatureHistoryCollection: Collection<TemperaturDataPoint>;
  private static HeatGroupCollection: Collection<TemperaturDataPoint>;
  private static BasicRoomCollection: Collection<BasicRoomInfo>;
  private static RoomDetailsCollection: Collection<RoomDetailInfo>;
  private static CountTodayCollection: Collection<CountToday>;
  private static CurrentIlluminationCollection: Collection<CurrentIlluminationDataPoint>;
  private static DailyMovementCountTodayCollection: Collection<DailyMovementCount>;
  private static Mongo: Db;
  private static MongoClient: MongoClient;

  public static addTemperaturDataPoint(hzGrp: HmIpHeizgruppe): void {
    const dataPoint: TemperaturDataPoint = new TemperaturDataPoint(
      hzGrp.info.customName,
      hzGrp.iTemperatur,
      hzGrp.desiredTemperatur,
      hzGrp.iLevel,
      hzGrp.humidity,
      new Date(),
    );
    ServerLogService.writeLog(LogLevel.Trace, `Persisting Temperatur Data for ${hzGrp.info.customName}`);
    this.TemperatureHistoryCollection.insertOne(dataPoint);

    this.HeatGroupCollection.updateOne({ name: dataPoint.name }, { $set: dataPoint }, { upsert: true });
  }

  public static addRoom(room: RoomBase): void {
    ServerLogService.writeLog(LogLevel.Trace, `Persisting Room for ${room.roomName}`);
    this.BasicRoomCollection.updateOne(
      { roomName: room.roomName },
      { $set: new BasicRoomInfo(room.roomName, room.Settings.etage) },
      { upsert: true },
    );
    const detailed = new RoomDetailInfo(room.roomName, room.Settings.etage);
    for (const h of room.HeatGroup.heaters) {
      detailed.heaters.push(h.info.customName);
    }
    this.RoomDetailsCollection.updateOne({ roomName: room.roomName }, { $set: detailed }, { upsert: true });
  }

  public static async getCount(device: IoBrokerBaseDevice): Promise<CountToday> {
    const result = new Promise<CountToday>(async (resolve) => {
      const options: FindOptions<CountToday> = {
        limit: 1,
      };
      const databaseValue: CountToday[] = (await this.CountTodayCollection.find(
        { deviceID: device.info.fullID },
        options,
      ).toArray()) as CountToday[];
      if (databaseValue.length === 0) {
        ServerLogService.writeLog(
          LogLevel.Debug,
          `Es gibt noch keinen persistierten Counter für ${device.info.fullName}`,
        );
        resolve(new CountToday(device.info.fullID, 0));
      } else {
        resolve(databaseValue[0]);
      }
    });

    return result;
  }

  public static async initialize(config: iPersistenceSettings): Promise<void> {
    this.MongoClient = new MongoClient(config.mongoConnection);
    await this.MongoClient.connect();
    this.Mongo = this.MongoClient.db(config.mongoDbName);
    this.TemperatureHistoryCollection = this.Mongo.collection<TemperaturDataPoint>('TemperaturData');
    this.HeatGroupCollection = this.Mongo.collection<TemperaturDataPoint>('HeatGroupCollection');
    this.BasicRoomCollection = this.Mongo.collection<BasicRoomInfo>('BasicRooms');
    this.RoomDetailsCollection = this.Mongo.collection<RoomDetailInfo>('RoomDetailsCollection');
    this.CountTodayCollection = this.Mongo.collection<CountToday>('PresenceToday');
    this.CurrentIlluminationCollection = this.Mongo.collection<CurrentIlluminationDataPoint>('CurrentIllumination');
    this.DailyMovementCountTodayCollection = this.Mongo.collection<DailyMovementCount>('DailyMovementCount');
  }

  public static persistTodayCount(device: IoBrokerBaseDevice, count: number, oldCount: number): void {
    const result = this.CountTodayCollection.updateOne(
      { deviceID: device.info.fullID },
      { $set: new CountToday(device.info.fullID, count) },
      { upsert: true },
    );
    if (count === 0) {
      const date = new Date();
      date.setHours(-24, 0, 0, 0);
      const result2 = this.DailyMovementCountTodayCollection.updateOne(
        { deviceID: device.info.fullID, date: date },
        { $set: new DailyMovementCount(device.info.fullID, oldCount, device.info.room, date) },
        { upsert: true },
      );
      ServerLogService.writeLog(
        LogLevel.Trace,
        `Persisting Daily Movement Count for ${device.info.customName} to ${oldCount} resolved with "${result2}"`,
      );
    }
    ServerLogService.writeLog(
      LogLevel.Trace,
      `Persisting PresenceToday Data for ${device.info.customName} to ${count} resolved with "${result}"`,
    );
  }

  public static persistCurrentIllumination(data: CurrentIlluminationDataPoint): void {
    const result = this.CurrentIlluminationCollection.updateOne(
      { deviceID: data.deviceID, date: data.date },
      { $set: data },
      { upsert: true },
    );
    ServerLogService.writeLog(
      LogLevel.Trace,
      `Persisting Illumination Data for ${data.deviceID} to ${data.currentIllumination} resolved with "${result}"`,
    );
  }

  public static async readTemperaturDataPoint(
    hzGrp: HmIpHeizgruppe,
    limit: number = -1,
  ): Promise<TemperaturDataPoint[]> {
    const result = new Promise<TemperaturDataPoint[]>(async (resolve) => {
      const options: FindOptions<TemperaturDataPoint> = {
        limit: limit > 0 ? limit : undefined,
        sort: { date: -1 },
      };
      const data = (await this.TemperatureHistoryCollection.find(
        { name: hzGrp.info.customName },
        options,
      ).toArray()) as TemperaturDataPoint[];
      resolve(data);
    });

    return result;
  }
}
