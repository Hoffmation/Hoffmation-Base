export interface iLogSettings {
  logLevel: number;
  useTimestamp: boolean;
  debugNewMovementState?: boolean;
  debugShutterPositionChange?: boolean;
  debugActuatorChange?: boolean;
  debugUchangedShutterPosition?: boolean;
  debugUnchangedActuator?: boolean;
  debugDaikinSuccessfullControlInfo?: boolean;
  debugEuroHeaterValve?: boolean;
  debugTrilateration?: boolean;
}
