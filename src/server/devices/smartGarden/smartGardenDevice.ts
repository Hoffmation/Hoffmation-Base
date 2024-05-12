import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';
import { iDisposable, Utils } from '../../services';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceType } from '../deviceType';
import { BatteryLevelChangeAction, LogLevel } from '../../../models';
import { iBatteryDevice } from '../baseDeviceInterfaces';
import { DeviceCapability } from '../DeviceCapability';

export class SmartGardenDevice extends IoBrokerBaseDevice implements iDisposable, iBatteryDevice {
  protected _criticalBatteryLevel: number = 20;
  private _lastUpdate: Date = new Date(0);
  private _lastBatteryLevel: number = -1;
  private _batteryLevelCallbacks: Array<(action: BatteryLevelChangeAction) => void> = [];
  private _lastBatteryPersist: number = 0;
  private _battery: number = -99;

  public constructor(pInfo: IoBrokerDeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
  }

  /** @inheritDoc */
  public get lastBatteryPersist(): number {
    return this._lastBatteryPersist;
  }

  /** @inheritDoc */
  public get battery(): number {
    return this._battery;
  }

  public get lastUpdate(): Date {
    return this._lastUpdate;
  }

  /** @inheritDoc */
  public addBatteryLevelCallback(pCallback: (action: BatteryLevelChangeAction) => void): void {
    this._batteryLevelCallbacks.push(pCallback);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    this.log(
      LogLevel.DeepTrace,
      `Smartgarden: ${initial ? 'Initiales ' : ''}Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
    if (!pOverride) {
      this.log(
        LogLevel.Warn,
        `Keine Update Überschreibung:\n\tID: ${idSplit.join('.')}\n\tData: ${JSON.stringify(state)}`,
      );
    }

    const stateLastUpdate: Date = new Date(state.ts);
    if (stateLastUpdate > this._lastUpdate) {
      this._lastUpdate = stateLastUpdate;
    }
    if (idSplit.length < 6) {
      return;
    }
    const folder: string = idSplit[4];
    const stateName: string = idSplit[5];
    if (folder.indexOf('SERVICE_COMMON') === 0) {
      switch (stateName) {
        case 'batteryLevel_value':
          this._battery = state.val as number;
          this.checkForBatteryChange();
          this.persistBatteryDevice();
          if (this._battery < this._criticalBatteryLevel) {
            this.log(LogLevel.Warn, 'This SmartGarden device reached critical battery level.');
          }
          break;
      }
    }
    this.stateMap.set(idSplit[5], state);
    const individualCallbacks: Array<(val: ioBroker.StateValue) => void> | undefined =
      this.individualStateCallbacks.get(idSplit[5]);
    if (individualCallbacks !== undefined) {
      for (const cb of individualCallbacks) {
        cb(state.val);
      }
    }
  }

  /** @inheritDoc */
  public persistBatteryDevice(): void {
    const now: number = Utils.nowMS();
    if (this._lastBatteryPersist + 60000 > now) {
      return;
    }
    Utils.dbo?.persistBatteryDevice(this);
    this._lastBatteryPersist = now;
  }

  /** @inheritDoc */
  public dispose(): void {
    // Nothing yet
  }

  /**
   * Checks whether the battery level did change and if so fires the callbacks
   */
  private checkForBatteryChange(): void {
    const newLevel: number = this.battery;
    if (newLevel == -1 || newLevel == this._lastBatteryLevel) {
      return;
    }
    for (const cb of this._batteryLevelCallbacks) {
      cb(new BatteryLevelChangeAction(this));
    }
    this._lastBatteryLevel = newLevel;
  }
}
