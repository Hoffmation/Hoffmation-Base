import { iWeatherDaySummary } from '../../interfaces/iWeatherDaySummary';

/**
 * Fetches the daily weather aggregate of one past day, or `undefined` when that day cannot be obtained.
 * Handed in so the backfill can be exercised without talking to the weather service.
 */
export type WeatherDaySummaryFetcher = (date: Date) => Promise<iWeatherDaySummary | undefined>;
