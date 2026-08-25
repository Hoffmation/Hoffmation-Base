/**
 * The raw shape the driver hands back for one recorded actuator state change.
 *
 * The boolean column may arrive as a string depending on how it was written; the timestamp is a Date built
 * from naive components because the column carries no zone.
 *
 * Not part of the published surface - a database row shape is not an interface anyone implements.
 */
export type ActuatorStateRow = {
  /** Whether the actuator was on, as the driver hands it back */
  on: boolean | string | null;
  /** When the change was recorded, built from naive components */
  date: Date | null;
};
