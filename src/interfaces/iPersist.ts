import {
  iAcDevice,
  iActuator,
  iAirQualityCollector,
  iBaseDevice,
  iBatteryDevice,
  iButtonSwitch,
  iHandle,
  iHeater,
  iHumidityCollector,
  iIlluminationSensor,
  iMotionSensor,
  iShutter,
  iTemperatureCollector,
  iZigbeeDevice,
} from './baseDevices';
import { iTemperatureMeasurement } from './iTemperatureMeasurement';
import { iRoomBase } from './iRoomBase';
import { ButtonPressType } from '../enums';
import { iDesiredShutterPosition } from './IDesiredShutterPosition';
import { iCountToday } from './iCountToday';
import { iEnergyCalculation } from './iEnergyCalculation';
import { iShutterCalibration } from './iShutterCalibration';
import { iBatteryLevelSample } from './iBatteryLevelSample';
import { iActuatorStateSample } from './iActuatorStateSample';
import { iWeatherDaySummary } from './iWeatherDaySummary';
import { iConsumptionWindowSample } from './iConsumptionWindowSample';

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
   * Gets temperature measurements for a device by its ID
   * @param deviceId - The ID of the device to load temp measurements for
   * @param startDate - Optional start date for the query (defaults to start of today)
   * @param endDate - Optional end date for the query (defaults to end of today)
   * @returns - The measurements
   */
  getTemperatureHistory(deviceId: string, startDate?: Date, endDate?: Date): Promise<iTemperatureMeasurement[]>;

  /**
   * Gets the recorded battery levels of the house battery within the given window, in percent, dated at the
   * end of the interval each reading closes - the same time base the consumption readings use.
   * An absent, unreachable or empty persistence is a defined state, not a failure: the answer is then an
   * empty list. Readings without a usable level, and levels outside the range above 0 up to 100, are dropped
   * rather than replaced by a substitute value - which means an energy manager that does not actually record
   * the state of charge yields no history at all instead of a history of zeroes.
   * @param startDate - Start of the window (inclusive)
   * @param endDate - End of the window (inclusive)
   * @returns - The readings, newest first
   */
  getBatteryLevelHistory(startDate: Date, endDate: Date): Promise<iBatteryLevelSample[]>;

  /**
   * Gets the recorded state changes of one actuator within the given window.
   * An absent, unreachable or empty persistence is a defined state, not a failure: the answer is then an
   * empty list.
   * @param deviceId - The ID of the device to load the state changes for
   * @param startDate - Start of the window (inclusive)
   * @param endDate - End of the window (inclusive)
   * @returns - The state changes, newest first
   */
  getActuatorHistory(deviceId: string, startDate: Date, endDate: Date): Promise<iActuatorStateSample[]>;

  /**
   * Gets the recorded house consumption within the given window. Each reading carries the energy consumed
   * since the preceding one and is dated at the end of the interval it closes, so readings can be added up
   * over a window without counting an interval into the wrong one.
   * An absent, unreachable or empty persistence is a defined state, not a failure: the answer is then an
   * empty list. Readings without a usable value are dropped rather than replaced by a substitute value.
   * @param startDate - Start of the window (inclusive)
   * @param endDate - End of the window (inclusive)
   * @returns - The readings, newest first
   */
  getEnergyConsumptionHistory(startDate: Date, endDate: Date): Promise<iConsumptionWindowSample[]>;

  /**
   * Gets the stored daily weather aggregates within the given window.
   * An absent, unreachable or empty persistence is a defined state, not a failure: the answer is then an
   * empty list. Aggregates missing a value are dropped rather than completed with a substitute value.
   * @param startDate - Start of the window (inclusive)
   * @param endDate - End of the window (inclusive)
   * @returns - The aggregates, newest first
   */
  getWeatherDaySummaries(startDate: Date, endDate: Date): Promise<iWeatherDaySummary[]>;

  /**
   * Persists one daily weather aggregate. Writing the same day twice updates the existing record.
   * @param summary - The aggregate to persist
   */
  persistWeatherDaySummary(summary: iWeatherDaySummary): void;

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
  persistTemperatureSensor(device: iTemperatureCollector): void;

  /**
   * Persists data of a humidity sensor
   * @param device - The device to persist data for
   */
  persistHumiditySensor(device: iHumidityCollector): void;

  /**
   * Persists data of an air quality sensor
   * @param device - The device to persist data for
   */
  persistAirQualitySensor(device: iAirQualityCollector): void;

  /**
   * Persists data of a handle sensor
   * @param device - The device to persist data for
   */
  persistHandleSensor(device: iHandle): void;

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
