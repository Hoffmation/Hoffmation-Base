export interface iMotionSensor {
  excludeFromNightAlarm: boolean;
  addMovementCallback(pCallback: (pValue: boolean) => void): void;
  movementDetected: boolean;
}
