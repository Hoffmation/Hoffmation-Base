import {
  ButtonPressType,
  iAcDevice,
  iActuator,
  iBaseDevice,
  iBatteryDevice,
  iButtonSwitch,
  iHeater,
  iHumiditySensor,
  iIlluminationSensor,
  iMotionSensor,
  iShutter,
  iTemperatureSensor,
  ZigbeeDevice,
} from '../../devices';
import { CountToday, DesiredShutterPosition, EnergyCalculation, RoomBase, ShutterCalibration } from '../../../models';

export interface iPersist {
  initialized: boolean;

  addRoom(room: RoomBase): void;

  addDevice(device: iBaseDevice): void;

  motionSensorTodayCount(device: iMotionSensor): Promise<CountToday>;

  getLastDesiredPosition(device: iShutter): Promise<DesiredShutterPosition>;

  getShutterCalibration(device: iShutter): Promise<ShutterCalibration>;

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

  persistHumiditySensor(device: iHumiditySensor): void;

  persistBatteryDevice(device: iBatteryDevice): void;

  persistZigbeeDevice(device: ZigbeeDevice): void;

  persistSettings(id: string, settings: string, customname: string): void;

  loadSettings(id: string): Promise<string | undefined>;
}
