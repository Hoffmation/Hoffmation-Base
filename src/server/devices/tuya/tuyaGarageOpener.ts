import { TuyaDevice } from './tuyaDevice.js';
import { GarageDoorOpenerSettings, LogLevel } from '../../../models/index.js';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo.js';
import { DeviceType } from '../deviceType.js';
import { DeviceCapability } from '../DeviceCapability.js';
import { iGarageDoorOpener } from '../baseDeviceInterfaces/index.js';

export class TuyaGarageOpener extends TuyaDevice implements iGarageDoorOpener {
  /** @inheritDoc */
  public settings: GarageDoorOpenerSettings = new GarageDoorOpenerSettings();
  private readonly _switchId: string;
  private readonly _doorContactId: string;
  private _isClosed: boolean = true;
  private _switchState: boolean = false;

  public get isClosed(): boolean {
    return this._isClosed;
  }

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.TuyaGarageDoorOpener);
    this.deviceCapabilities.push(DeviceCapability.garageDoorOpener);
    this._switchId = `${this.info.fullID}.1`;
    this._doorContactId = `${this.info.fullID}.3`;
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    const fullId = idSplit.join('.');
    switch (fullId) {
      case this._doorContactId:
        if (this.settings.invertSensor) {
          this._isClosed = state.val === true;
        } else {
          this._isClosed = state.val === false;
        }
        break;
      case this._switchId:
        if (this.settings.invertSensor) {
          this._switchState = state.val === false;
        } else {
          this._switchState = state.val === true;
        }
        break;
    }
    super.update(idSplit, state, initial, true);
  }

  public open(): void {
    if (!this.isClosed) {
      this.log(LogLevel.Info, 'Garage door is already open');
      return;
    }
    this.log(LogLevel.Info, 'Opening garage door');
    this.setState(this._switchId, !this.settings.invertSensor);
  }

  public close(): void {
    if (this.isClosed) {
      this.log(LogLevel.Info, 'Garage door is already closed');
      return;
    }
    this.log(LogLevel.Info, 'Closing garage door');
    this.setState(this._switchId, this.settings.invertSensor);
  }

  public trigger(): void {
    this.setState(this._switchId, !this._switchState);
  }

  /** @inheritDoc */
  public dispose(): void {
    super.dispose();
  }
}
