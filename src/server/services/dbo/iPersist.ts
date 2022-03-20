import { HmIpHeizgruppe } from '../../devices/hmIPDevices/hmIpHeizgruppe';
import { RoomBase } from '../../../models/rooms/RoomBase';
import { IoBrokerBaseDevice } from '../../devices/IoBrokerBaseDevice';
import { CountToday } from '../../../models/persistence/todaysCount';
import { ShutterCalibration } from '../../../models/persistence/ShutterCalibration';
import { CurrentIlluminationDataPoint } from '../../../models/persistence/CurrentIlluminationDataPoint';
import { TemperaturDataPoint } from '../../../models/persistence/temperaturDataPoint';

export interface iPersist {
  initialized: boolean;

  addTemperaturDataPoint(hzGrp: HmIpHeizgruppe): void;

  addRoom(room: RoomBase): void;

  getCount(device: IoBrokerBaseDevice): Promise<CountToday>;

  getShutterCalibration(device: IoBrokerBaseDevice): Promise<ShutterCalibration>;

  initialize(): Promise<void>;

  persistTodayCount(device: IoBrokerBaseDevice, count: number, oldCount: number): void;

  persistShutterCalibration(data: ShutterCalibration): void;

  persistCurrentIllumination(data: CurrentIlluminationDataPoint): void;

  readTemperaturDataPoint(hzGrp: HmIpHeizgruppe, limit: number): Promise<TemperaturDataPoint[]>;
}
