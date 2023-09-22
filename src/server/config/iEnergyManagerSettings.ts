export interface iEnergyManagerSettings {
  // Disable JS energy manager
  disableJsEnergyManager?: boolean;
  // Earnings per kWh injecting into the grid
  injectWattagePrice?: number;
  // Price per kWh from the grid
  wattagePrice?: number;
}
