import { iTimePair } from '../../../server';

// These default settings can be overridden within every room
export interface iRoomDefaultSettings {
  /**
   * The default radio URL to use with speaker
   */
  readonly radioUrl?: string;

  /**
   * Use shutter to reduce warming of rooms on hot days (detected by weather service)
   */
  readonly rolloHeatReduction: boolean;

  /**
   * Indicates rooms, which are time independent always dark (like basement).
   * This results in lamps beeing turned on at motion regardless of windows and time.
   */
  readonly roomIsAlwaysDark: boolean;

  /**
   * Should lights be turned on at Movement
   */
  readonly lampenBeiBewegung: boolean;

  /**
   * Should lights be turned off after sunrise
   */
  readonly lichtSonnenAufgangAus: boolean;

  /**
   * Should shutters be closed on sunset (based on geolocation)
   */
  readonly sonnenUntergangRollos: boolean;

  /**
   * +/- Offset for shutter closing on sunset in minutes
   */
  readonly sonnenUntergangRolloDelay: number;

  /**
   * Latest time of shutter closing (regardless of geospecific sunset)
   */
  readonly sonnenUntergangRolloMaxTime: iTimePair;

  /**
   * +/- Offset for turning on lamps at movement after/before sunset
   */
  readonly sonnenUntergangLampenDelay: number;

  /**
   * !Needs Weather Data! Additional Offset in Minutes per % Cloudiness
   */
  readonly sonnenUntergangRolloAdditionalOffsetPerCloudiness: number;

  /**
   * Should shutters be opened on sunrise
   */
  readonly sonnenAufgangRollos: boolean;

  /**
   * +/- Default Offset for shutters opening on sunrise in minutes
   */
  readonly sonnenAufgangRolloDelay: number;

  /**
   * Earliest time of shutter opening (regardless of geospecific sunset)
   */
  readonly sonnenAufgangRolloMinTime: iTimePair;

  /**
   * +/- Offset for still turning on lamps at movement after/before sunrise
   */
  readonly sonnenAufgangLampenDelay: number;

  /**
   * Time in seconds after which detected movement is reseted
   */
  readonly movementResetTimer: number;

  /**
   * Should Light be turned on at day if there are no Windows configured for this room
   */
  readonly lightIfNoWindows: boolean;

  /**
   * Wether this room should always have ambient light on after sunset (regardless of motion e.g. Gardenlights).
   */
  readonly ambientLightAfterSunset: boolean;

  /**
   * Whether normal ceiling lights should also be turned on by movement, even if there are LEDs and outlets
   */
  readonly includeLampsInNormalMovementLightning: boolean;
}
