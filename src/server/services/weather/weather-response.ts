/* eslint-disable jsdoc/require-jsdoc */
import { WeatherCurrent } from './weather-current.js';
import { WeatherMinutes } from './weather-minutes.js';
import { WeatherHourly } from './weather-hourly.js';
import { WeatherDaily } from './weather-daily.js';
import { WeatherAlert } from './weather-alert.js';

export interface WeatherResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current: WeatherCurrent;
  minutely: WeatherMinutes[];
  hourly: WeatherHourly[];
  daily: WeatherDaily[];
  alerts?: WeatherAlert[];
}
