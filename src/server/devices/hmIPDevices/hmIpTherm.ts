import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { LogLevel } from '../../../models';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { iBatteryDevice } from '../baseDeviceInterfaces';
import { Utils } from '../../services';

export class HmIpTherm extends HmIPDevice implements iBatteryDevice {
  private _battery: number = -99;
  private _lastBatteryPersist: number = 0;
  public get lastBatteryPersist(): number {
    return this._lastBatteryPersist;
  }

  public get battery(): number {
    return this._battery;
  }

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpTherm);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Thermostat Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case '0':
        switch (idSplit[4]) {
          case 'OPERATING_VOLTAGE':
            this._battery = 100 * (((state.val as number) - 1.8) / 1.2);
            this.persistBatteryDevice();
            break;
        }
        break;
    }
  }

  public persistBatteryDevice(): void {
    const now: number = Utils.nowMS();
    if (this._lastBatteryPersist + 60000 < now) {
      return;
    }
    Utils.dbo?.persistBatteryDevice(this);
    this._lastBatteryPersist = now;
  }
}
