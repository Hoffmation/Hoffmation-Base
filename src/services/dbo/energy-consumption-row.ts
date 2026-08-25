/**
 * The raw shape the driver hands back for one stored energy calculation interval.
 *
 * Same conversion rules as {@link BatteryLevelRow}: numeric columns may arrive as a string, and the timestamp
 * is a Date built from naive components because the column carries no zone.
 *
 * Not part of the published surface - a database row shape is not an interface anyone implements.
 */
export type EnergyConsumptionRow = {
  /** Energy the house took from its own production over the interval, in kWh */
  selfConsumedKwH: string | number | null;
  /** Energy the house took from the grid over the interval, in kWh */
  drawnKwH: string | number | null;
  /** End of the interval the reading closes, built from naive components */
  endDate: Date | null;
};
