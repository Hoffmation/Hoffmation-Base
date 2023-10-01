import { LogSource } from '../../../models/logSource';

export enum LogDebugType {
  None,
  SkipUnchangedActuatorCommand,
  SkipUnchangedRolloPosition,
  SetActuator,
  ShutterPositionChange,
  NewMovementState,
  SkipUnchangedMovementState,
  DaikinSuccessfullControlInfo,
  EuroHeaterValveLogging,
  Trilateration,
}

export class LogFilterData {
  room?: string;
  deviceId?: string;
  deviceName?: string;
  groupType?: string;
  source?: LogSource;
  debugType?: LogDebugType = LogDebugType.None;
}
