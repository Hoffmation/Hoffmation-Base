import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';
import { iEnergyManager, iExcessEnergyConsumer, PhaseState } from '../baseDeviceInterfaces';
import { DeviceType } from '../deviceType';
import { EnergyCalculation, LogLevel } from '../../../models';
import { iDisposable, SettingsService, Utils } from '../../services';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';

export class JsObjectEnergyManager extends IoBrokerBaseDevice implements iEnergyManager, iDisposable {
  private _excessEnergyConsumer: iExcessEnergyConsumer[] = [];
  private _iCalculationInterval: NodeJS.Timeout | null = null;
  private _iDatabaseLoggerInterval: NodeJS.Timeout | null = null;
  private _lastPersistenceCalculation: number = Utils.nowMS();
  private _nextPersistEntry: EnergyCalculation;
  private _powerValuePhaseA: number = -1;
  private _powerValuePhaseB: number = -1;
  private _powerValuePhaseC: number = -1;
  private blockDeviceChangeTime: number = -1;
  private _lastDeviceChange: undefined | { newState: boolean; device: iExcessEnergyConsumer };

  public constructor(info: IoBrokerDeviceInfo) {
    super(info, DeviceType.JsEnergyManager);
    this.deviceCapabilities.push(DeviceCapability.energyManager);
    this.log(LogLevel.Info, `Creating Energy Manager Device`);
    this._iCalculationInterval = Utils.guardedInterval(
      () => {
        this.calculateExcessEnergy();
      },
      5 * 1000,
      this,
    );
    this._iDatabaseLoggerInterval = Utils.guardedInterval(
      () => {
        this.persist();
      },
      15 * 60 * 1000,
      this,
    );
    this._nextPersistEntry = new EnergyCalculation(Utils.nowMS());
  }

  private _currentProduction: number = -1;

  public get currentProduction(): number {
    return this._currentProduction;
  }

  public get baseConsumption(): number {
    return this.totalConsumption - this._excessEnergyConsumerConsumption;
  }

  public get totalConsumption(): number {
    return (
      this.phaseAState.totalConsumptionWattage +
      this.phaseBState.totalConsumptionWattage +
      this.phaseCState.totalConsumptionWattage
    );
  }

  public get injectingWattage(): number {
    return this.phaseAState.injectingWattage + this.phaseBState.injectingWattage + this.phaseCState.injectingWattage;
  }

  public get drawingWattage(): number {
    return this.phaseAState.drawingWattage + this.phaseBState.drawingWattage + this.phaseCState.drawingWattage;
  }

  public get selfConsumingWattage(): number {
    return (
      this.phaseAState.selfConsumingWattage +
      this.phaseBState.selfConsumingWattage +
      this.phaseCState.selfConsumingWattage
    );
  }

  public get excessEnergy(): number {
    return this._powerValuePhaseA + this._powerValuePhaseB + this._powerValuePhaseC;
  }

  private _excessEnergyConsumerConsumption: number = 0;

  /**
   * Example:
   * ________________________________________
   * | ExcessEnergyA | 200W  |  200W | -500W |
   * | ExcessEnergyB | 300W  |  300W | -200W |
   * | ExcessEnergyC | 100W  | -100W | -300W |
   * | Production P  |  500W |  500W |    0W |
   * | Production    | 1500W | 1500W |    0W |
   * ________________________________________
   * | Consumption   |  900W | 1100W | 1000W |
   * | Injecting     |  600W |  500W |    0W |
   * | drawing       |    0W |  100W | 1000W |
   * | selfConsume   |  900W | 1000W |    0W |
   * ________________________________________
   **/

  public get excessEnergyConsumerConsumption(): number {
    return this._excessEnergyConsumerConsumption;
  }

  private _phaseAState: PhaseState = new PhaseState(0, 0);

  public get phaseAState(): PhaseState {
    return this._phaseAState;
  }

  private _phaseBState: PhaseState = new PhaseState(0, 0);

  public get phaseBState(): PhaseState {
    return this._phaseBState;
  }

