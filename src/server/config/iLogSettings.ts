import { LogLevel } from '../../models';

export interface iLogSettings {
  /**
   * The threshold level for logging (-1 = off)
   */
  logLevel: LogLevel | -1;
  /**
   * Whether to inlude the timestamp in the log messages
   */
  useTimestamp: boolean;
  /**
   * Whether to log debug messages for movement state changes
   */
  debugNewMovementState?: boolean;
  /**
   * Whether to log debug messages for shutter position changes
   */
  debugShutterPositionChange?: boolean;
  /**
   * Whether to log debug messages for actuator change commands
   */
  debugActuatorChange?: boolean;
  /**
   * Whether to log debug messages for shutter commands being blocked as it is already in the desired position
   */
  debugUchangedShutterPosition?: boolean;
  /**
   * Whether to log debug messages for actuator commands being blocked as it is already in the desired state
   */
  debugUnchangedActuator?: boolean;
  /**
   * Whether to log debug messages for daikin control commands
   */
  debugDaikinSuccessfullControlInfo?: boolean;
  /**
   * Whether to log debug messages for euro heater valve position changes
   */
  debugEuroHeaterValve?: boolean;
  /**
   * Whether to log debug messages for trilateration calculations
   */
  debugTrilateration?: boolean;
}
