/* eslint-disable jsdoc/require-jsdoc */

import { WeatherCurrent } from './weather-current';
import { WeatherMinutes } from './weather-minutes';
import { WeatherHourly } from './weather-hourly';
import { WeatherDaily } from './weather-daily';
import { WeatherAlert } from './weather-alert';

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
