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
