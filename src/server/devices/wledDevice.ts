import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';
import { DeviceType } from './deviceType';
import { ServerLogService, Utils } from '../services';
import { CollisionSolving, LogLevel, TimeOfDay, WledSettings } from '../../models';
import { IoBrokerDeviceInfo } from './IoBrokerDeviceInfo';
import { iDimmableLamp } from './baseDeviceInterfaces/iDimmableLamp';
import { BlockAutomaticHandler } from '../services/blockAutomaticHandler';
import { LampUtils } from './sharedFunctions';

export class WledDevice extends IoBrokerBaseDevice implements iDimmableLamp {
  public on: boolean = false;
  public brightness: number = -1;
  public battery: number = -1;
  public queuedValue: boolean | null = null;
  public settings: WledSettings = new WledSettings();
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  public targetAutomaticState: boolean = false;
  private readonly _onID: string;
  private readonly _presetID: string;
  private readonly _brightnessID: string;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.WledDevice);
    this._onID = `${this.info.fullID}.on`;
    this._presetID = `${this.info.fullID}.ps`;
    this._brightnessID = `${this.info.fullID}.bri`;
    this.blockAutomationHandler = new BlockAutomaticHandler(this.restoreTargetAutomaticValue.bind(this));
  }

  public get actuatorOn(): boolean {
    return this.on;
  }

  public get lightOn(): boolean {
    return this.on;
  }

  public restoreTargetAutomaticValue(): void {
    this.log(LogLevel.Debug, `Restore Target Automatic value`);
    this.setActuator(this.targetAutomaticState);
  }

  public override update(
    idSplit: string[],
    state: ioBroker.State,
    initial: boolean = false,
    _pOverride: boolean = false,
  ): void {
    this.queuedValue = null;
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Wled: ${initial ? 'Initiales ' : ''}Update für "${this.info.customName}": ID: ${idSplit.join(
        '.',
      )} JSON: ${JSON.stringify(state)}`,
    );

    switch (idSplit[3]) {
      case 'on':
        this.on = state.val as boolean;
        break;
      case 'bri':
        this.brightness = state.val as number;
        break;
    }
  }

  public setLight(
    pValue: boolean,
    timeout?: number,
    force?: boolean,
    brightness?: number,
    _transitionTime?: number,
  ): void {
    this.setWled(pValue, brightness, undefined, timeout, force);
  }

  public setWled(pValue: boolean, brightness: number = -1, preset?: number, timeout?: number, force?: boolean): void {
    if (this._onID === '') {
      ServerLogService.writeLog(LogLevel.Error, `Keine On ID für "${this.info.customName}" bekannt.`);
      return;
    }

    if (!this.ioConn) {
      ServerLogService.writeLog(LogLevel.Error, `Keine Connection für "${this.info.customName}" bekannt.`);
      return;
    }

    const dontBlock: boolean = LampUtils.checkUnBlock(this, force, pValue);

    if (LampUtils.checkBlockActive(this, force, pValue)) {
      return;
    }

    if (pValue && brightness !== -1 && this.brightness < 10) {
      brightness = 10;
    }

    ServerLogService.writeLog(
      LogLevel.Debug,
      `WLED Schalten: "${this.info.customName}" An: ${pValue}\tHelligkeit: ${brightness}%`,
    );

    this.queuedValue = pValue;
    this.setState(this._onID, pValue, undefined, (err) => {
      ServerLogService.writeLog(LogLevel.Error, `WLED schalten ergab Fehler: ${err}`);
    });

    if (preset !== undefined) {
      this.setState(this._presetID, preset, undefined, (err) => {
        ServerLogService.writeLog(LogLevel.Error, `WLED schalten ergab Fehler: ${err}`);
      });
    } else if (brightness > -1) {
      this.setState(this._brightnessID, brightness, undefined, (err) => {
        ServerLogService.writeLog(LogLevel.Error, `Dimmer Helligkeit schalten ergab Fehler: ${err}`);
      });
    }

    if (timeout !== undefined && timeout > -1 && !dontBlock) {
      this.blockAutomationHandler.disableAutomatic(timeout, CollisionSolving.overrideIfGreater);
    }
  }

  public setTimeBased(time: TimeOfDay): void {
    this.log(LogLevel.Debug, `Wled setTimeBased ${time}`);
    switch (time) {
      case TimeOfDay.Night:
        if (this.settings.nightOn) {
          this.setWled(true, this.settings.nightBrightness, this.settings.nightPreset);
        }
        break;
      case TimeOfDay.AfterSunset:
        if (this.settings.duskOn) {
          this.setWled(true, this.settings.duskBrightness, this.settings.duskPreset);
        }
        break;
      case TimeOfDay.BeforeSunrise:
        if (this.settings.dawnOn) {
          this.setWled(true, this.settings.dawnBrightness, this.settings.dawnPreset);
        }
        break;
      case TimeOfDay.Daylight:
        if (this.settings.dayOn) {
          this.setWled(true, this.settings.dayBrightness, this.settings.dayPreset);
        }
        break;
    }
  }

  public persist(): void {
    Utils.dbo?.persistActuator(this);
  }

  public setActuator(pValue: boolean, _timeout?: number, _force?: boolean): void {
    this.setLight(pValue);
  }

  public toggleActuator(_force: boolean): boolean {
    this.setLight(!this.on);
    return this.on;
  }

  public toggleLight(time?: TimeOfDay, force: boolean = false, calculateTime: boolean = false): boolean {
    return LampUtils.toggleLight(this, time, force, calculateTime);
  }
}
