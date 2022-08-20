import { iButtonSwitch } from '../../baseDeviceInterfaces';
import { ZigbeeDevice } from './zigbeeDevice';
import { DeviceType } from '../../deviceType';
import { Button } from '../../button';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { DeviceCapability } from '../../DeviceCapability';
import { LogLevel } from '../../../../models';

export abstract class ZigbeeSwitch extends ZigbeeDevice implements iButtonSwitch {
  public battery: number = -99;
  public abstract buttonBot: Button | undefined;
  public abstract buttonBotLeft: Button | undefined;
  public abstract buttonBotRight: Button | undefined;
  public abstract buttonMidLeft: Button | undefined;
  public abstract buttonMidRight: Button | undefined;
  public abstract buttonTop: Button | undefined;
  public abstract buttonTopLeft: Button | undefined;
  public abstract buttonTopRight: Button | undefined;

  public constructor(pInfo: IoBrokerDeviceInfo, deviceType: DeviceType) {
    super(pInfo, deviceType);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverrride: boolean = false): void {
    super.update(idSplit, state, initial, pOverrride);
    switch (idSplit[3]) {
      case 'battery':
        this.battery = state.val as number;
        if (this.battery < 20) {
          this.log(LogLevel.Warn, `Das Zigbee Gerät hat unter 20% Batterie.`);
        }
        break;
    }
  }

  public abstract getButtonAssignment(): string;
}
