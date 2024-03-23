export class PhaseState {
  private readonly _injectingWattage: number = 0;
  private readonly _drawingWattage: number = 0;
  private readonly _selfConsumingWattage: number = 0;
  private readonly _totalConsumption: number = 0;

  public constructor(
    private readonly _meterValue: number,
    private readonly _production: number,
  ) {
    this._injectingWattage = Math.max(0, this._meterValue);
    this._selfConsumingWattage = this._production - Math.max(0, this._meterValue);
    this._drawingWattage = Math.min(0, this._meterValue) * -1;
    this._totalConsumption = this._production - this._meterValue;
  }

  public get selfConsumingWattage(): number {
    return this._selfConsumingWattage;
  }

  public get drawingWattage(): number {
    return this._drawingWattage;
  }

  public get injectingWattage(): number {
    return this._injectingWattage;
  }

  public get totalConsumptionWattage(): number {
    return this._totalConsumption;
  }
}
