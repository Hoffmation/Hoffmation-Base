import { iRoomSettings, iTimePair, iTrilaterationCoordinate } from '../../../interfaces';
import { SettingsService } from '../../../settings-service';
import { ObjectSettings } from '../../../settingsObjects';

export class RoomSettings extends ObjectSettings implements iRoomSettings {
  /**
   * Whether this room should always have ambient light on after sunset (regardless of motion e.g. Gardenlights).
   */
  public ambientLightAfterSunset: boolean = SettingsService.settings.roomDefault.ambientLightAfterSunset;
  /**
   * Should lights be turned off after sunrise
   */
  public lichtSonnenAufgangAus: boolean = SettingsService.settings.roomDefault.lichtSonnenAufgangAus;
  /**
   * The default radio URL to use with speaker
   */
  public radioUrl: string = SettingsService.settings.roomDefault.radioUrl ?? '';
  /**
   * Use shutter to reduce warming of rooms on hot days (detected by weather service)
   */
  public rolloHeatReduction: boolean = SettingsService.settings.roomDefault.rolloHeatReduction;
  /**
   * Should lights be turned on at Movement
   */
  public lampenBeiBewegung: boolean = SettingsService.settings.roomDefault.lampenBeiBewegung;
  /**
   * Should Light be turned on at day if there are no Windows configured for this room
   */
  public lightIfNoWindows: boolean = SettingsService.settings.roomDefault.lightIfNoWindows;
  /**
   * Time in seconds after which detected movement is reseted
   */
  public movementResetTimer: number = SettingsService.settings.roomDefault.movementResetTimer;
  /** @inheritDoc */
  public nightStart?: iTimePair;
  /** @inheritDoc */
  public nightEnd?: iTimePair;
  /**
   * Indicates rooms, which are time independent always dark (like basement).
   * This results in lamps beeing turned on at motion regardless of windows and time.
   */
  public roomIsAlwaysDark: boolean = SettingsService.settings.roomDefault.roomIsAlwaysDark;
  /**
   * +/- Offset for still turning on lamps at movement after/before sunrise
   */
  public sonnenAufgangLampenDelay: number = SettingsService.settings.roomDefault.sonnenAufgangLampenDelay;
  /**
   * +/- Default Offset for shutters opening on sunrise in minutes
   */
  public sonnenAufgangRolloDelay: number = SettingsService.settings.roomDefault.sonnenAufgangRolloDelay;
  /**
   * Should shutters be opened on sunrise
   */
  public sonnenAufgangRollos: boolean = SettingsService.settings.roomDefault.sonnenAufgangRollos;
  /**
   * !Needs Weather Data! Additional Offset in Minutes per % Cloudiness
   */
  public sonnenUntergangRolloAdditionalOffsetPerCloudiness: number =
    SettingsService.settings.roomDefault.sonnenUntergangRolloAdditionalOffsetPerCloudiness;
  /**
   * Latest time of shutter closing (regardless of geospecific sunset)
   */
  public sonnenUntergangRolloMaxTime: iTimePair = SettingsService.settings.roomDefault.sonnenUntergangRolloMaxTime;
  /**
   * Earliest time of shutter opening (regardless of geospecific sunset)
   */
  public sonnenAufgangRolloMinTime: iTimePair = SettingsService.settings.roomDefault.sonnenAufgangRolloMinTime;
  /**
   * +/- Offset for shutter closing on sunset in minutes
   */
  public sonnenUntergangRolloDelay: number = SettingsService.settings.roomDefault.sonnenUntergangRolloDelay;
  /**
   * +/- Offset for turning on lamps at movement after/before sunset
   */
  public sonnenUntergangLampenDelay: number = SettingsService.settings.roomDefault.sonnenUntergangLampenDelay;
  /**
   * Should shutters be closed on sunset (based on geolocation)
   */
  public sonnenUntergangRollos: boolean = SettingsService.settings.roomDefault.sonnenUntergangRollos;
  /**
   * Whether normal ceiling lights should also be turned on by movement, even if there are LEDs and outlets
   */
  public includeLampsInNormalMovementLightning: boolean =
    SettingsService.settings.roomDefault.includeLampsInNormalMovementLightning;
  /** @inheritDoc */
  public trilaterationStartPoint?: iTrilaterationCoordinate;
  /** @inheritDoc */
  public trilaterationEndPoint?: iTrilaterationCoordinate;

  public fromPartialObject(_obj: Partial<RoomSettings>): void {
    this.ambientLightAfterSunset = _obj.ambientLightAfterSunset ?? this.ambientLightAfterSunset;
    this.lichtSonnenAufgangAus = _obj.lichtSonnenAufgangAus ?? this.lichtSonnenAufgangAus;
    this.radioUrl = _obj.radioUrl ?? this.radioUrl;
    this.rolloHeatReduction = _obj.rolloHeatReduction ?? this.rolloHeatReduction;
    this.lampenBeiBewegung = _obj.lampenBeiBewegung ?? this.lampenBeiBewegung;
    this.lightIfNoWindows = _obj.lightIfNoWindows ?? this.lightIfNoWindows;
    this.nightStart = _obj.nightStart ?? this.nightStart;
    this.nightEnd = _obj.nightEnd ?? this.nightEnd;
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
    this.trilaterationEndPoint = _obj.trilaterationEndPoint ?? this.trilaterationEndPoint;
    this.trilaterationStartPoint = _obj.trilaterationStartPoint ?? this.trilaterationStartPoint;
    this.includeLampsInNormalMovementLightning =
      _obj.includeLampsInNormalMovementLightning ?? this.includeLampsInNormalMovementLightning;
    super.fromPartialObject(_obj);
  }
}