  private _phaseCState: PhaseState = new PhaseState(0, 0);

  public get phaseCState(): PhaseState {
    return this._phaseCState;
  }

  public cleanup(): void {
    if (this._iDatabaseLoggerInterval !== null) {
      clearInterval(this._iDatabaseLoggerInterval);
      this._iDatabaseLoggerInterval = null;
    }
    if (this._iCalculationInterval !== null) {
      clearInterval(this._iCalculationInterval);
      this._iCalculationInterval = null;
    }
  }

  public addExcessConsumer(device: iExcessEnergyConsumer): void {
    this._excessEnergyConsumer.push(device);
  }

  public recalculatePowerSharing(): void {
    // As some devices need time to start/shutdown we need to delay turning on/off more devices.
    if (Utils.nowMS() < this.blockDeviceChangeTime) {
      return;
    }
    if (this.excessEnergy > 400) {
      this.turnOnAdditionalConsumer();
    } else if (this.excessEnergy < 200) {
      this.turnOffAdditionalConsumer();
    }
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean, pOverride: boolean = false): void {
    this.log(
      LogLevel.DeepTrace,
      `EnergyManager: ${initial ? 'Initial ' : ''} update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(
        state,
      )}, override: ${pOverride}`,
    );
    switch (idSplit[3]) {
      case 'CurrentExcessEnergyPhaseA':
        this.log(LogLevel.Trace, `Current excess energyA update to ${state.val}`);
        this._powerValuePhaseA = state.val as number;
        break;
      case 'CurrentExcessEnergyPhaseB':
        this.log(LogLevel.Trace, `Current excess energyB update to ${state.val}`);
        this._powerValuePhaseB = state.val as number;
        break;
      case 'CurrentExcessEnergyPhaseC':
        this.log(LogLevel.Trace, `Current excess energyC update to ${state.val}`);
        this._powerValuePhaseC = state.val as number;
        break;
      case 'CurrentProduction':
        this.log(LogLevel.Trace, `Current Production Update to ${state.val}`);
        this._currentProduction = state.val as number;
        break;
    }
  }

  private calculateExcessEnergy() {
    const phaseProduction: number = this._currentProduction / 3.0;
    this._phaseAState = new PhaseState(this._powerValuePhaseA, phaseProduction);
    this._phaseBState = new PhaseState(this._powerValuePhaseB, phaseProduction);
    this._phaseCState = new PhaseState(this._powerValuePhaseC, phaseProduction);
    this.calculatePersistenceValues();
    this.recalculatePowerSharing();
  }

  private calculatePersistenceValues(): void {
    const now = Utils.nowMS();
    const duration = now - this._lastPersistenceCalculation;
    this._nextPersistEntry.drawnKwH += Utils.kWh(this.drawingWattage, duration);
    this._nextPersistEntry.injectedKwH += Utils.kWh(this.injectingWattage, duration);
    this._nextPersistEntry.selfConsumedKwH += Utils.kWh(this.selfConsumingWattage, duration);
    this._lastPersistenceCalculation = now;
  }

  private persist() {
    const obj: EnergyCalculation = JSON.parse(JSON.stringify(this._nextPersistEntry));
    if (obj.drawnKwH === 0 && obj.injectedKwH === 0 && obj.selfConsumedKwH === 0) {
      this.log(LogLevel.Warn, `Not persisting energy Data, as all values are 0.`);
      return;
    }
    if (!SettingsService.settings.wattagePrice) {
      this.log(LogLevel.Warn, `Wattage price not set, assuming average of 34ct.`);
    }
    this._nextPersistEntry = new EnergyCalculation(this._lastPersistenceCalculation);
    obj.endMs = this._lastPersistenceCalculation;
    obj.earnedInjected = Utils.round(obj.injectedKwH * (SettingsService.settings.injectWattagePrice ?? 0.06), 4);
    obj.savedSelfConsume = Utils.round(obj.selfConsumedKwH * (SettingsService.settings.wattagePrice ?? 0.35), 4);
    obj.costDrawn = Utils.round(obj.drawnKwH * (SettingsService.settings.wattagePrice ?? 0.35), 4);
    obj.injectedKwH = Utils.round(obj.injectedKwH, 4);
    obj.selfConsumedKwH = Utils.round(obj.selfConsumedKwH, 4);
    obj.drawnKwH = Utils.round(obj.drawnKwH, 4);
    Utils.dbo?.persistEnergyManager(obj);
    this.log(LogLevel.Info, `Persisting energy Manager Data.`);
  }

