import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { LogLevel } from '../../logging';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { iBatteryDevice } from '../baseDeviceInterfaces';
import { Battery } from '../sharedFunctions';

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
