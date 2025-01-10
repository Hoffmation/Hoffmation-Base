import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { IoBrokerBaseDevice } from '../../IoBrokerBaseDevice';
import { iDisposable } from '../../../interfaces';
import { iZigbeeDevice } from '../../../interfaces/baseDevices/IZigbeeDevice';
import { Utils } from '../../../utils';
import { DeviceType, LogLevel } from '../../../enums';

export class ZigbeeDevice extends IoBrokerBaseDevice implements iDisposable, iZigbeeDevice {
  protected _available: boolean = false;
  protected _dontSendOnUnavailable: boolean = false;
  private readonly _deviceQueryId: string;

  public get available(): boolean {
    return this._available;
  }

  protected _linkQuality: number = 0;

  private readonly _persistZigbeeInterval: NodeJS.Timeout = Utils.guardedInterval(
    () => {
      this.persistZigbeeDevice();
    },
    15 * 60 * 1000,
    this,
    false,
  );

  public get linkQuality(): number {
    return this._linkQuality;
  }

  private _lastUpdate: Date = new Date(0);

  public get lastUpdate(): Date {
    return this._lastUpdate;
  }

  public constructor(pInfo: IoBrokerDeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
    this._deviceQueryId = `${this.info.fullID}.device_query`;
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    this.log(
      LogLevel.DeepTrace,
      `Zigbee: ${initial ? 'Initiales ' : ''}Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
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

    switch (idSplit[3]) {
      case 'available':
        const newAvailability: boolean = state.val as boolean;
        if (this._available && !newAvailability) {
          this.log(LogLevel.Debug, 'Device became unavailable.');
        }
        this._available = newAvailability;
        break;
      case 'link_quality':
        const newValue: number = state.val as number;
        if (this._linkQuality > 5 && newValue <= 5) {
          this.log(LogLevel.Debug, `The link-quality dropped to a critical level: ${newValue}`);
        }
        this._linkQuality = state.val as number;
        break;
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

  public triggerDeviceQuery(): void {
    this.log(LogLevel.Info, 'Triggering Device Query');
    this.setState(this._deviceQueryId, true);
  }

  /** @inheritDoc */
  public dispose(): void {
    clearInterval(this._persistZigbeeInterval);
  }

  public persistZigbeeDevice(): void {
    this.dbo?.persistZigbeeDevice(this);
  }

  /** @inheritDoc */
  public override setState(
    pointId: string,
    state: string | number | boolean | ioBroker.State | ioBroker.SettableState | null,
    onSuccess: (() => void) | undefined = undefined,
    onError: ((error: Error) => void) | undefined = undefined,
  ): void {
    if (this._dontSendOnUnavailable && !this._available) {
      this.log(LogLevel.Warn, `Device unavailable --> Not changing ${pointId} to ${state}`);
      return;
    }

    super.setState(pointId, state, onSuccess, onError);
  }
}
