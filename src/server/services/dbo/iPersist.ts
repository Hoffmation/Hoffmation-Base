import {
  ButtonPressType,
  iAcDevice,
  iActuator,
  iBaseDevice,
  iBatteryDevice,
  iButtonSwitch,
  iHandleSensor,
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
  /**
   * Whether persistence is properly initialized
   */
  initialized: boolean;

  /**
   * Adds a room to the database
   * @param {RoomBase} room - The room to add
   */
  addRoom(room: RoomBase): void;

  /**
   * Adds a device to the database
   * @param {iBaseDevice} device - The device to add
   */
  addDevice(device: iBaseDevice): void;

  /**
   * Gets the count of the motion sensor today
   * @param {iMotionSensor} device - The device to get the count for
   * @returns {Promise<CountToday>} - The count of the motion sensor today
   */
  motionSensorTodayCount(device: iMotionSensor): Promise<CountToday>;

  /**
   * Gets the last desired position of the shutter
   * @param {iShutter} device - The device to get the last desired position for
   * @returns {Promise<DesiredShutterPosition>} - The last desired position of the shutter
   */
  getLastDesiredPosition(device: iShutter): Promise<DesiredShutterPosition>;

  /**
   * Gets the shutter calibration
   * @param {iShutter} device - The device to get the shutter calibration for
   * @returns {Promise<ShutterCalibration>} - The shutter calibration
   */
  getShutterCalibration(device: iShutter): Promise<ShutterCalibration>;

  /**
   * Initializes the database-connection and prepares the database
   * @returns {Promise<void>} - The promise that resolves when the database is initialized
   */
  initialize(): Promise<void>;

  /**
   * Persists the shutter calibration
   * @param {ShutterCalibration} data - The shutter calibration data to persist
   */
  persistShutterCalibration(data: ShutterCalibration): void;

  /**
   * Persists data for an illumination sensor
   * @param {iIlluminationSensor} device - The device to persist data for
   */
  persistIlluminationSensor(device: iIlluminationSensor): void;

  /**
   * Persists data for an energy manager
   * @param {EnergyCalculation} energyData - The energy data to persist
   */
  persistEnergyManager(energyData: EnergyCalculation): void;

  /**
   * Persists data of an AC device
   * @param {iAcDevice} device - The device to persist data for
   */
  persistAC(device: iAcDevice): void;

  /**
   * Persists data of an actuator
   * @param {iActuator} device - The device to persist data for
   */
  persistActuator(device: iActuator): void;

  /**
   * Persists data of a heater
   * @param {iHeater} device - The device to persist data for
   */
  persistHeater(device: iHeater): void;

  /**
   * Persists data of a motion sensor
   * @param {iMotionSensor} device - The device to persist data for
   */
  persistMotionSensor(device: iMotionSensor): void;

  /**
   * Persists data of a button switch action
   * @param {iButtonSwitch} device - The device to persist data for
   * @param {ButtonPressType} pressType - The type of button press
   * @param {string} buttonName - The name of the button
   */
  persistSwitchInput(device: iButtonSwitch, pressType: ButtonPressType, buttonName: string): void;

  /**
   * Persists data of a shutter
   * @param {iShutter} device - The device to persist data for
   */
  persistShutter(device: iShutter): void;

  /**
   * Persists data of a temperature sensor
   * @param {iTemperatureSensor} device - The device to persist data for
   */
  persistTemperatureSensor(device: iTemperatureSensor): void;

  /**
   * Persists data of a humidity sensor
   * @param {iHumiditySensor} device - The device to persist data for
   */
  persistHumiditySensor(device: iHumiditySensor): void;

  /**
   * Persists data of a handle sensor
   * @param {iHandleSensor} device - The device to persist data for
   */
  persistHandleSensor(device: iHandleSensor): void;

  /**
   * Persists data of a battery device
   * @param {iBatteryDevice} device - The device to persist data for
   */
  persistBatteryDevice(device: iBatteryDevice): void;

  /**
   * Persists data of a Zigbee device
   * @param {ZigbeeDevice} device - The device to persist data for
   */
  persistZigbeeDevice(device: ZigbeeDevice): void;

  /**
   * Persists settings for the given id
   * @param {string} id - The id to persist settings for
   * @param {string} settings - The settings to persist (as JSON string)
   * @param {string} customname - The custom name of the device/object
   */
  persistSettings(id: string, settings: string, customname: string): void;

  /**
   * Loads settings for the given id
   * @param {string} id - The id of the object/device to load settings for
   * @returns {Promise<string | undefined>} - The settings as JSON string or undefined if not found
   */
  loadSettings(id: string): Promise<string | undefined>;
}
