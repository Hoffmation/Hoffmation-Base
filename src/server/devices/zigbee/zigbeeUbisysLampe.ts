import { DeviceType } from '../deviceType';
import { LogLevel, TimeOfDay } from '../../../models';
import { iLamp } from '../baseDeviceInterfaces';
import { LogDebugType, Utils } from '../../services';
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
  public setLight(pValue: boolean, timeout: number = -1, force: boolean = false): void {
    this.log(LogLevel.Debug, `Set Light Acutator to "${pValue}"`, LogDebugType.SetActuator);
    if (this.settings.isStromStoss && pValue) {
      timeout = 3000;
      LampUtils.stromStossOn(this);
    }
    super.setActuator(pValue, timeout, force);
  }

  public toggleLight(time?: TimeOfDay, force: boolean = false, calculateTime: boolean = false): boolean {
    return LampUtils.toggleLight(this, time, force, calculateTime);
  }

  public setTimeBased(time: TimeOfDay, timeout: number = -1, force: boolean = false): void {
    LampUtils.setTimeBased(this, time, timeout, force);
  }

  public persist(): void {
    Utils.dbo?.persistActuator(this);
  }
}
