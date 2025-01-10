import _ from 'lodash';
import { iRoomBase, iTimePair } from '../../../interfaces';
import { SunTimeOffsets } from '../../sun-time-offsets';
import { RoomSettings } from './roomSettings';
import { RoomBase } from '../../../services';
import { WeatherService } from '../../../services/weather';
import { API } from '../../../api';
import { Utils } from '../../../utils';
import { ServerLogService } from '../../../logging';
import { LogLevel } from '../../../enums';

import { iRoomSettingsController } from '../../../interfaces/iRoomSettingsController';

export class RoomSettingsController {
  /**
   * The name of the room this settings are for
   */
  public roomName: string;
  /**
   * The offset used for shutter sunrise/sunset actions
   */
  public rolloOffset: SunTimeOffsets;
  /**
   * The offset used for lamp sunrise/sunset actions
   */
  public lampOffset: SunTimeOffsets;
  private _settingsContainer: RoomSettings = new RoomSettings();

  public constructor(room: RoomBase) {
    this.roomName = room.roomName;
    this.rolloOffset = new SunTimeOffsets(
      this.sonnenAufgangRolloDelay,
      this.sonnenUntergangRolloDelay,
      this.sonnenAufgangRolloMinTime.hours,
      this.sonnenAufgangRolloMinTime.minutes,
      this.sonnenUntergangRolloMaxTime.hours,
      this.sonnenUntergangRolloMaxTime.minutes,
    );
    this.lampOffset = new SunTimeOffsets(this.sonnenAufgangLampenDelay, this.sonnenUntergangLampenDelay);
    this._settingsContainer.onChangeCb = this.onSettingChange.bind(this);
    this._settingsContainer.initializeFromDb(room);
    WeatherService.addWeatherUpdateCb(`ShutterWeatherUpdate${this.roomName}`, () => {
      if (this.sonnenUntergangRolloAdditionalOffsetPerCloudiness > 0) {
        this.room?.recalcTimeCallbacks();
      }
    });
  }

  public get settingsContainer(): RoomSettings {
    return this._settingsContainer;
  }

  public get lichtSonnenAufgangAus(): boolean {
    return this._settingsContainer.lichtSonnenAufgangAus;
  }

  public get ambientLightAfterSunset(): boolean {
    return this._settingsContainer.ambientLightAfterSunset;
  }

  public get rolloHeatReduction(): boolean {
    return this._settingsContainer.rolloHeatReduction;
  }

  public get sonnenAufgangRollos(): boolean {
    return this._settingsContainer.sonnenAufgangRollos;
  }

  public get sonnenUntergangRolloMaxTime(): iTimePair {
    return this._settingsContainer.sonnenUntergangRolloMaxTime;
  }

  public get sonnenAufgangRolloMinTime(): iTimePair {
    return this._settingsContainer.sonnenAufgangRolloMinTime;
  }

  public get lightIfNoWindows(): boolean {
    return this._settingsContainer.lightIfNoWindows;
  }

  public get lampenBeiBewegung(): boolean {
    return this._settingsContainer.lampenBeiBewegung;
  }

  public get sonnenUntergangRollos(): boolean {
    return this._settingsContainer.sonnenUntergangRollos;
  }

  public get movementResetTimer(): number {
    return this._settingsContainer.movementResetTimer;
  }

  public get sonnenUntergangRolloDelay(): number {
    return this._settingsContainer.sonnenUntergangRolloDelay;
  }

  public get sonnenUntergangLampenDelay(): number {
    return this._settingsContainer.sonnenUntergangLampenDelay;
  }

  public get sonnenUntergangRolloAdditionalOffsetPerCloudiness(): number {
    return this._settingsContainer.sonnenUntergangRolloAdditionalOffsetPerCloudiness;
  }

  public get sonnenAufgangRolloDelay(): number {
    return this._settingsContainer.sonnenAufgangRolloDelay;
  }

  public get sonnenAufgangLampenDelay(): number {
    return this._settingsContainer.sonnenAufgangLampenDelay;
  }

  public get roomIsAlwaysDark(): boolean {
    return this._settingsContainer.roomIsAlwaysDark;
  }

  public get radioUrl(): string {
    return this._settingsContainer.radioUrl;
  }

  public get includeLampsInNormalMovementLightning(): boolean {
    return this._settingsContainer.includeLampsInNormalMovementLightning;
  }

  public get room(): iRoomBase | undefined {
    if (!this.roomName) {
      return undefined;
    }
    return API.getRoom(this.roomName);
  }

  public toJSON(): Partial<iRoomSettingsController> {
    const result: Partial<iRoomSettingsController> = Utils.jsonFilter(this);
    return _.omit(result, ['defaultSettings', 'deviceAddidngSettings']);
  }

  public onSettingChange(): void {
    ServerLogService.writeLog(LogLevel.Info, `${this.roomName} RoomSettingsController.onSettingChange`);
    this.recalcLampOffset();
    this.recalcRolloOffset();
  }

  public recalcRolloOffset(): void {
    this.rolloOffset = new SunTimeOffsets(
      this.sonnenAufgangRolloDelay,
      this.sonnenUntergangRolloDelay,
      this.sonnenAufgangRolloMinTime.hours,
      this.sonnenAufgangRolloMinTime.minutes,
      this.sonnenUntergangRolloMaxTime.hours,
      this.sonnenUntergangRolloMaxTime.minutes,
    );
    this.room?.recalcTimeCallbacks();
  }

  public recalcLampOffset(): void {
    this.lampOffset = new SunTimeOffsets(this.sonnenAufgangLampenDelay, this.sonnenUntergangLampenDelay);
    this.room?.recalcTimeCallbacks();
  }
}
