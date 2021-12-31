import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { ZigbeeIlluActuator } from './zigbeeIlluActuator';
import { LogLevel } from '../../../models/logLevel';
import { iLamp } from '../iLamp';
import { TimeOfDay } from '../../services/time-callback-service';

export class ZigbeeIlluLampe extends ZigbeeIlluActuator implements iLamp {
  public get lightOn(): boolean {
    return super.actuatorOn;
  }

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIlluLampe);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'state':
        this.log(LogLevel.Trace, `Lampen Update für ${this.info.customName} auf ${state.val}`);
        break;
    }
  }

  public setLight(pValue: boolean, timeout: number = -1, force: boolean = false): void {
    this.log(LogLevel.Debug, `Lampenaktor schalten Wert: ${pValue}`);
    super.setActuator(pValue, timeout, force);
  }

  public toggleLight(force: boolean = false): boolean {
    return super.toggleActuator(force);
  }

  public setTimeBased(time: TimeOfDay): void {
    if (
      (time === TimeOfDay.Night && this.settings.nightOn) ||
      (time === TimeOfDay.BeforeSunrise && this.settings.dawnOn) ||
      (time === TimeOfDay.AfterSunset && this.settings.duskOn)
    ) {
      this.setLight(true);
    }
  }
}
