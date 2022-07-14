import { Collection, Db, FindOptions, MongoClient } from 'mongodb';
import { ServerLogService } from '../log-service';
import { iMongoSettings, iPersistenceSettings } from '../../config';
import {
  BasicRoomInfo,
  CountToday,
  CurrentIlluminationDataPoint,
  DailyMovementCount,
  EnergyCalculation,
  LogLevel,
  RoomBase,
  RoomDetailInfo,
  ShutterCalibration,
  TemperaturDataPoint,
} from '../../../models';
import { iPersist } from './iPersist';
import { iHeater, IoBrokerBaseDevice } from '../../devices';

export class MongoPersistance implements iPersist {
  initialized: boolean = false;
  private BasicRoomCollection?: Collection<BasicRoomInfo>;
  private CountTodayCollection?: Collection<CountToday>;
  private CurrentIlluminationCollection?: Collection<CurrentIlluminationDataPoint>;
  private DailyMovementCountTodayCollection?: Collection<DailyMovementCount>;
  private HeatGroupCollection?: Collection<TemperaturDataPoint>;
  private RoomDetailsCollection?: Collection<RoomDetailInfo>;
  private ShutterCalibrationCollection?: Collection<ShutterCalibration>;
  private TemperatureHistoryCollection?: Collection<TemperaturDataPoint>;
  private Mongo?: Db;
  private MongoClient: MongoClient;
  private mongoConf: iMongoSettings;

