/**
 * The settings for the weather-service (if needed).
 * The weather-service is used to get weather data for the house location.
 */
export interface iWeatherSettings {
  /**
   * The lattitude of the location
   */
  lattitude: string;
  /**
   * The longitude of the location
   */
  longitude: string;
  /**
   * App-ID from OpenWeatherMap
   */
  appid?: string;
}
