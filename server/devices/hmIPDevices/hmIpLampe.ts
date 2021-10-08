import { HmIPDevice } from './hmIpDevice';
import { HmIpDeviceType } from './hmIpDeviceType';
import { DeviceInfo } from '../DeviceInfo';
import { LogLevel } from '/models/logLevel';
import { ServerLogService } from '/server/services/log-service';
import { LampSettings } from '/models/lampSettings';
import { Utils } from '/server/services/utils/utils';

export class HmIpLampe extends HmIPDevice {
  public lightOn: boolean | undefined = undefined;
  public queuedLightValue: boolean | null = null;
  public isStromStoss: boolean = false;
  public settings: LampSettings = new LampSettings();
  private lightOnSwitchID: string = '';
  private turnOffTimeout: NodeJS.Timeout | undefined = undefined;
  private turnOffTime: number = 0;

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, HmIpDeviceType.HmIpLampe);
    this.lightOnSwitchID = `${this.info.fullID}.2.STATE`;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Lampen Update für "${this.info.customName}": ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
    super.update(idSplit, state, initial, true);
    this.queuedLightValue = null;
    switch (idSplit[3]) {
      case '1':
        if (idSplit[4] === 'STATE') {
          this.lightOn = state.val as boolean;
        }
        break;
    }
  }

  /**
   * This function thats the light to a specific value
   * @param pValue The desired value
   * @param timeout A chosen Timeout after which the light should be reset
   */
  public setLight(pValue: boolean, timeout: number = -1, force: boolean = false): void {
    if (!force && pValue === this.lightOn && this.queuedLightValue === null) {
      ServerLogService.writeLog(
        LogLevel.DeepTrace,
        `Skip light command for "${this.info.customName}" as it is already ${pValue}`,
      );
      return;
    }
    if (this.lightOnSwitchID === '') {
      ServerLogService.writeLog(LogLevel.Error, `Keine Switch ID für "${this.info.customName}" bekannt.`);
      return;
    }

    if (!this.ioConn) {
      ServerLogService.writeLog(LogLevel.Error, `Keine Connection für "${this.info.customName}" bekannt.`);
      return;
    }

    if (!force && Utils.nowMS() < this.turnOffTime) {
      ServerLogService.writeLog(
        LogLevel.Debug,
        `Skip automatic command for "${this.info.customName}" to ${pValue} as it is locked until ${new Date(
          this.turnOffTime,
        ).toLocaleString()}`,
      );
      return;
    }

    ServerLogService.writeLog(LogLevel.Debug, `Lampe schalten: "${this.info.customName}" Wert: ${pValue}`);
    this.ioConn.setState(this.lightOnSwitchID, pValue, (err) => {
      if (err) {
        ServerLogService.writeLog(LogLevel.Error, `Lampe schalten ergab Fehler: ${err}`);
      }
    });
    this.queuedLightValue = pValue;

    if (this.isStromStoss) {
      timeout = 5000;
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

  /**
   * Switch the current condition of the light
   * @param force Whether this is a forcing action skipping delays and locks
   */
  public toggleLight(force: boolean = false): boolean {
    const newVal = this.queuedLightValue !== null ? !this.queuedLightValue : !this.lightOn;
    const timeout: number = newVal && force ? 30 * 60 * 1000 : -1;
    this.setLight(newVal, timeout, force);
    return newVal;
  }
}
