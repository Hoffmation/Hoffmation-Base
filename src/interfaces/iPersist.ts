import {
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
  iZigbeeDevice,
} from './baseDevices';
import { iRoomBase } from './iRoomBase';
import { ButtonPressType } from '../enums';
import { iDesiredShutterPosition } from './IDesiredShutterPosition';
import { iCountToday } from './iCountToday';
import { iEnergyCalculation } from './iEnergyCalculation';
import { iShutterCalibration } from './iShutterCalibration';

/**
 * The interface to interact with the persistence layer.
 * In the past there was a mongo-db implementation, but this is now replaced by currently only postgresSql.
 */
export interface iPersist {
  /**
   * Whether persistence is properly initialized
   */
  initialized: boolean;

  /**
   * Adds a room to the database
   * @param room - The room to add
   */
  addRoom(room: iRoomBase): void;

  /**
   * Adds a device to the database
   * @param device - The device to add
   */
  addDevice(device: iBaseDevice): void;

  /**
   * Gets the count of the motion sensor today
   * @param device - The device to get the count for
   * @returns - The count of the motion sensor today
   */
  motionSensorTodayCount(device: iMotionSensor): Promise<iCountToday>;

  /**
   * Gets the last desired position of the shutter
   * @param device - The device to get the last desired position for
   * @returns - The last desired position of the shutter
   */
  getLastDesiredPosition(device: iShutter): Promise<iDesiredShutterPosition>;

  /**
   * Gets the shutter calibration
   * @param device - The device to get the shutter calibration for
   * @returns - The shutter calibration
   */
  getShutterCalibration(device: iShutter): Promise<iShutterCalibration>;

  /**
   * Initializes the database-connection and prepares the database
   * @returns - The promise that resolves when the database is initialized
   */
  initialize(): Promise<void>;

  /**
   * Persists the shutter calibration
   * @param data - The shutter calibration data to persist
   */
  persistShutterCalibration(data: iShutterCalibration): void;

  /**
   * Persists data for an illumination sensor
   * @param device - The device to persist data for
   */
  persistIlluminationSensor(device: iIlluminationSensor): void;

  /**
   * Persists data for an energy manager
   * @param energyData - The energy data to persist
   */
  persistEnergyManager(energyData: iEnergyCalculation): void;

  /**
   * Persists data of an AC device
   * @param device - The device to persist data for
   */
  persistAC(device: iAcDevice): void;

  /**
   * Persists data of an actuator
   * @param device - The device to persist data for
   */
  persistActuator(device: iActuator): void;

  /**
   * Persists data of a heater
   * @param device - The device to persist data for
   */
  persistHeater(device: iHeater): void;

  /**
   * Persists data of a motion sensor
   * @param device - The device to persist data for
   */
  persistMotionSensor(device: iMotionSensor): void;

  /**
   * Persists data of a button switch action
   * @param device - The device to persist data for
   * @param pressType - The type of button press
   * @param buttonName - The name of the button
   */
  persistSwitchInput(device: iButtonSwitch, pressType: ButtonPressType, buttonName: string): void;

  /**
   * Persists data of a shutter
   * @param device - The device to persist data for
   */
  persistShutter(device: iShutter): void;

  /**
   * Persists data of a temperature sensor
   * @param device - The device to persist data for
   */
  persistTemperatureSensor(device: iTemperatureSensor): void;

  /**
   * Persists data of a humidity sensor
   * @param device - The device to persist data for
   */
  persistHumiditySensor(device: iHumiditySensor): void;

  /**
   * Persists data of a handle sensor
   * @param device - The device to persist data for
   */
  persistHandleSensor(device: iHandleSensor): void;

  /**
   * Persists data of a battery device
   * @param device - The device to persist data for
   */
  persistBatteryDevice(device: iBatteryDevice): void;

  /**
   * Persists data of a Zigbee device
   * @param device - The device to persist data for
   */
  persistZigbeeDevice(device: iZigbeeDevice): void;

  /**
   * Persists settings for the given id
   * @param id - The id to persist settings for
   * @param settings - The settings to persist (as JSON string)
   * @param customname - The custom name of the device/object
   */
  persistSettings(id: string, settings: string, customname: string): void;

  /**
   * Loads settings for the given id
   * @param id - The id of the object/device to load settings for
   * @returns - The settings as JSON string or undefined if not found
   */
  loadSettings(id: string): Promise<string | undefined>;
}
