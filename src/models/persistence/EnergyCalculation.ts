export class EnergyCalculation {
  public drawnWattage: number = 0;
  public injectedWattage: number = 0;
  public selfConsumedWattage: number = 0;
  public costDrawn: number = 0;
  public earnedInjected: number = 0;
  public savedSelfConsume: number = 0;
  public endMs: number = 0;

  constructor(public startMs: number) {}
}
