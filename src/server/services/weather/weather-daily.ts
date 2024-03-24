/* eslint-disable jsdoc/require-jsdoc */
import { WeatherTemp } from './weather-temp';
import { WeatherItem } from './weather-item';
import { WeatherFeelsLike } from './weather-feelsLike';

export interface WeatherDaily {
  dt: number;
  sunrise: number;
  sunset: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  wind_speed: number;
  wind_deg: number;
  clouds: number;
  pop: number;
  rain?: number;
  snow?: number;
  uvi: number;
  temp: WeatherTemp;
  feels_like: WeatherFeelsLike;
  weather: WeatherItem[];
}
