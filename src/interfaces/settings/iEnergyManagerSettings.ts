/**
 * The configuration for an Energy-Manager (if present).
 * This can be used to make proper use of excess energy (e.g. from solar panels)
 */
export interface iEnergyManagerSettings {
  /**
   * Disable ioBroker JS-EnergyManager
   */
  disableJsEnergyManager?: boolean;
  /**
   * The price per kWh injecting into the grid
   */
  injectWattagePrice?: number;
  /**
   * The price per kWh from the grid
   */
  wattagePrice?: number;
}
