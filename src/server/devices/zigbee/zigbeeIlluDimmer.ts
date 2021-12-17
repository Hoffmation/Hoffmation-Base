import { DimmerSettings } from '../../../models/dimmerSettings';
import { DeviceType } from '../deviceType';
import { ServerLogService } from '../../services/log-service';
import { Utils } from '../../services/utils/utils';
import { DeviceInfo } from '../DeviceInfo';
import { iLamp } from '../iLamp';
import { ZigbeeDevice } from './zigbeeDevice';
import { LogLevel } from '../../../models/logLevel';
import { TimeOfDay } from '../../services/time-callback-service';

export class ZigbeeIlluDimmer extends ZigbeeDevice implements iLamp {
  public lightOn: boolean = false;
  public queuedValue: boolean | null = null;
  public brightness: number = 0;
  public transitionTime: number = 0;
  public settings: DimmerSettings = new DimmerSettings();
  private stateID: string = 'state';
  private brightnessID: string = 'brightness';
  private transitionID: string = 'transition_time';
  private turnOffTimeout: NodeJS.Timeout | undefined = undefined;
  private turnOffTime: number = 0;

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIlluDimmer);
    this.stateID = `${this.info.fullID}.state`;
    this.brightnessID = `${this.info.fullID}.brightness`;
    this.transitionID = `${this.info.fullID}.transition_time`;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.queuedValue = null;
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Dimmer Update für "${this.info.customName}": ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'state':
        ServerLogService.writeLog(LogLevel.Trace, `Dimmer Update für ${this.info.customName} auf ${state.val}`);
        this.lightOn = state.val as boolean;
        break;
      case 'brightness':
        ServerLogService.writeLog(
          LogLevel.Trace,
          `Dimmer Helligkeit Update für ${this.info.customName} auf ${state.val}`,
        );
        this.brightness = state.val as number;
        break;
      case 'transition_time':
        ServerLogService.writeLog(
          LogLevel.Trace,
          `Dimmer Transition Time Update für ${this.info.customName} auf ${state.val}`,
        );
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
      ServerLogService.writeLog(LogLevel.Error, `Keine State ID für "${this.info.customName}" bekannt.`);
      return;
    }

    if (!this.ioConn) {
      ServerLogService.writeLog(LogLevel.Error, `Keine Connection für "${this.info.customName}" bekannt.`);
      return;
    }

    if (transitionTime > -1) {
      this.ioConn.setState(this.transitionID, transitionTime, (err) => {
        if (err) {
          ServerLogService.writeLog(LogLevel.Error, `Dimmer TransitionTime schalten ergab Fehler: ${err}`);
        }
      });
    }

    if (!force && Utils.nowMS() < this.turnOffTime) {
      ServerLogService.writeLog(
        LogLevel.Debug,
        `Skip automatic command for "${this.info.customName}" to ${pValue} as it is locked until ${new Date(
          this.turnOffTime,
        ).toLocaleTimeString()}`,
      );
      return;
    }

    if (pValue && brightness === -1 && this.brightness < 10) {
      brightness = 10;
    }
    ServerLogService.writeLog(
      LogLevel.Debug,
      `Dimmer Schalten: "${this.info.customName}" An: ${pValue}\tHelligkeit: ${brightness}%`,
    );

    this.ioConn.setState(this.stateID, pValue, (err) => {
      if (err) {
        ServerLogService.writeLog(LogLevel.Error, `Dimmer schalten ergab Fehler: ${err}`);
      }
    });
    this.queuedValue = pValue;

    if (brightness > -1) {
      this.ioConn.setState(this.brightnessID, brightness, (err) => {
        if (err) {
          ServerLogService.writeLog(LogLevel.Error, `Dimmer Helligkeit schalten ergab Fehler: ${err}`);
        }
      });
    }
    if (this.turnOffTimeout !== undefined) {
      clearTimeout(this.turnOffTimeout);
      this.turnOffTimeout = undefined;
    }

    if (timeout < 0 || !pValue) {
      return;
    }

    this.turnOffTime = Utils.nowMS() + timeout;
    this.turnOffTimeout = Utils.guardedTimeout(
      () => {
        ServerLogService.writeLog(LogLevel.Debug, `Delayed Turnoff for "${this.info.customName}" initiated`);
        this.turnOffTimeout = undefined;
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

  public toggleLight(time?: TimeOfDay, force: boolean = false): boolean {
    const newVal = this.queuedValue !== null ? !this.queuedValue : !this.lightOn;
    const timeout: number = newVal && force ? 30 * 60 * 1000 : -1;
    if (newVal && time !== undefined) {
      this.setTimeBased(time, timeout, force);
      return true;
    }
    this.setLight(newVal, timeout, force);
    return newVal;
  }
}
