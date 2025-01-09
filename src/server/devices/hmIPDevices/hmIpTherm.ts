import { HmIPDevice } from './hmIpDevice.js';
import { DeviceType } from '../deviceType.js';
import { LogLevel } from '../../../models/index.js';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo.js';
import { DeviceCapability } from '../DeviceCapability.js';
import { iBatteryDevice } from '../baseDeviceInterfaces/index.js';
import { Battery } from '../sharedFunctions/index.js';

export class HmIpTherm extends HmIPDevice implements iBatteryDevice {
  /** @inheritDoc */
  public readonly battery: Battery = new Battery(this);

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpTherm);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
  }

  public get batteryLevel(): number {
    return this.battery.level;
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Thermostat Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case '0':
        switch (idSplit[4]) {
          case 'OPERATING_VOLTAGE':
            this.battery.level = 100 * (((state.val as number) - 1.8) / 1.2);
            break;
        }
        break;
    }
  }
}
