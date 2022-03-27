export class EnergyCalculation {
  public drawnKwH: number = 0;
  public injectedKwH: number = 0;
  public selfConsumedKwH: number = 0;
  public costDrawn: number = 0;
  public earnedInjected: number = 0;
  public savedSelfConsume: number = 0;
  public endMs: number = 0;

  constructor(public startMs: number) {}
}
