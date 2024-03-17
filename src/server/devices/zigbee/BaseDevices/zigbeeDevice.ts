import { DeviceType } from '../../deviceType';
import { LogLevel } from '../../../../models';
import { IoBrokerBaseDevice } from '../../IoBrokerBaseDevice';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { iDisposable, Utils } from '../../../services';

export class ZigbeeDevice extends IoBrokerBaseDevice implements iDisposable {
  protected _available: boolean = false;
  protected _dontSendOnUnavailable: boolean = false;
  // If configured > 0, this indicates the minimum time between state writes in ms
  protected _debounceStateDelay: number = 0;
  private _lastWrite: number = 0;
  private readonly _deviceQueryId: string;

  public get available(): boolean {
    return this._available;
  }

  protected _linkQuality: number = 0;

  public readonly persistZigbeeInterval: NodeJS.Timeout = Utils.guardedInterval(
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

  public stateMap: Map<string, ioBroker.State> = new Map<string, ioBroker.State>();

  public constructor(pInfo: IoBrokerDeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
    this._deviceQueryId = `${this.info.fullID}.device_query`;
  }

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
          this.log(LogLevel.Debug, `Device became unavailable.`);
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
    this.log(LogLevel.Info, `Triggering Device Query`);
    this.setState(this._deviceQueryId, true);
  }

  public dispose(): void {
    clearInterval(this.persistZigbeeInterval);
  }

  public persistZigbeeDevice(): void {
    Utils.dbo?.persistZigbeeDevice(this);
  }

  protected override setState(
    pointId: string,
    state: string | number | boolean | ioBroker.State | ioBroker.SettableState | null,
    onSuccess: (() => void) | undefined = undefined,
    onError: ((error: Error) => void) | undefined = undefined,
  ): void {
    if (this._dontSendOnUnavailable && !this._available) {
      this.log(LogLevel.Warn, `Device unavailable --> Not changing ${pointId} to ${state}`);
      return;
    }

    if (this._debounceStateDelay === 0 || Utils.nowMS() - this._lastWrite > this._debounceStateDelay) {
      this._lastWrite = Utils.nowMS();
      super.setState(pointId, state, onSuccess, onError);
      return;
    }

    Utils.guardedTimeout(
      () => {
        this.log(LogLevel.Trace, `Debounced write to ${pointId} to ${state}`);
        this.setState(pointId, state, onSuccess, onError);
      },
      this._debounceStateDelay,
      this,
    );
  }
}
