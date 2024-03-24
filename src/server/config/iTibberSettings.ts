/**
 * The settings for the Tibber-Service (if needed).
 * Tibber is an energy provider which can be used to have hourly energy prices.
 */
export interface iTibberSettings {
  /**
   * The API key for Tibber-API-Authorization
   */
  apiKey: string;
  /**
   * The home ID for this home within the Tibber Account
   */
  homeId: string;
}
