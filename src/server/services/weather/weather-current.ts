import { WeatherItem } from 'index';

export interface WeatherCurrent {
  /**
   * Zeit der Anfrage
   * @type {number}
   * @memberof WeatherCurrent
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
  rain?: number;
  snow?: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust: number;
  weather: WeatherItem[];
}
