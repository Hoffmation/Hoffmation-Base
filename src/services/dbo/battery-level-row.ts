/**
 * The raw shape the driver hands back for a stored battery level.
 *
 * Numeric columns arrive as a number or a string depending on their postgres type, so they are converted
 * rather than passed through. The timestamp column is `timestamp without time zone` and therefore a Date built
 * from naive components. It is deliberately not typed as `string | Date`: the driver never hands a string back
 * for that column, and pretending otherwise is what hid a timezone offset for a long time.
 *
 * Not part of the published surface - a database row shape is not an interface anyone implements.
 */
export type BatteryLevelRow = {
  /** The stored state of charge, as the driver hands it back */
  batteryLevel: string | number | null;
  /** End of the interval the reading closes, built from naive components */
  endDate: Date | null;
};
