import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';
import { iExcessEnergyConsumer } from './iExcessEnergyConsumer';

export class PhaseState {
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
  private readonly _injectingWattage: number = 0;
  private readonly _drawingWattage: number = 0;
  private readonly _selfConsumingWattage: number = 0;
  private readonly _totalConsumption: number = 0;
  public constructor(private readonly _meterValue: number, private readonly _production: number) {
    this._injectingWattage = Math.max(0, this._meterValue);
    this._selfConsumingWattage = this._production - Math.max(0, this._meterValue);
    this._drawingWattage = Math.min(0, this._meterValue) * -1;
    this._totalConsumption = this._production - this._meterValue;
  }
}

export interface iEnergyManager extends IoBrokerBaseDevice {
  // Consumption from non controlled Devices in Watts
  baseConsumption: number;
  // Total available Energy in Watts
  currentProduction: number;
  // Remaining Energy in Watts
  excessEnergy: number;
  // Consumption from ExcessEnergyConsumer in Watts
  excessEnergyConsumerConsumption: number;
  // Total Consumption in Watts
  totalConsumption: number;
  // What is drawn from the Grid
  drawingWattage: number;
  // The consumed amount from own production
  selfConsumingWattage: number;
  // The power amount injected into the grid
  injectingWattage: number;
  // The current Status for Phase A
  phaseAState: PhaseState;
  // The current Status for Phase B
  phaseBState: PhaseState;
  // The current Status for Phase C
  phaseCState: PhaseState;

  addExcessConsumer(device: iExcessEnergyConsumer): void;
  recalculatePowerSharing(): void;

  cleanup(): void;
}
