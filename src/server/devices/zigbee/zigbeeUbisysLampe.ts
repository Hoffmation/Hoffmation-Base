import { DeviceType } from '../deviceType.js';
import { LogLevel } from '../../../models/index.js';
import { iLamp } from '../baseDeviceInterfaces/index.js';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo.js';
import { DeviceCapability } from '../DeviceCapability.js';
import { iLoadMeter } from '../baseDeviceInterfaces/iLoadMeter.js';
import { ZigbeeLamp } from './BaseDevices/index.js';

export class ZigbeeUbisysLampe extends ZigbeeLamp implements iLamp, iLoadMeter {
  protected readonly _actuatorOnStateIdState: string;
  private _loadPower: number = 0;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeUbisysLampe);
    this.deviceCapabilities.push(DeviceCapability.loadMetering);
    this._actuatorOnStateIdState = `${pInfo.fullID}.state`;
  }

  /** @inheritDoc */
  public get loadPower(): number {
    return this._loadPower;
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    switch (idSplit[3]) {
      case 'load_power':
        const newLoadPower: number = state.val as number;
        this.log(
          Math.abs(newLoadPower - this._loadPower) > 0.25 ? LogLevel.Trace : LogLevel.DeepTrace,
          `Outlet update, new current load power: ${state.val}`,
        );
        this._loadPower = newLoadPower;
        break;
    }
    super.update(idSplit, state, initial, true);
  }
}
