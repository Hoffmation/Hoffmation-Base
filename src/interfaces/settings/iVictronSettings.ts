import { InfluxDbConnectionOptions } from '../dachs';

/**
 * The settings for the Victron-Service (if present).
 * Victron is a energy management system which provides solar or battery power.
 */
export interface iVictronSettings {
  /**
   * The address of the Victron GX device
   */
  host: string;
  /**
   * The information to connect to the InfluxDB for storing the data
   */
  influxDb: InfluxDbConnectionOptions;
  /**
   * Whether further information should be logged
   * TODO: Move this to a respective {@link LogDebugType}
   */
  debug: boolean;
}
