/**
 * The raw shape the driver hands back for one stored daily weather aggregate.
 *
 * Same conversion rules as {@link BatteryLevelRow}: numeric columns may arrive as a string, and the date is a
 * Date built from naive components because the column carries no zone.
 *
 * Not part of the published surface - a database row shape is not an interface anyone implements.
 */
export type WeatherDaySummaryRow = {
  /** The day the aggregate belongs to, built from naive components */
  date: Date | null;
  /** Cloud cover of that day in percent, as the driver hands it back */
  cloudCover: string | number | null;
  /** Lowest air temperature of that day in degrees celsius */
  tempMin: string | number | null;
  /** Highest air temperature of that day in degrees celsius */
  tempMax: string | number | null;
};
