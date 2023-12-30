import { ObjectSettings } from '../../objectSettings';
import { iTimePair, SettingsService } from '../../../server';

export class RoomSettings extends ObjectSettings {
  public ambientLightAfterSunset: boolean = SettingsService.settings.roomDefault.ambientLightAfterSunset;
  public lichtSonnenAufgangAus: boolean = SettingsService.settings.roomDefault.lichtSonnenAufgangAus;
  public radioUrl: string = SettingsService.settings.roomDefault.radioUrl ?? '';
  public rolloHeatReduction: boolean = SettingsService.settings.roomDefault.rolloHeatReduction;
  public lampenBeiBewegung: boolean = SettingsService.settings.roomDefault.lampenBeiBewegung;
  public lightIfNoWindows: boolean = SettingsService.settings.roomDefault.lightIfNoWindows;
  public movementResetTimer: number = SettingsService.settings.roomDefault.movementResetTimer;
  public roomIsAlwaysDark: boolean = SettingsService.settings.roomDefault.roomIsAlwaysDark;
  public sonnenAufgangLampenDelay: number = SettingsService.settings.roomDefault.sonnenAufgangLampenDelay;
  public sonnenAufgangRolloDelay: number = SettingsService.settings.roomDefault.sonnenAufgangRolloDelay;
  public sonnenAufgangRollos: boolean = SettingsService.settings.roomDefault.sonnenAufgangRollos;
  public sonnenUntergangRolloAdditionalOffsetPerCloudiness: number =
    SettingsService.settings.roomDefault.sonnenUntergangRolloAdditionalOffsetPerCloudiness;
  public sonnenUntergangRolloMaxTime: iTimePair = SettingsService.settings.roomDefault.sonnenUntergangRolloMaxTime;
  public sonnenAufgangRolloMinTime: iTimePair = SettingsService.settings.roomDefault.sonnenAufgangRolloMinTime;
  public sonnenUntergangRolloDelay: number = SettingsService.settings.roomDefault.sonnenUntergangRolloDelay;
  public sonnenUntergangLampenDelay: number = SettingsService.settings.roomDefault.sonnenUntergangLampenDelay;
  public sonnenUntergangRollos: boolean = SettingsService.settings.roomDefault.sonnenUntergangRollos;
  public includeLampsInNormalMovementLightning: boolean =
    SettingsService.settings.roomDefault.includeLampsInNormalMovementLightning;

  public fromPartialObject(_obj: Partial<RoomSettings>): void {
    this.ambientLightAfterSunset = _obj.ambientLightAfterSunset ?? this.ambientLightAfterSunset;
    this.lichtSonnenAufgangAus = _obj.lichtSonnenAufgangAus ?? this.lichtSonnenAufgangAus;
    this.radioUrl = _obj.radioUrl ?? this.radioUrl;
    this.rolloHeatReduction = _obj.rolloHeatReduction ?? this.rolloHeatReduction;
    this.lampenBeiBewegung = _obj.lampenBeiBewegung ?? this.lampenBeiBewegung;
    this.lightIfNoWindows = _obj.lightIfNoWindows ?? this.lightIfNoWindows;
    this.movementResetTimer = _obj.movementResetTimer ?? this.movementResetTimer;
    this.roomIsAlwaysDark = _obj.roomIsAlwaysDark ?? this.roomIsAlwaysDark;
    this.sonnenAufgangLampenDelay = _obj.sonnenAufgangLampenDelay ?? this.sonnenAufgangLampenDelay;
    this.sonnenAufgangRolloDelay = _obj.sonnenAufgangRolloDelay ?? this.sonnenAufgangRolloDelay;
    this.sonnenAufgangRollos = _obj.sonnenAufgangRollos ?? this.sonnenAufgangRollos;
    this.sonnenUntergangRolloAdditionalOffsetPerCloudiness =
      _obj.sonnenUntergangRolloAdditionalOffsetPerCloudiness ?? this.sonnenUntergangRolloAdditionalOffsetPerCloudiness;
    this.sonnenUntergangRolloMaxTime = _obj.sonnenUntergangRolloMaxTime ?? this.sonnenUntergangRolloMaxTime;
    this.sonnenAufgangRolloMinTime = _obj.sonnenAufgangRolloMinTime ?? this.sonnenAufgangRolloMinTime;
    this.sonnenUntergangRolloDelay = _obj.sonnenUntergangRolloDelay ?? this.sonnenUntergangRolloDelay;
    this.sonnenUntergangLampenDelay = _obj.sonnenUntergangLampenDelay ?? this.sonnenUntergangLampenDelay;
    this.sonnenUntergangRollos = _obj.sonnenUntergangRollos ?? this.sonnenUntergangRollos;
    this.includeLampsInNormalMovementLightning =
      _obj.includeLampsInNormalMovementLightning ?? this.includeLampsInNormalMovementLightning;
    super.fromPartialObject(_obj);
  }
}
