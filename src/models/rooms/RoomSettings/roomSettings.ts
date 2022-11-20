import { ObjectSettings } from '../../objectSettings';
import { iTimePair, SettingsService } from '../../../server';

export class RoomSettings extends ObjectSettings {
  private _ambientLightAfterSunset: boolean = SettingsService.settings.roomDefault.ambientLightAfterSunset;

  public get ambientLightAfterSunset(): boolean {
    return this._ambientLightAfterSunset;
  }

  private _lichtSonnenAufgangAus: boolean = SettingsService.settings.roomDefault.lichtSonnenAufgangAus;

  public get lichtSonnenAufgangAus(): boolean {
    return this._lichtSonnenAufgangAus;
  }

  private _radioUrl: string = SettingsService.settings.roomDefault.radioUrl ?? '';

  public get radioUrl(): string {
    return this._radioUrl;
  }

  private _rolloHeatReduction: boolean = SettingsService.settings.roomDefault.rolloHeatReduction;

  public get rolloHeatReduction(): boolean {
    return this._rolloHeatReduction;
  }

  private _lampenBeiBewegung: boolean = SettingsService.settings.roomDefault.lampenBeiBewegung;

  public get lampenBeiBewegung(): boolean {
    return this._lampenBeiBewegung;
  }

  private _lightIfNoWindows: boolean = SettingsService.settings.roomDefault.lightIfNoWindows;

  public get lightIfNoWindows(): boolean {
    return this._lightIfNoWindows;
  }

  private _movementResetTimer: number = SettingsService.settings.roomDefault.movementResetTimer;

  public get movementResetTimer(): number {
    return this._movementResetTimer;
  }

  private _roomIsAlwaysDark: boolean = SettingsService.settings.roomDefault.roomIsAlwaysDark;

  public get roomIsAlwaysDark(): boolean {
    return this._roomIsAlwaysDark;
  }

  private _sonnenAufgangLampenDelay: number = SettingsService.settings.roomDefault.sonnenAufgangLampenDelay;

  public get sonnenAufgangLampenDelay(): number {
    return this._sonnenAufgangLampenDelay;
  }

  private _sonnenAufgangRolloDelay: number = SettingsService.settings.roomDefault.sonnenAufgangRolloDelay;

  public get sonnenAufgangRolloDelay(): number {
    return this._sonnenAufgangRolloDelay;
  }

  private _sonnenAufgangRollos: boolean = SettingsService.settings.roomDefault.sonnenAufgangRollos;

  public get sonnenAufgangRollos(): boolean {
    return this._sonnenAufgangRollos;
  }

  private _sonnenUntergangRolloAdditionalOffsetPerCloudiness: number =
    SettingsService.settings.roomDefault.sonnenUntergangRolloAdditionalOffsetPerCloudiness;

  public get sonnenUntergangRolloAdditionalOffsetPerCloudiness(): number {
    return this._sonnenUntergangRolloAdditionalOffsetPerCloudiness;
  }

  private _sonnenUntergangRolloMaxTime: iTimePair = SettingsService.settings.roomDefault.sonnenUntergangRolloMaxTime;

  public get sonnenUntergangRolloMaxTime(): iTimePair {
    return this._sonnenUntergangRolloMaxTime;
  }

  private _sonnenAufgangRolloMinTime: iTimePair = SettingsService.settings.roomDefault.sonnenAufgangRolloMinTime;

  public get sonnenAufgangRolloMinTime(): iTimePair {
    return this._sonnenAufgangRolloMinTime;
  }

  private _sonnenUntergangRolloDelay: number = SettingsService.settings.roomDefault.sonnenUntergangRolloDelay;

  public get sonnenUntergangRolloDelay(): number {
    return this._sonnenUntergangRolloDelay;
  }

  private _sonnenUntergangLampenDelay: number = SettingsService.settings.roomDefault.sonnenUntergangLampenDelay;

  public get sonnenUntergangLampenDelay(): number {
    return this._sonnenUntergangLampenDelay;
  }

  private _sonnenUntergangRollos: boolean = SettingsService.settings.roomDefault.sonnenUntergangRollos;

  public get sonnenUntergangRollos(): boolean {
    return this._sonnenUntergangRollos;
  }

  public fromPartialObject(_obj: Partial<RoomSettings>): void {
    this._ambientLightAfterSunset = _obj.ambientLightAfterSunset ?? this.ambientLightAfterSunset;
    this._lichtSonnenAufgangAus = _obj.lichtSonnenAufgangAus ?? this.lichtSonnenAufgangAus;
    this._radioUrl = _obj.radioUrl ?? this.radioUrl;
    this._rolloHeatReduction = _obj.rolloHeatReduction ?? this.rolloHeatReduction;
    this._lampenBeiBewegung = _obj.lampenBeiBewegung ?? this.lampenBeiBewegung;
    this._lightIfNoWindows = _obj.lightIfNoWindows ?? this.lightIfNoWindows;
    this._movementResetTimer = _obj.movementResetTimer ?? this.movementResetTimer;
    this._roomIsAlwaysDark = _obj.roomIsAlwaysDark ?? this.roomIsAlwaysDark;
    this._sonnenAufgangLampenDelay = _obj.sonnenAufgangLampenDelay ?? this.sonnenAufgangLampenDelay;
    this._sonnenAufgangRolloDelay = _obj.sonnenAufgangRolloDelay ?? this.sonnenAufgangRolloDelay;
    this._sonnenAufgangRollos = _obj.sonnenAufgangRollos ?? this.sonnenAufgangRollos;
    this._sonnenUntergangRolloAdditionalOffsetPerCloudiness =
      _obj.sonnenUntergangRolloAdditionalOffsetPerCloudiness ?? this.sonnenUntergangRolloAdditionalOffsetPerCloudiness;
    this._sonnenUntergangRolloMaxTime = _obj.sonnenUntergangRolloMaxTime ?? this.sonnenUntergangRolloMaxTime;
    this._sonnenAufgangRolloMinTime = _obj.sonnenAufgangRolloMinTime ?? this.sonnenAufgangRolloMinTime;
    this._sonnenUntergangRolloDelay = _obj.sonnenUntergangRolloDelay ?? this.sonnenUntergangRolloDelay;
    this._sonnenUntergangLampenDelay = _obj.sonnenUntergangLampenDelay ?? this.sonnenUntergangLampenDelay;
    this._sonnenUntergangRollos = _obj.sonnenUntergangRollos ?? this.sonnenUntergangRollos;
    super.fromPartialObject(_obj);
  }
}
