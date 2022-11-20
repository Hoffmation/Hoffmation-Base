import { RoomBase } from '../RoomBase';
import { iRoomDefaultSettings } from './iRoomDefaultSettings';
import { API, iTimePair, SunTimeOffsets, Utils, WeatherService } from '../../../server';
import _ from 'lodash';
import { RoomSettings } from './roomSettings';

export class RoomSettingsController implements iRoomDefaultSettings {
  public roomName: string;
  public rolloOffset: SunTimeOffsets;
  public lampOffset: SunTimeOffsets;
  private settingsContainer: RoomSettings = new RoomSettings();

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
    this.settingsContainer.onChangeCb = this.onSettingChange.bind(this);
    this.settingsContainer.initializeFromDb(room);
  }

  get lichtSonnenAufgangAus(): boolean {
    return this.settingsContainer.lichtSonnenAufgangAus;
  }

  get ambientLightAfterSunset(): boolean {
    return this.settingsContainer.ambientLightAfterSunset;
  }

  get rolloHeatReduction(): boolean {
    return this.settingsContainer.rolloHeatReduction;
  }

  get sonnenAufgangRollos(): boolean {
    return this.settingsContainer.sonnenAufgangRollos;
  }

  get sonnenUntergangRolloMaxTime(): iTimePair {
    return this.settingsContainer.sonnenUntergangRolloMaxTime;
  }

  get sonnenAufgangRolloMinTime(): iTimePair {
    return this.settingsContainer.sonnenAufgangRolloMinTime;
  }

  get lightIfNoWindows(): boolean {
    return this.settingsContainer.lightIfNoWindows;
  }

  get lampenBeiBewegung(): boolean {
    return this.settingsContainer.lampenBeiBewegung;
  }

  get sonnenUntergangRollos(): boolean {
    return this.settingsContainer.sonnenUntergangRollos;
  }

  get movementResetTimer(): number {
    return this.settingsContainer.movementResetTimer;
  }

  get sonnenUntergangRolloDelay(): number {
    return this.settingsContainer.sonnenUntergangRolloDelay;
  }

  get sonnenUntergangLampenDelay(): number {
    return this.settingsContainer.sonnenUntergangLampenDelay;
  }

  get sonnenUntergangRolloAdditionalOffsetPerCloudiness(): number {
    return this.settingsContainer.sonnenUntergangRolloAdditionalOffsetPerCloudiness;
  }

  get sonnenAufgangRolloDelay(): number {
    return this.settingsContainer.sonnenAufgangRolloDelay;
  }

  get sonnenAufgangLampenDelay(): number {
    return this.settingsContainer.sonnenAufgangLampenDelay;
  }

  get roomIsAlwaysDark(): boolean {
    return this.settingsContainer.roomIsAlwaysDark;
  }

  get radioUrl(): string {
    return this.settingsContainer.radioUrl;
  }

  public get room(): RoomBase | undefined {
    if (!this.roomName) {
      return undefined;
    }
    return API.getRoom(this.roomName);
  }

  public toJSON(): Partial<RoomSettingsController> {
    const result: Partial<RoomSettingsController> = Utils.jsonFilter(this);
    return _.omit(result, [`defaultSettings`, 'deviceAddidngSettings']);
  }

  private onSettingChange(): void {
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
    if (this.sonnenUntergangRolloAdditionalOffsetPerCloudiness > 0) {
      WeatherService.addWeatherUpdateCb(`RolloWeatherUpdate${this.roomName}`, () => {
        this.room?.recalcTimeCallbacks();
      });
    }
    this.room?.recalcTimeCallbacks();
  }

  private recalcLampOffset(): void {
    this.lampOffset = new SunTimeOffsets(this.sonnenAufgangLampenDelay, this.sonnenUntergangLampenDelay);
    this.room?.recalcTimeCallbacks();
  }
}
