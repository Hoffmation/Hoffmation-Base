/**
 * One recorded soil moisture reading in the persistence layer.
 */
export interface iSoilMoistureSample {
  /**
   * The measured soil moisture in percent
   */
  soilMoisture: number;
  /**
   * The date of the measurement
   */
  date: Date;
}
