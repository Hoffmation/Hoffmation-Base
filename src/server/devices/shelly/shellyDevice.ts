import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';
import { iDisposable } from '../../services';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceType } from '../deviceType';
import { LogLevel } from '../../../models';

export class ShellyDevice extends IoBrokerBaseDevice implements iDisposable {
  private _lastUpdate: Date = new Date(0);

  public get lastUpdate(): Date {
    return this._lastUpdate;
  }

  public constructor(pInfo: IoBrokerDeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    this.log(
      LogLevel.DeepTrace,
      `Shelly: ${initial ? 'Initiales ' : ''}Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
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
    this.stateMap.set(idSplit[3], state);
    const individualCallbacks: Array<(val: ioBroker.StateValue) => void> | undefined =
      this.individualStateCallbacks.get(idSplit[3]);
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
