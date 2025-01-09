import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice.js';
import { iDisposable } from '../../services/index.js';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo.js';
import { DeviceType } from '../deviceType.js';
import { LogLevel } from '../../../models/index.js';
import { iBatteryDevice } from '../baseDeviceInterfaces/index.js';
import { DeviceCapability } from '../DeviceCapability.js';
import { Battery } from '../sharedFunctions/index.js';

export class SmartGardenDevice extends IoBrokerBaseDevice implements iDisposable, iBatteryDevice {
  /** @inheritDoc */
  public readonly battery: Battery = new Battery(this);
  protected _criticalBatteryLevel: number = 20;
  protected readonly _deviceSerial: string;
  private _lastUpdate: Date = new Date(0);

  public constructor(pInfo: IoBrokerDeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
    this._deviceSerial = pInfo.devID.replace('DEVICE_', '');
  }

  /** @inheritDoc */
  public get batteryLevel(): number {
    return this.battery.level;
  }

  public get lastUpdate(): Date {
    return this._lastUpdate;
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
          this.battery.level = state.val as number;
          if (this.batteryLevel < this._criticalBatteryLevel) {
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
  public dispose(): void {
    // Nothing yet
  }
}
