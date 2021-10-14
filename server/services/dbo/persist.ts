import { Mongo } from 'meteor/mongo';
import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models/logLevel';
import { TemperaturDataPoint } from '../../../models/persistence/temperaturDataPoint';
import { CountToday } from '../../../models/persistence/todaysCount';
import { HmIpHeizgruppe } from '../../devices/hmIPDevices/hmIpHeizgruppe';
import { HmIPDevice } from '../../devices/hmIPDevices/hmIpDevice';
import { RoomBase } from '../../../models/rooms/RoomBase';
import { BasicRoomInfo } from '../../../models/persistence/BasicRoomInfo';
import { RoomDetailInfo } from '../../../models/persistence/RoomDetailInfo';
import { DailyMovementCount } from '../../../models/persistence/DailyMovementCount';
import { iTemperaturDataPoint } from '../../../models/iTemperaturDataPoint';
import { CurrentIlluminationDataPoint } from '../../../models/persistence/CurrentIlluminationDataPoint';
import { ioBrokerBaseDevice } from '../../devices/iIoBrokerDevice';

export const TemperatureHistoryCollection = new Mongo.Collection<TemperaturDataPoint>('TemperaturData');
export const HeatGroupCollection = new Mongo.Collection<TemperaturDataPoint>('HeatGroupCollection');
export const BasicRoomCollection = new Mongo.Collection<BasicRoomInfo>('BasicRooms');
export const RoomDetailsCollection = new Mongo.Collection<RoomDetailInfo>('RoomDetailsCollection');
export const CountTodayCollection = new Mongo.Collection<CountToday>('PresenceToday');
export const CurrentIlluminationCollection = new Mongo.Collection<CurrentIlluminationDataPoint>('CurrentIllumination');
export const DailyMovementCountTodayCollection = new Mongo.Collection<DailyMovementCount>('DailyMovementCount');
export class Persist {
  public static MeteorBound: (callback: any) => void;
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
      TemperatureHistoryCollection.insert(dataPoint);
    });

    this.MeteorBound(() => {
      HeatGroupCollection.update({ name: dataPoint.name }, dataPoint, { upsert: true });
    });
  }

  public static addRoom(room: RoomBase): void {
    ServerLogService.writeLog(LogLevel.Trace, `Persisting Room for ${room.roomName}`);
    this.MeteorBound(() => {
      BasicRoomCollection.update({ roomName: room.roomName }, new BasicRoomInfo(room.roomName, room.Settings.etage), {
        upsert: true,
      });
    });
    const detailed = new RoomDetailInfo(room.roomName, room.Settings.etage);
    for (const h of room.HeatGroup.heaters) {
      detailed.heaters.push(h.info.customName);
    }
    this.MeteorBound(() => {
      RoomDetailsCollection.update({ roomName: room.roomName }, detailed, { upsert: true });
    });
  }

  public static async getCount(device: ioBrokerBaseDevice): Promise<CountToday> {
    const result = new Promise<CountToday>((resolve) => {
      this.MeteorBound(() => {
        const options = {
          limit: 1,
        };
        const databaseValue: CountToday[] = CountTodayCollection.find(
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

  public static persistTodayCount(device: ioBrokerBaseDevice, count: number, oldCount: number): void {
    this.MeteorBound(() => {
      const result = CountTodayCollection.update(
        { deviceID: device.info.fullID },
        new CountToday(device.info.fullID, count),
        { upsert: true },
      );
      if (count === 0) {
        const date = new Date();
        date.setHours(-24, 0, 0, 0);
        const result2 = DailyMovementCountTodayCollection.update(
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
      const result = CurrentIlluminationCollection.update(
        { deviceID: data.deviceID, date: data.date },
        data,
        { upsert: true },
      );
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
        resolve(TemperatureHistoryCollection.find({ name: hzGrp.info.customName }, options).fetch());
      });
    });

    return result;
  }
}
