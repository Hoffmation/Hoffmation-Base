import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { CountToday, CurrentIlluminationDataPoint, LogLevel } from '../../../models';
import { Utils } from '../../services';
import { DeviceInfo } from '../DeviceInfo';
import { iIlluminationSensor } from '../baseDeviceInterfaces';

export class HmIpPraezenz extends HmIPDevice implements iIlluminationSensor {
  private static PRESENCE_DETECTION: string = 'PRESENCE_DETECTION_STATE';
  // private static ILLUMINATION_DURING_MOVEMENT: string = 'CURRENT_ILLUMINATION';
  private static CURRENT_ILLUMINATION: string = 'ILLUMINATION';
  public excludeFromNightAlarm: boolean = false;
  public presenceDetected: boolean = false;
  private _presenceDetectedCallback: Array<(pValue: boolean) => void> = [];
  // private presenceStateID: string;
  private initialized: boolean = false;

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpPraezenz);
    // this.presenceStateID = `${this.info.fullID}.1.${HmIpPraezenz.PRESENCE_DETECTION}`;
    Utils.dbo
      ?.getCount(this)
      .then((todayCount: CountToday) => {
        this.detectionsToday = todayCount.counter;
        this.log(LogLevel.Debug, `Präsenzcounter vorinitialisiert mit ${this.detectionsToday}`);
        this.initialized = true;
      })
      .catch((err: Error) => {
        this.log(LogLevel.Warn, `Failed to initialize Movement Counter, err ${err?.message ?? err}`);
      });
  }

  private _detectionsToday: number = 0;

  public get detectionsToday(): number {
    return this._detectionsToday;
  }

  public set detectionsToday(pVal: number) {
    const oldVal: number = this._detectionsToday;
    this._detectionsToday = pVal;
    Utils.dbo?.persistTodayCount(this, pVal, oldVal);
  }

  private _currentIllumination: number = -1;

  public get currentIllumination(): number {
    return this._currentIllumination;
  }

  private set currentIllumination(value: number) {
    this._currentIllumination = value;
    Utils.dbo?.persistCurrentIllumination(
      new CurrentIlluminationDataPoint(
        this.info.room,
        this.info.devID,
        value,
        new Date(),
        this.room?.LampenGroup?.anyLightsOn() ?? false,
      ),
    );
  }

  public addPresenceCallback(pCallback: (pValue: boolean) => void): void {
    this._presenceDetectedCallback.push(pCallback);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Präzens Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`);
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
      this.log(
        LogLevel.Debug,
        `Präsenz erkannt aber die Initialisierung aus der DB ist noch nicht erfolgt --> verzögern`,
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
      this.log(LogLevel.Debug, `Überspringe Präsenz da bereits der Wert ${pVal} vorliegt`);
      return;
    }

    this.presenceDetected = pVal;
    this.log(LogLevel.Debug, `Neuer Präsenzstatus Wert : ${pVal}`);

    if (pVal) {
      this.detectionsToday++;
      this.log(LogLevel.Trace, `Dies ist die ${this.detectionsToday} Bewegung `);
    }
    for (const c of this._presenceDetectedCallback) {
      c(pVal);
    }
  }
}