  public constructor(config: iPersistenceSettings) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.mongoConf = config.mongo!;
    this.MongoClient = new MongoClient(this.mongoConf.mongoConnection);
  }

  private static handleReject(reason: unknown, func: string) {
    ServerLogService.writeLog(LogLevel.Warn, `Error persisting data for "${func}"`);
    ServerLogService.writeLog(LogLevel.Debug, `Persisting Error reason: "${reason}"`);
  }

  addTemperaturDataPoint(heater: iHeater): void {
    if (!this.isMongoAllowedAndReady()) {
      return;
    }

    const dataPoint: TemperaturDataPoint = new TemperaturDataPoint(
      heater.info.customName,
      heater.iTemperatur,
      heater.desiredTemperatur,
      heater.iLevel,
      heater.humidity,
      new Date(),
    );
    ServerLogService.writeLog(LogLevel.Trace, `Persisting Temperatur Data for ${heater.info.customName}`);
    this.TemperatureHistoryCollection?.insertOne(dataPoint).catch((r) => {
      MongoPersistance.handleReject(r, 'TemperatureHistoryCollection.insertOne');
    });

    // Needs to be duplicated as the object "dataPoint" is an document now
    const heatGroupDataPoint: TemperaturDataPoint = new TemperaturDataPoint(
      heater.info.customName,
      heater.iTemperatur,
      heater.desiredTemperatur,
      heater.iLevel,
      heater.humidity,
      new Date(),
    );
    this.HeatGroupCollection?.updateOne({ name: dataPoint.name }, { $set: heatGroupDataPoint }, { upsert: true }).catch(
      (r) => {
        MongoPersistance.handleReject(r, 'HeatGroupCollection.updateOne');
      },
    );
  }

  addRoom(room: RoomBase): void {
    if (!this.isMongoAllowedAndReady()) {
      return;
    }

    ServerLogService.writeLog(LogLevel.Trace, `Persisting Room for ${room.roomName}`);
    this.BasicRoomCollection?.updateOne(
      { roomName: room.roomName },
      { $set: new BasicRoomInfo(room.roomName, room.settings.etage) },
      { upsert: true },
    ).catch((r) => {
      MongoPersistance.handleReject(r, 'BasicRoomCollection.updateOne');
    });
    const detailed = new RoomDetailInfo(room.roomName, room.settings.etage);
    if (room.HeatGroup) {
      for (const h of room.HeatGroup?.getHeater()) {
        detailed.heaters.push(h.info.customName);
      }
    }
    if (this.RoomDetailsCollection) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.RoomDetailsCollection.updateOne({ roomName: room.roomName }, { $set: detailed }, { upsert: true }).catch(
        (r: unknown) => {
          MongoPersistance.handleReject(r, 'RoomDetailsCollection.updateOne');
        },
      );
    }
  }

  async getCount(device: IoBrokerBaseDevice): Promise<CountToday> {
    if (!this.isMongoAllowedAndReady()) {
      return new CountToday(device.info.fullID, 0);
    }

    const options: FindOptions<CountToday> = {
      limit: 1,
    };
    const databaseValue: CountToday[] = (await this.CountTodayCollection?.find(
      { deviceID: device.info.fullID },
      options,
    ).toArray()) as CountToday[];
    if (databaseValue.length !== 0) {
      return databaseValue[0];
    }

    ServerLogService.writeLog(LogLevel.Debug, `Es gibt noch keinen persistierten Counter für ${device.info.fullName}`);
    return new CountToday(device.info.fullID, 0);
  }

  async getShutterCalibration(device: IoBrokerBaseDevice): Promise<ShutterCalibration> {
    if (!this.isMongoAllowedAndReady()) {
      return new ShutterCalibration(device.info.fullID, 0, 0, 0, 0);
    }

    const options: FindOptions<ShutterCalibration> = {
      limit: 1,
    };
    const databaseValue: ShutterCalibration[] = (await this.ShutterCalibrationCollection?.find(
      { deviceID: device.info.fullID },
      options,
    ).toArray()) as ShutterCalibration[];
    if (databaseValue.length !== 0) {
      return databaseValue[0];
    }
    ServerLogService.writeLog(LogLevel.Debug, `There is no persisted calibration data for ${device.info.fullName}`);
    return new ShutterCalibration(device.info.fullID, 0, 0, 0, 0);
  }

  async initialize(): Promise<void> {
    await this.MongoClient.connect();
    this.Mongo = this.MongoClient.db(this.mongoConf.mongoDbName);
    this.TemperatureHistoryCollection = this.Mongo.collection<TemperaturDataPoint>('TemperaturData');
    this.HeatGroupCollection = this.Mongo.collection<TemperaturDataPoint>('HeatGroupCollection');
    this.BasicRoomCollection = this.Mongo.collection<BasicRoomInfo>('BasicRooms');
    this.RoomDetailsCollection = this.Mongo.collection<RoomDetailInfo>('RoomDetailsCollection');
    this.CountTodayCollection = this.Mongo.collection<CountToday>('PresenceToday');
    this.CurrentIlluminationCollection = this.Mongo.collection<CurrentIlluminationDataPoint>('CurrentIllumination');
    this.DailyMovementCountTodayCollection = this.Mongo.collection<DailyMovementCount>('DailyMovementCount');
    this.ShutterCalibrationCollection = this.Mongo.collection<ShutterCalibration>('ShutterCalibration');

    this.initialized = true;
  }

  persistTodayCount(device: IoBrokerBaseDevice, count: number, oldCount: number): void {
    if (!this.isMongoAllowedAndReady()) {
      return;
    }

    const result = this.CountTodayCollection?.updateOne(
      { deviceID: device.info.fullID },
      { $set: new CountToday(device.info.fullID, count) },
      { upsert: true },
    );
    if (count === 0) {
      const date = new Date();
      date.setHours(-24, 0, 0, 0);
      const result2 = this.DailyMovementCountTodayCollection?.updateOne(
        { deviceID: device.info.fullID, date: date },
        { $set: new DailyMovementCount(device.info.fullID, oldCount, device.info.room, date) },
        { upsert: true },
      ).catch((r) => {
        MongoPersistance.handleReject(r, 'DailyMovementCountTodayCollection.updateOne');
      });
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

  persistShutterCalibration(data: ShutterCalibration): void {
    if (!this.isMongoAllowedAndReady()) {
      return;
    }

    const result = this.CountTodayCollection?.updateOne({ deviceID: data.deviceID }, { $set: data }, { upsert: true });
    ServerLogService.writeLog(
      LogLevel.Trace,
      `Persisting ShutterCalibration for ${data.deviceID} resolved with "${result}"`,
    );
  }

  persistCurrentIllumination(data: CurrentIlluminationDataPoint): void {
    if (!this.isMongoAllowedAndReady()) {
      return;
    }

    const result = this.CurrentIlluminationCollection?.updateOne(
      { deviceID: data.deviceID, date: data.date },
      { $set: data },
      { upsert: true },
    ).catch((r) => {
      MongoPersistance.handleReject(r, 'persistCurrentIllumination');
    });
    ServerLogService.writeLog(
      LogLevel.Trace,
      `Persisting Illumination Data for ${data.deviceID} to ${data.currentIllumination} resolved with "${result}"`,
    );
  }

  async readTemperaturDataPoint(heater: iHeater, limit: number = -1): Promise<TemperaturDataPoint[]> {
    return new Promise<TemperaturDataPoint[]>(async (resolve) => {
      if (!this.isMongoAllowedAndReady()) {
        resolve([]);
        return;
      }

      const options: FindOptions<TemperaturDataPoint> = {
        limit: limit > 0 ? limit : undefined,
        sort: { date: -1 },
      };
      const data = (await this.TemperatureHistoryCollection?.find(
        { name: heater.info.customName },
        options,
      ).toArray()) as TemperaturDataPoint[];
      resolve(data);
    });
  }

  persistEnergyManager(_energyData: EnergyCalculation): void {
    ServerLogService.writeLog(LogLevel.Warn, `MongoDb doesn't support EnergyCalculation yet.`);
  }

  private isMongoAllowedAndReady(): boolean {
    if (!this.initialized) {
      ServerLogService.writeLog(LogLevel.Warn, `Db is not yet initialized`);
      return false;
    }
    if (!this.MongoClient) {
      ServerLogService.writeLog(LogLevel.Error, `Mongo client missing`);
      return false;
    }
    if (!this.Mongo) {
      ServerLogService.writeLog(LogLevel.Error, `MongoDb connection is missing`);
      return false;
    }
    return true;
  }
}
