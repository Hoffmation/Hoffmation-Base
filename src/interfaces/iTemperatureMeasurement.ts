/**
 * A measurement in persistence layer
 */
export interface iTemperatureMeasurement {
  /**
   * The measured temperature in Celsius
   */
  temperature: number;
  /**
   * The date of the measurement
   */
  date: Date;
}
