/* eslint-disable jsdoc/require-jsdoc */

import { WeatherItem } from './weather-item';

export interface WeatherHourly {
  dt: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  weather: WeatherItem[];
  pop: number;
  rain?: {
    '1h': number;
  };
  snow?: {
    '1h': number;
  };
}
