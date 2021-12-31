import { DimmerSettings } from '../../../models/dimmerSettings';
import { DeviceType } from '../deviceType';
import { Utils } from '../../services/utils/utils';
import { DeviceInfo } from '../DeviceInfo';
import { iLamp } from '../iLamp';
import { ZigbeeDevice } from './zigbeeDevice';
import { LogLevel } from '../../../models/logLevel';
import { TimeCallbackService, TimeOfDay } from '../../services/time-callback-service';

export class ZigbeeIlluDimmer extends ZigbeeDevice implements iLamp {
  public lightOn: boolean = false;
  public queuedValue: boolean | null = null;
  public brightness: number = 0;
  public transitionTime: number = 0;
  public settings: DimmerSettings = new DimmerSettings();
  private stateID: string = 'state';
  private brightnessID: string = 'brightness';
  private transitionID: string = 'transition_time';
  private _turnOffTimeout: NodeJS.Timeout | undefined = undefined;
  private turnOffTime: number = 0;

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIlluDimmer);
    this.stateID = `${this.info.fullID}.state`;
    this.brightnessID = `${this.info.fullID}.brightness`;
    this.transitionID = `${this.info.fullID}.transition_time`;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.queuedValue = null;
    this.log(LogLevel.DeepTrace, `Dimmer Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'state':
        this.log(LogLevel.Trace, `Dimmer Update für ${this.info.customName} auf ${state.val}`);
        this.lightOn = state.val as boolean;
        break;
      case 'brightness':
        this.log(LogLevel.Trace, `Dimmer Helligkeit Update für ${this.info.customName} auf ${state.val}`);
        this.brightness = state.val as number;
        break;
      case 'transition_time':
        this.log(LogLevel.Trace, `Dimmer Transition Time Update für ${this.info.customName} auf ${state.val}`);
        this.transitionTime = state.val as number;
        break;
    }
  }

  public setTimeBased(time: TimeOfDay, timeout: number = -1, force: boolean = false): void {
    switch (time) {
      case TimeOfDay.Night:
        this.setLight(true, timeout, force, this.settings.nightBrightness);
        break;
      case TimeOfDay.AfterSunset:
        this.setLight(true, timeout, force, this.settings.dawnBrightness);
        break;
      case TimeOfDay.BeforeSunrise:
        this.setLight(true, timeout, force, this.settings.duskBrightness);
        break;
      case TimeOfDay.Daylight:
        this.setLight(true, timeout, force, this.settings.dayBrightness);
        break;
    }
  }

  public setLight(
    pValue: boolean,
    timeout: number = -1,
    force: boolean = false,
    brightness: number = -1,
    transitionTime: number = -1,
  ): void {
    if (this.stateID === '') {
      this.log(LogLevel.Error, `Keine State ID bekannt.`);
      return;
    }

    if (!this.ioConn) {
      this.log(LogLevel.Error, `Keine Connection bekannt.`);
      return;
    }

    if (transitionTime > -1) {
      this.ioConn.setState(this.transitionID, transitionTime, (err) => {
        if (err) {
          this.log(LogLevel.Error, `Dimmer TransitionTime schalten ergab Fehler: ${err}`);
        }
      });
    }

    if (!force && Utils.nowMS() < this.turnOffTime) {
      this.log(
        LogLevel.Debug,
        `Skip automatic command to ${pValue} as it is locked until ${new Date(this.turnOffTime).toLocaleTimeString()}`,
      );
      return;
    }

    if (pValue && brightness === -1 && this.brightness < 10) {
      brightness = 10;
    }
    this.log(LogLevel.Debug, `Dimmer Schalten An: ${pValue} \t Helligkeit: ${brightness}%`);

    this.setState(this.stateID, pValue);
    this.queuedValue = pValue;

    if (brightness > -1) {
      if (brightness < this.settings.turnOnThreshhold) {
        this.setState(this.brightnessID, this.settings.turnOnThreshhold, () => {
          Utils.guardedTimeout(
            () => {
              this.log(LogLevel.Info, `Delayed reduced brightness on ${this.info.customName}`);
              this.setState(this.brightnessID, brightness);
            },
            1000,
            this,
          );
        });
      } else {
        this.setState(this.brightnessID, brightness);
      }
    }
    if (this._turnOffTimeout !== undefined) {
      clearTimeout(this._turnOffTimeout);
      this._turnOffTimeout = undefined;
    }

    if (timeout < 0 || !pValue) {
      return;
    }

    this.turnOffTime = Utils.nowMS() + timeout;
    this._turnOffTimeout = Utils.guardedTimeout(
      () => {
        this.log(LogLevel.Debug, `Delayed Turnoff initiated`);
        this._turnOffTimeout = undefined;
        if (!this.room) {
          this.setLight(false, -1, true);
        } else {
          this.room.setLightTimeBased(true);
        }
      },
      timeout,
      this,
    );
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
}
