/**
 * One persisted actuator state change.
 */
export interface iActuatorStateSample {
  /**
   * Whether the actuator was on after this change
   */
  on: boolean;
  /**
   * The date of the state change
   */
  date: Date;
}
