import { DeviceType } from '../deviceType';
import { LampSetLightCommand, LampSetTimeBasedCommand, LampToggleLightCommand, LogLevel } from '../../../models';
import { iLamp } from '../baseDeviceInterfaces';
import { Utils } from '../../services';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { ZigbeeUbisysActuator } from './zigbeeUbisysActuator';
import { LampUtils } from '../sharedFunctions';

export class ZigbeeUbisysLampe extends ZigbeeUbisysActuator implements iLamp {
  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeUbisysLampe);
    this.deviceCapabilities.push(DeviceCapability.lamp);
  }

  public get lightOn(): boolean {
    return super.isActuatorOn;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'state':
        this.log(LogLevel.Trace, `Lampen Update für ${this.info.customName} auf ${state.val}`);
        break;
    }
  }

  /** @inheritdoc */
  public setLight(c: LampSetLightCommand): void {
    super.setActuator(c);
  }

  public toggleLight(c: LampToggleLightCommand): boolean {
    return LampUtils.toggleLight(this, c);
  }

  public setTimeBased(c: LampSetTimeBasedCommand): void {
    LampUtils.setTimeBased(this, c);
  }

  public persist(): void {
    Utils.dbo?.persistActuator(this);
  }
}
