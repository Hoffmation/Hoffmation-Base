/* eslint-disable jsdoc/require-jsdoc */
import { WeatherItem } from './weather-item.js';

export interface WeatherCurrent {
  /**
   * Zeit der Anfrage
   */
  dt: number;
  sunrise: number;
  sunset: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  rain?: {
    '1h': number;
  };
  snow?: {
    '1h': number;
  };
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust: number;
  weather: WeatherItem;
}
