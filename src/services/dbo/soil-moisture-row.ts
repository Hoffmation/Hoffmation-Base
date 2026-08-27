/**
 * The raw shape the driver hands back for one stored soil moisture reading.
 *
 * Same conversion rules as {@link BatteryLevelRow}: the numeric column may arrive as a string, and the date is
 * a Date built from naive components because the column carries no zone.
 *
 * Not part of the published surface - a database row shape is not an interface anyone implements.
 */
export type SoilMoistureRow = {
  /** The stored soil moisture in percent, as the driver hands it back */
  soilMoisture: string | number | null;
  /** When the reading was taken, built from naive components */
  date: Date | null;
};
