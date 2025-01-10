export interface iEnergyCalculation {
  drawnKwH: number;
  injectedKwH: number;
  selfConsumedKwH: number;
  costDrawn: number;
  earnedInjected: number;
  savedSelfConsume: number;
  endMs: number;
  batteryStoredKwH: number;
  batteryLevel: number;
  startMs: number;
}
