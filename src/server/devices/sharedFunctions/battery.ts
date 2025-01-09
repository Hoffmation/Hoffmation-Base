import { iBatteryDevice } from '../baseDeviceInterfaces';
import { Utils } from '../../services';
import { BatteryLevelChangeAction, VictronDeviceSettings } from '../../../models';
import { iJsonOmitKeys } from '../../../models/iJsonOmitKeys';

export class Battery implements iJsonOmitKeys {
  /**
   * The last time the battery was persisted (in milliseconds since 1970)
   */
  private _level: number = -99;
  private _lastPersist: number = 0;
  private _lastLevel: number = -1;
  private _levelCallbacks: Array<(action: BatteryLevelChangeAction) => void> = [];
  private _lastChangeReportMs: number = 0;
  /** @inheritDoc */
  public readonly jsonOmitKeys: string[] = ['_device'];

  public constructor(private readonly _device: iBatteryDevice) {}

  public get level(): number {
    return this._level;
  }

  public set level(val: number) {
    this._level = val;
    this.checkForChange();
    this.persist();
  }

  /** @inheritDoc */
  public persist(): void {
    const now: number = Utils.nowMS();
    if (this._lastPersist + 60000 > now) {
      return;
    }
    Utils.dbo?.persistBatteryDevice(this._device);
    this._lastPersist = now;
  }

  /**
   * Checks whether the battery level did change and if so fires the callbacks
   */
  public checkForChange(): void {
    const batteryReportingInterval: number =
      (this._device.settings as VictronDeviceSettings)?.batteryReportingInterval ?? -1;
    if (
      this._level == this._lastLevel &&
      (batteryReportingInterval < 0 || Utils.nowMS() - this._lastChangeReportMs < batteryReportingInterval * 60 * 1000)
    ) {
      return;
    }
    this._lastChangeReportMs = Utils.nowMS();
    for (const cb of this._levelCallbacks) {
      cb(new BatteryLevelChangeAction(this._device));
    }
    this._lastLevel = this._level;
  }

  /**
   * Adds a callback for when the battery-level has Changed.
   * @param pCallback - Function that accepts the new state as parameter
   */
  public addBatteryLevelCallback(pCallback: (action: BatteryLevelChangeAction) => void): void {
    this._levelCallbacks.push(pCallback);
  }

  public toJSON(): Partial<iBatteryDevice> {
    return Utils.jsonFilter(this, this.jsonOmitKeys);
  }
}
