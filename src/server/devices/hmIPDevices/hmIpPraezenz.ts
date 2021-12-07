import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { CountToday } from '../../../models/persistence/todaysCount';
import { ServerLogService } from '../../services/log-service';
import { Utils } from '../../services/utils/utils';
import { DeviceInfo } from '../DeviceInfo';
import { Persist } from '../../services/dbo/persist';
import { CurrentIlluminationDataPoint } from '../../../models/persistence/CurrentIlluminationDataPoint';
import { LogLevel } from '../../../models/logLevel';
import { iIlluminationSensor } from '../iIlluminationSensor';

export class HmIpPraezenz extends HmIPDevice implements iIlluminationSensor {
  public excludeFromNightAlarm: boolean = false;
  public presenceDetected: boolean = false;
  private _detectionsToday: number = 0;
  private _presenceDetectedCallback: Array<(pValue: boolean) => void> = [];
  private static PRESENCE_DETECTION: string = 'PRESENCE_DETECTION_STATE';
  // private static ILLUMINATION_DURING_MOVEMENT: string = 'CURRENT_ILLUMINATION';
  private static CURRENT_ILLUMINATION: string = 'ILLUMINATION';
  // private presenceStateID: string;
  private initialized: boolean = false;
  private _currentIllumination: number = -1;

  public get detectionsToday(): number {
    return this._detectionsToday;
  }

  public set detectionsToday(pVal: number) {
    const oldVal: number = this._detectionsToday;
    this._detectionsToday = pVal;
    Persist.persistTodayCount(this, pVal, oldVal);
  }

  public get currentIllumination(): number {
    return this._currentIllumination;
  }

  private set currentIllumination(value: number) {
    this._currentIllumination = value;
    Persist.persistCurrentIllumination(
      new CurrentIlluminationDataPoint(
        this.info.room,
        this.info.devID,
        value,
        new Date(),
        this.room?.LampenGroup.anyLightsOwn() ?? false,
      ),
    );
  }

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpPraezenz);
    // this.presenceStateID = `${this.info.fullID}.1.${HmIpPraezenz.PRESENCE_DETECTION}`;
    Persist.getCount(this)
      .then((todayCount: CountToday) => {
        this.detectionsToday = todayCount.counter;
        ServerLogService.writeLog(
          LogLevel.Debug,
          `Präsenzcounter "${this.info.customName}" vorinitialisiert mit ${this.detectionsToday}`,
        );
        this.initialized = true;
      })
      .catch((err: Error) => {
        ServerLogService.writeLog(
          LogLevel.Warn,
          `Failed to initialize Movement Counter for "${this.info.customName}", err ${err.message}`,
        );
      });
  }

  public addPresenceCallback(pCallback: (pValue: boolean) => void): void {
    this._presenceDetectedCallback.push(pCallback);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(LogLevel.Trace, `Präzens Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`);
    super.update(idSplit, state, initial, true);

    if (idSplit[3] !== '1') {
      // Nur die Infos in Kanal 1 sind relevant
      return;
    }

    switch (idSplit[4]) {
      case HmIpPraezenz.PRESENCE_DETECTION:
        this.updatePresence(state.val as boolean);
        break;
      case HmIpPraezenz.CURRENT_ILLUMINATION:
        this.currentIllumination = state.val as number;
        break;
    }
  }

  public updatePresence(pVal: boolean): void {
    if (!this.initialized && pVal) {
      ServerLogService.writeLog(
        LogLevel.Debug,
        `Präsenz für "${this.info.customName}" erkannt aber die Initialisierung aus der DB ist noch nicht erfolgt --> verzögern`,
      );
      Utils.guardedTimeout(
        () => {
          this.updatePresence(pVal);
        },
        1000,
        this,
      );
      return;
    }
    if (pVal === this.presenceDetected) {
      ServerLogService.writeLog(
        LogLevel.Debug,
        `Überspringe Präsenz für "${this.info.customName}" da bereits der Wert ${pVal} vorliegt`,
      );
      return;
    }

    this.presenceDetected = pVal;
    ServerLogService.writeLog(LogLevel.Debug, `Neuer Präsenzstatus Wert für "${this.info.customName}": ${pVal}`);

    if (pVal) {
      this.detectionsToday++;
      ServerLogService.writeLog(
        LogLevel.Trace,
        `Dies ist die ${this.detectionsToday} Bewegung für "${this.info.customName}"`,
      );
    }
    for (const c of this._presenceDetectedCallback) {
      c(pVal);
    }
  }
}
