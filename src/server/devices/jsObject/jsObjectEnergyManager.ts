import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';
import { iEnergyManager } from '../iEnergyManager';
import { iExcessEnergyConsumer } from '../iExcessEnergyConsumer';
import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { LogLevel } from '../../../models/logLevel';
import { Utils } from '../../services/utils/utils';
import { dbo, EnergyCalculation, SettingsService } from '../../../index';

export class JsObjectEnergyManager extends IoBrokerBaseDevice implements iEnergyManager {
  public get excessEnergyConsumerConsumption(): number {
    return this._excessEnergyConsumerConsumption;
  }

  public get excessEnergy(): number {
    return this._excessEnergy;
  }
  public get baseConsumption(): number {
    return this.totalConsumption - this._excessEnergyConsumerConsumption;
  }

  public get totalConsumption(): number {
    return this._currentProduction - this._excessEnergy;
  }

  public get currentProduction(): number {
    return this._currentProduction;
  }

  private _currentProduction: number = -1;
  private _excessEnergy: number = -1;
  private _excessEnergyConsumerConsumption: number = 0;
  private _excessEnergyConsumer: iExcessEnergyConsumer[] = [];
  private _iDatabaseLoggerInterval: NodeJS.Timeout | null = null;
  private _nextPersistEntry: EnergyCalculation;
  private _lastPersistenceCalculation: number = Utils.nowMS();

  public constructor(info: DeviceInfo) {
    super(info, DeviceType.JsEnergyManager);
    this.log(LogLevel.Info, `Creating Energy Manager Device`);
    this._iDatabaseLoggerInterval = Utils.guardedInterval(
      () => {
        this.persist();
      },
      15 * 60 * 1000,
      this,
    );
    this._nextPersistEntry = new EnergyCalculation(Utils.nowMS());
  }

  public cleanup(): void {
    if (this._iDatabaseLoggerInterval !== null) {
      clearInterval(this._iDatabaseLoggerInterval);
      this._iDatabaseLoggerInterval = null;
    }
  }

  public addExcessConsumer(device: iExcessEnergyConsumer): void {
    this._excessEnergyConsumer.push(device);
  }

  public recalculatePowerSharing(): void {
    // TODO Implement
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean, pOverride: boolean = false): void {
    this.log(
      LogLevel.DeepTrace,
      `EnergyManager: ${initial ? 'Initial ' : ''} update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(
        state,
      )}, override: ${pOverride}`,
    );
    switch (idSplit[3]) {
      case 'CurrentExcessEnergy':
        this.log(LogLevel.Trace, `Current excess energy update to ${state.val}`);
        this.setExcessEnergy(state.val as number);
        break;
      case 'CurrentProduction':
        this.log(LogLevel.Trace, `Current Production Update to ${state.val}`);
        this._currentProduction = state.val as number;
        break;
    }
  }

  private setExcessEnergy(val: number) {
    this._excessEnergy = val;
    this.calculatePersistenceValues();
    this.recalculatePowerSharing();
  }

  private calculatePersistenceValues(): void {
    const now = Utils.nowMS();
    const duration = now - this._lastPersistenceCalculation;
    if (this.excessEnergy < 0) {
      this._nextPersistEntry.drawnKwH += Utils.kWh(this.excessEnergy * -1, duration);
    } else {
      this._nextPersistEntry.injectedKwH += Utils.kWh(this.excessEnergy, duration);
      this._nextPersistEntry.selfConsumedKwH += Utils.kWh(this.totalConsumption, duration);
    }
    this._lastPersistenceCalculation = now;
  }

  private persist() {
    const obj: EnergyCalculation = JSON.parse(JSON.stringify(this._nextPersistEntry));
    if (obj.drawnKwH === 0 && obj.injectedKwH === 0 && obj.selfConsumedKwH === 0) {
      this.log(LogLevel.Warn, `Not persisting energy Data, as all values are 0.`);
      return;
    }
    this._nextPersistEntry = new EnergyCalculation(this._lastPersistenceCalculation);
    obj.endMs = this._lastPersistenceCalculation;
    obj.earnedInjected = Utils.round(obj.injectedKwH * (SettingsService.settings.injectWattagePrice ?? 0.06), 4);
    obj.savedSelfConsume = Utils.round(obj.selfConsumedKwH * SettingsService.settings.wattagePrice, 4);
    obj.costDrawn = Utils.round(obj.drawnKwH * SettingsService.settings.wattagePrice, 4);
    obj.injectedKwH = Utils.round(obj.injectedKwH, 4);
    obj.selfConsumedKwH = Utils.round(obj.selfConsumedKwH, 4);
    obj.drawnKwH = Utils.round(obj.drawnKwH, 4);
    dbo?.persistEnergyManager(obj);
    this.log(LogLevel.Info, `Persisting energy Manager Data.`);
  }
}
