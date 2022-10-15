import {
  ButtonPressType,
  iAcDevice,
  iActuator,
  iBaseDevice,
  iButtonSwitch,
  iHeater, iIlluminationSensor,
  iMotionSensor,
  IoBrokerBaseDevice,
  iShutter,
  iTemperatureSensor,
} from '../../devices';
import {
  CountToday,
  DesiredShutterPosition,
  EnergyCalculation,
  RoomBase,
  ShutterCalibration,
  TemperaturDataPoint,
} from '../../../models';

export interface iPersist {
  initialized: boolean;

  addTemperaturDataPoint(heater: iHeater): void;

  addRoom(room: RoomBase): void;

  addDevice(device: iBaseDevice): void;

  motionSensorTodayCount(device: iMotionSensor): Promise<CountToday>;

  getLastDesiredPosition(device: iShutter): Promise<DesiredShutterPosition>;

  getShutterCalibration(device: IoBrokerBaseDevice): Promise<ShutterCalibration>;

  initialize(): Promise<void>;

  persistShutterCalibration(data: ShutterCalibration): void;

  persistIlluminationSensor(device: iIlluminationSensor): void;

  persistEnergyManager(energyData: EnergyCalculation): void;

  persistAC(device: iAcDevice): void;

  persistActuator(device: iActuator): void;

  persistHeater(device: iHeater): void;

  persistMotionSensor(device: iMotionSensor): void;

  persistSwitchInput(device: iButtonSwitch, pressType: ButtonPressType, buttonName: string): void;

  persistShutter(device: iShutter): void;

  persistTemperatureSensor(device: iTemperatureSensor): void;

  readTemperaturDataPoint(hzGrp: iHeater, limit: number): Promise<TemperaturDataPoint[]>;
}
