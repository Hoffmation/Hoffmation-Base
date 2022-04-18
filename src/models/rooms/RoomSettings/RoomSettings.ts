import { RoomBase } from '../RoomBase';
import { iRoomInitializationSettings } from './iRoomInitializationSettings';
import { iRoomDefaultSettings } from './iRoomDefaultSettings';
import { API, iTimePair, SettingsService, SunTimeOffsets, Utils, WeatherService } from '../../../server';
import { RoomDeviceAddingSettings } from './roomDeviceAddingSettings';
import _ from 'lodash';

export class RoomSettings implements iRoomDefaultSettings, iRoomInitializationSettings {
  public shortName: string;
  public defaultSettings: iRoomDefaultSettings = SettingsService.settings.roomDefault;
  public deviceAddidngSettings?: RoomDeviceAddingSettings;
  public radioUrl: string = 'https://hermes.bcs-systems.de/hitradio-rtl_top40_64k_aac'; // Radio RTL
  public etage: number = -1;
  public rolloOffset: SunTimeOffsets;
  public lampOffset: SunTimeOffsets;
  public roomName?: string;
  public rolloHeatReduction: boolean = this.defaultSettings.rolloHeatReduction;

  public constructor(initSettings: iRoomInitializationSettings) {
    this.shortName = initSettings.shortName;
    this.etage = initSettings.etage;
    this.deviceAddidngSettings = initSettings.deviceAddidngSettings;
    this.rolloOffset = new SunTimeOffsets(
      this.sonnenAufgangRolloDelay,
      this.sonnenUntergangRolloDelay,
      this.sonnenAufgangRolloMinTime.hours,
      this.sonnenAufgangRolloMinTime.minutes,
      this.sonnenUntergangRolloMaxTime.hours,
      this.sonnenUntergangRolloMaxTime.minutes,
    );
    this.lampOffset = new SunTimeOffsets(this.sonnenAufgangLampenDelay, this.sonnenUntergangLampenDelay);
  }

  private _lichtSonnenAufgangAus: boolean = this.defaultSettings.lichtSonnenAufgangAus;

  get lichtSonnenAufgangAus(): boolean {
    return this._lichtSonnenAufgangAus;
  }

  set lichtSonnenAufgangAus(value: boolean) {
    this._lichtSonnenAufgangAus = value;
  }

  private _sonnenAufgangRollos: boolean = this.defaultSettings.sonnenAufgangRollos;

  get sonnenAufgangRollos(): boolean {
    return this._sonnenAufgangRollos;
  }

  set sonnenAufgangRollos(value: boolean) {
    this._sonnenAufgangRollos = value;
    this.recalcRolloOffset();
  }

  private _sonnenUntergangRolloMaxTime: iTimePair = this.defaultSettings.sonnenUntergangRolloMaxTime;

  get sonnenUntergangRolloMaxTime(): iTimePair {
    return this._sonnenUntergangRolloMaxTime;
  }

  set sonnenUntergangRolloMaxTime(value: iTimePair) {
    this._sonnenUntergangRolloMaxTime = value;
    this.recalcRolloOffset();
  }

  private _sonnenAufgangRolloMinTime: iTimePair = this.defaultSettings.sonnenAufgangRolloMinTime;

  get sonnenAufgangRolloMinTime(): iTimePair {
    return this._sonnenAufgangRolloMinTime;
  }

  set sonnenAufgangRolloMinTime(value: iTimePair) {
    this._sonnenAufgangRolloMinTime = value;
    this.recalcRolloOffset();
  }

  private _lightIfNoWindows: boolean = this.defaultSettings.lightIfNoWindows;

  get lightIfNoWindows(): boolean {
    return this._lightIfNoWindows;
  }

  set lightIfNoWindows(value: boolean) {
    this._lightIfNoWindows = value;
  }

  private _lampenBeiBewegung: boolean = this.defaultSettings.lampenBeiBewegung;

  get lampenBeiBewegung(): boolean {
    return this._lampenBeiBewegung;
  }

  set lampenBeiBewegung(value: boolean) {
    this._lampenBeiBewegung = value;
  }

  private _sonnenUntergangRollos: boolean = this.defaultSettings.sonnenUntergangRollos;

  get sonnenUntergangRollos(): boolean {
    return this._sonnenUntergangRollos;
  }

  set sonnenUntergangRollos(value: boolean) {
    this._sonnenUntergangRollos = value;
    this.recalcRolloOffset();
  }

  private _movementResetTimer: number = this.defaultSettings.movementResetTimer;

  get movementResetTimer(): number {
    return this._movementResetTimer;
  }

  set movementResetTimer(value: number) {
    this._movementResetTimer = value;
  }

  private _sonnenUntergangRolloDelay: number = this.defaultSettings.sonnenUntergangRolloDelay;

  get sonnenUntergangRolloDelay(): number {
    return this._sonnenUntergangRolloDelay;
  }

  set sonnenUntergangRolloDelay(value: number) {
    this._sonnenUntergangRolloDelay = value;
    this.recalcRolloOffset();
  }

  private _sonnenUntergangLampenDelay: number = this.defaultSettings.sonnenUntergangLampenDelay;

  get sonnenUntergangLampenDelay(): number {
    return this._sonnenUntergangLampenDelay;
  }

  set sonnenUntergangLampenDelay(value: number) {
    this._sonnenUntergangLampenDelay = value;
    this.recalcLampOffset();
  }

  private _sonnenUntergangRolloAdditionalOffsetPerCloudiness: number =
    this.defaultSettings.sonnenUntergangRolloAdditionalOffsetPerCloudiness;

  get sonnenUntergangRolloAdditionalOffsetPerCloudiness(): number {
    return this._sonnenUntergangRolloAdditionalOffsetPerCloudiness;
  }

  private _sonnenAufgangRolloDelay: number = this.defaultSettings.sonnenAufgangRolloDelay;

  get sonnenAufgangRolloDelay(): number {
    return this._sonnenAufgangRolloDelay;
  }

  set sonnenAufgangRolloDelay(value: number) {
    this._sonnenAufgangRolloDelay = value;
    this.recalcRolloOffset();
  }

  private _sonnenAufgangLampenDelay: number = this.defaultSettings.sonnenAufgangLampenDelay;

  get sonnenAufgangLampenDelay(): number {
    return this._sonnenAufgangLampenDelay;
  }

  set sonnenAufgangLampenDelay(value: number) {
    this._sonnenAufgangLampenDelay = value;
    this.recalcLampOffset();
  }

  private _roomIsAlwaysDark: boolean = this.defaultSettings.roomIsAlwaysDark;

  get roomIsAlwaysDark(): boolean {
    return this._roomIsAlwaysDark;
  }

  set roomIsAlwaysDark(value: boolean) {
    this._roomIsAlwaysDark = value;
  }

  public get room(): RoomBase | undefined {
    if (!this.roomName) {
      return undefined;
    }
    return API.getRoom(this.roomName);
  }

  public toJSON(): Partial<RoomSettings> {
    const result: Partial<RoomSettings> = Utils.jsonFilter(this);
    return _.omit(result, [`defaultSettings`, 'deviceAddidngSettings']);
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
    this.lampOffset = new SunTimeOffsets(this.sonnenAufgangLampenDelay, this.sonnenAufgangRolloDelay);
    this.room?.recalcTimeCallbacks();
  }
}
