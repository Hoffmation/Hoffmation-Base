export interface DachsInfluxDataPoint {
  /**
   * The timestamp of the data point
   */
  timestamp: Date;
  /**
   * The measurement of the data point
   */
  measurement: string;
  /**
   * The fields of the data point
   */
  fields: { [key: string]: string | number | boolean };
}
