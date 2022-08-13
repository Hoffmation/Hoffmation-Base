import { DeviceType } from '../deviceType';
import { ZigbeeIlluActuator } from './zigbeeIlluActuator';
import { LogLevel, TimeOfDay } from '../../../models';
import { iLamp } from '../baseDeviceInterfaces';
import { LogDebugType, TimeCallbackService, Utils } from '../../services';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';

export class ZigbeeIlluLampe extends ZigbeeIlluActuator implements iLamp {
  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIlluLampe);
    this.deviceCapabilities.push(DeviceCapability.lamp);
  }

  public get lightOn(): boolean {
    return super.actuatorOn;
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
    if (this.settings.isStromStoss) {
      timeout = 3000;
      Utils.guardedTimeout(
        () => {
          if (this.room && this.room.PraesenzGroup?.anyPresent()) {
            this.setLight(true, -1, true);
          }
        },
        this.settings.stromStossResendTime * 1000,
        this,
      );
    }
    super.setActuator(pValue, timeout, force);
  }

  public toggleLight(time?: TimeOfDay, force: boolean = false, calculateTime: boolean = false): boolean {
    const newVal = this.queuedValue !== null ? !this.queuedValue : !this.lightOn;
    const timeout: number = newVal && force ? 30 * 60 * 1000 : -1;
    if (newVal && time === undefined && calculateTime && this.room !== undefined) {
      time = TimeCallbackService.dayType(this.room?.settings.lampOffset);
    }
    if (newVal && time !== undefined) {
      this.setTimeBased(time, timeout, force);
      return true;
    }
    this.setLight(newVal, timeout, force);
    return newVal;
  }

  public setTimeBased(time: TimeOfDay, timeout: number = -1, force: boolean = false): void {
    if (
      (time === TimeOfDay.Night && this.settings.nightOn) ||
      (time === TimeOfDay.BeforeSunrise && this.settings.dawnOn) ||
      (time === TimeOfDay.AfterSunset && this.settings.duskOn)
    ) {
      this.setLight(true, timeout, force);
    }
  }
}
