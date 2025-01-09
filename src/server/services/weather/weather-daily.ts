/* eslint-disable jsdoc/require-jsdoc */
import { WeatherTemp } from './weather-temp.js';
import { WeatherItem } from './weather-item.js';
import { WeatherFeelsLike } from './weather-feelsLike.js';

export interface WeatherDaily {
  dt: number;
  sunrise: number;
  sunset: number;
  moonrise: number;
  moonset: number;
  moon_phase: number;
  summary: string;
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
