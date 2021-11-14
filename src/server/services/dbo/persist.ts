import { DailyMovementCount } from '../../../models/persistence/DailyMovementCount';
import { RoomBase } from '../../../models/rooms/RoomBase';
import { IoBrokerBaseDevice } from '../../devices/IoBrokerBaseDevice';
import { RoomDetailInfo } from '../../../models/persistence/RoomDetailInfo';
import { CountToday } from '../../../models/persistence/todaysCount';
import { TemperaturDataPoint } from '../../../models/persistence/temperaturDataPoint';
import { ServerLogService } from '../log-service';
import { HmIpHeizgruppe } from '../../devices/hmIPDevices/hmIpHeizgruppe';
import { CurrentIlluminationDataPoint } from '../../../models/persistence/CurrentIlluminationDataPoint';
import { BasicRoomInfo } from '../../../models/persistence/BasicRoomInfo';
import { iTemperaturDataPoint } from '../../../models/iTemperaturDataPoint';
import { LogLevel } from '../../../models/logLevel';

export class Persist {
  private static TemperatureHistoryCollection: Mongo.Collection<TemperaturDataPoint, TemperaturDataPoint>;
  private static HeatGroupCollection: Mongo.Collection<TemperaturDataPoint, TemperaturDataPoint>;
  private static BasicRoomCollection: Mongo.Collection<BasicRoomInfo, BasicRoomInfo>;
  private static RoomDetailsCollection: Mongo.Collection<RoomDetailInfo, RoomDetailInfo>;
  private static CountTodayCollection: Mongo.Collection<CountToday, CountToday>;
  private static CurrentIlluminationCollection: Mongo.Collection<
    CurrentIlluminationDataPoint,
    CurrentIlluminationDataPoint
  >;
  private static DailyMovementCountTodayCollection: Mongo.Collection<DailyMovementCount, DailyMovementCount>;
  public static MeteorBound: (callback: any) => void;
  private static Mongo: { Collection: Mongo.CollectionStatic };

  public static addTemperaturDataPoint(hzGrp: HmIpHeizgruppe): void {
    const dataPoint: iTemperaturDataPoint = new TemperaturDataPoint(
      hzGrp.info.customName,
      hzGrp.iTemperatur,
      hzGrp.desiredTemperatur,
      hzGrp.iLevel,
      hzGrp.humidity,
      new Date(),
    );
    ServerLogService.writeLog(LogLevel.Trace, `Persisting Temperatur Data for ${hzGrp.info.customName}`);
    this.MeteorBound(() => {
      this.TemperatureHistoryCollection.insert(dataPoint);
    });

    this.MeteorBound(() => {
      this.HeatGroupCollection.update({ name: dataPoint.name }, dataPoint, { upsert: true });
    });
  }

  public static addRoom(room: RoomBase): void {
    ServerLogService.writeLog(LogLevel.Trace, `Persisting Room for ${room.roomName}`);
    this.MeteorBound(() => {
      this.BasicRoomCollection.update(
        { roomName: room.roomName },
        new BasicRoomInfo(room.roomName, room.Settings.etage),
        {
          upsert: true,
        },
      );
    });
    const detailed = new RoomDetailInfo(room.roomName, room.Settings.etage);
    for (const h of room.HeatGroup.heaters) {
      detailed.heaters.push(h.info.customName);
    }
    this.MeteorBound(() => {
      this.RoomDetailsCollection.update({ roomName: room.roomName }, detailed, { upsert: true });
    });
  }

  public static async getCount(device: IoBrokerBaseDevice): Promise<CountToday> {
    const result = new Promise<CountToday>((resolve) => {
      this.MeteorBound(() => {
        const options = {
          limit: 1,
        };
        const databaseValue: CountToday[] = this.CountTodayCollection.find(
          { deviceID: device.info.fullID },
          options,
        ).fetch();
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
    });

    return result;
  }

  public static initialize(meteorBound: (callback: any) => void, mongo: { Collection: Mongo.CollectionStatic }): void {
    this.MeteorBound = meteorBound;
    this.Mongo = mongo;
    this.TemperatureHistoryCollection = new this.Mongo.Collection<TemperaturDataPoint>('TemperaturData');
    this.HeatGroupCollection = new this.Mongo.Collection<TemperaturDataPoint>('HeatGroupCollection');
    this.BasicRoomCollection = new this.Mongo.Collection<BasicRoomInfo>('BasicRooms');
    this.RoomDetailsCollection = new this.Mongo.Collection<RoomDetailInfo>('RoomDetailsCollection');
    this.CountTodayCollection = new this.Mongo.Collection<CountToday>('PresenceToday');
    this.CurrentIlluminationCollection = new this.Mongo.Collection<CurrentIlluminationDataPoint>('CurrentIllumination');
    this.DailyMovementCountTodayCollection = new this.Mongo.Collection<DailyMovementCount>('DailyMovementCount');
  }

  public static persistTodayCount(device: IoBrokerBaseDevice, count: number, oldCount: number): void {
    this.MeteorBound(() => {
      const result = this.CountTodayCollection.update(
        { deviceID: device.info.fullID },
        new CountToday(device.info.fullID, count),
        { upsert: true },
      );
      if (count === 0) {
        const date = new Date();
        date.setHours(-24, 0, 0, 0);
        const result2 = this.DailyMovementCountTodayCollection.update(
          { deviceID: device.info.fullID, date: date },
          new DailyMovementCount(device.info.fullID, oldCount, device.info.room, date),
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
    });
  }

  public static persistCurrentIllumination(data: CurrentIlluminationDataPoint): void {
    this.MeteorBound(() => {
      const result = this.CurrentIlluminationCollection.update({ deviceID: data.deviceID, date: data.date }, data, {
        upsert: true,
      });
      ServerLogService.writeLog(
        LogLevel.Trace,
        `Persisting Illumination Data for ${data.deviceID} to ${data.currentIllumination} resolved with "${result}"`,
      );
    });
  }

  public static async readTemperaturDataPoint(
    hzGrp: HmIpHeizgruppe,
    limit: number = -1,
  ): Promise<TemperaturDataPoint[]> {
    const result = new Promise<TemperaturDataPoint[]>((resolve) => {
      this.MeteorBound(() => {
        const options = {
          limit: limit > 0 ? limit : undefined,
          sort: { date: -1 },
        };
        resolve(this.TemperatureHistoryCollection.find({ name: hzGrp.info.customName }, options).fetch());
      });
    });

    return result;
  }
}
