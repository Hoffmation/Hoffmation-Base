import { RoomBase } from '../RoomBase';
import { iRoomDefaultSettings } from './iRoomDefaultSettings';
import { API, iTimePair, ServerLogService, SunTimeOffsets, Utils, WeatherService } from '../../../server';
import _ from 'lodash';
import { RoomSettings } from './roomSettings';
import { LogLevel } from '../../logLevel';

export class RoomSettingsController implements iRoomDefaultSettings {
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
    WeatherService.addWeatherUpdateCb(`RolloWeatherUpdate${this.roomName}`, () => {
      if (this.sonnenUntergangRolloAdditionalOffsetPerCloudiness > 0) {
        this.room?.recalcTimeCallbacks();
      }
    });
  }

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

  public get settingsContainer(): RoomSettings {
    return this._settingsContainer;
  }

  get lichtSonnenAufgangAus(): boolean {
    return this._settingsContainer.lichtSonnenAufgangAus;
  }

  get ambientLightAfterSunset(): boolean {
    return this._settingsContainer.ambientLightAfterSunset;
  }

  get rolloHeatReduction(): boolean {
    return this._settingsContainer.rolloHeatReduction;
  }

  get sonnenAufgangRollos(): boolean {
    return this._settingsContainer.sonnenAufgangRollos;
  }

  get sonnenUntergangRolloMaxTime(): iTimePair {
    return this._settingsContainer.sonnenUntergangRolloMaxTime;
  }

  get sonnenAufgangRolloMinTime(): iTimePair {
    return this._settingsContainer.sonnenAufgangRolloMinTime;
  }

  get lightIfNoWindows(): boolean {
    return this._settingsContainer.lightIfNoWindows;
  }

  get lampenBeiBewegung(): boolean {
    return this._settingsContainer.lampenBeiBewegung;
  }

  get sonnenUntergangRollos(): boolean {
    return this._settingsContainer.sonnenUntergangRollos;
  }

  get movementResetTimer(): number {
    return this._settingsContainer.movementResetTimer;
  }

  get sonnenUntergangRolloDelay(): number {
    return this._settingsContainer.sonnenUntergangRolloDelay;
  }

  get sonnenUntergangLampenDelay(): number {
    return this._settingsContainer.sonnenUntergangLampenDelay;
  }

  get sonnenUntergangRolloAdditionalOffsetPerCloudiness(): number {
    return this._settingsContainer.sonnenUntergangRolloAdditionalOffsetPerCloudiness;
  }

  get sonnenAufgangRolloDelay(): number {
    return this._settingsContainer.sonnenAufgangRolloDelay;
  }

  get sonnenAufgangLampenDelay(): number {
    return this._settingsContainer.sonnenAufgangLampenDelay;
  }

  get roomIsAlwaysDark(): boolean {
    return this._settingsContainer.roomIsAlwaysDark;
  }

  get radioUrl(): string {
    return this._settingsContainer.radioUrl;
  }

  get includeLampsInNormalMovementLightning(): boolean {
    return this._settingsContainer.includeLampsInNormalMovementLightning;
  }

  public get room(): RoomBase | undefined {
    if (!this.roomName) {
      return undefined;
    }
    return API.getRoom(this.roomName);
  }

  public toJSON(): Partial<RoomSettingsController> {
    const result: Partial<RoomSettingsController> = Utils.jsonFilter(this);
    return _.omit(result, ["defaultSettings", 'deviceAddidngSettings']);
  }

  private onSettingChange(): void {
    ServerLogService.writeLog(LogLevel.Info, `${this.roomName} RoomSettingsController.onSettingChange`);
    this.recalcLampOffset();
    this.recalcRolloOffset();
  }

  private recalcRolloOffset(): void {
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

  private recalcLampOffset(): void {
    this.lampOffset = new SunTimeOffsets(this.sonnenAufgangLampenDelay, this.sonnenUntergangLampenDelay);
    this.room?.recalcTimeCallbacks();
  }
}