  private turnOnAdditionalConsumer(): void {
    const potentialDevices: iExcessEnergyConsumer[] = this._excessEnergyConsumer.filter((e) => {
      if (e.energySettings.priority === -1 || e.on || !e.isAvailableForExcessEnergy()) {
        return false;
      }
      if (this._lastDeviceChange?.newState && e === this._lastDeviceChange.device) {
        e.log(
          LogLevel.Debug,
          `This woould have been a matching energy consumer, but apperantly last turn on failed...`,
        );
        return false;
      }
      return true;
    });
    if (potentialDevices.length === 0) {
      if (this._lastDeviceChange?.newState === true) {
        this._lastDeviceChange = undefined;
      }
      return;
    }
    potentialDevices.sort((a, b) => {
      return b.energySettings.priority - a.energySettings.priority;
    });
    this.blockDeviceChangeTime = Utils.nowMS() + potentialDevices[0].energySettings.powerReactionTime;
    potentialDevices[0].log(LogLevel.Info, `Turning on, as we have ${this.excessEnergy}W to spare...`);
    potentialDevices[0].turnOnForExcessEnergy();
    this._lastDeviceChange = { newState: true, device: potentialDevices[0] };
  }

  private turnOffAdditionalConsumer(): void {
    const potentialDevices: iExcessEnergyConsumer[] = this._excessEnergyConsumer.filter((e) => {
      if (e.energySettings.priority === -1 || !e.on) {
        return false;
      }
      if (!e.wasActivatedByExcessEnergy()) {
        e.log(LogLevel.Info, 'This would have been turned off, but was activated manually....');
        return false;
      }
      if (this._lastDeviceChange?.newState === false && e === this._lastDeviceChange.device) {
        e.log(
          LogLevel.Debug,
          `This woould have been a matching turn off energy consumer, but apperantly last turn off failed...`,
        );
        return false;
      }
      return true;
    });
    if (potentialDevices.length === 0) {
      if (this._lastDeviceChange?.newState === false) {
        this._lastDeviceChange = undefined;
      }
      return;
    }
    potentialDevices.sort((a, b) => {
      return a.energySettings.priority - b.energySettings.priority;
    });
    potentialDevices[0].log(LogLevel.Info, `Turning off, as we don't have energy to spare...`);
    this.blockDeviceChangeTime = Utils.nowMS() + potentialDevices[0].energySettings.powerReactionTime;
    potentialDevices[0].turnOffDueToMissingEnergy();
    this._lastDeviceChange = { newState: false, device: potentialDevices[0] };
  }

  public dispose(): void {
    if (this._iCalculationInterval) {
      clearInterval(this._iCalculationInterval);
      this._iCalculationInterval = null;
    }
    if (this._iDatabaseLoggerInterval) {
      clearInterval(this._iDatabaseLoggerInterval);
      this._iDatabaseLoggerInterval = null;
    }
  }

  public getReport(): string {
    const response: string[] = [];
    response.push(`Production: ${this.currentProduction}W`);
    response.push(`Total Consumption: ${this.totalConsumption}W`);
    response.push(`Excess Consumption: ${this.excessEnergyConsumerConsumption}W`);
    response.push(`Drawing Wattage: ${this.drawingWattage}W`);
    response.push(`Self Consuming Wattage: ${this.selfConsumingWattage}W`);
    response.push(`Injecting Wattage: ${this.injectingWattage}W`);
    return response.join('');
  }
}
