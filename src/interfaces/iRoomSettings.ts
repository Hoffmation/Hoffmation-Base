import { iObjectSettings } from './settings';
import { iTimePair } from './iTimePair';
import { iTrilaterationCoordinate } from './iTrilaterationCoordinate';

/**
 *
 */
export interface iRoomSettings extends iObjectSettings {
  /**
   *
   */
  ambientLightAfterSunset: boolean;
  /**
   *
   */
  lichtSonnenAufgangAus: boolean;
  /**
   *
   */
  radioUrl: string;
  /**
   *
   */
  rolloHeatReduction: boolean;
  /**
   *
   */
  lampenBeiBewegung: boolean;
  /**
   *
   */
  lightIfNoWindows: boolean;
  /**
   *
   */
  movementResetTimer: number;
  /**
   * The custom start of night for this room
   */
  nightStart?: iTimePair;
  /**
   * The custom end of night for this room
   */
  nightEnd?: iTimePair;
  /**
   *
   */
  roomIsAlwaysDark: boolean;
  /**
   *
   */
  sonnenAufgangLampenDelay: number;
  /**
   *
   */
  sonnenAufgangRolloDelay: number;
  /**
   *
   */
  sonnenAufgangRollos: boolean;
  /**
   *
   */
  sonnenUntergangRolloAdditionalOffsetPerCloudiness: number;
  /**
   *
   */
  sonnenUntergangRolloMaxTime: iTimePair;
  /**
   *
   */
  sonnenAufgangRolloMinTime: iTimePair;
  /**
   *
   */
  sonnenUntergangRolloDelay: number;
  /**
   *
   */
  sonnenUntergangLampenDelay: number;
  /**
   *
   */
  sonnenUntergangRollos: boolean;
  /**
   *
   */
  includeLampsInNormalMovementLightning: boolean;

  /**
   * Die Startkoordinate des Raums
   */
  trilaterationStartPoint?: iTrilaterationCoordinate;
  /**
   * Die Endkoordinate des Raums
   */
  trilaterationEndPoint?: iTrilaterationCoordinate;

  /**
   *
   */
  fromPartialObject(_obj: Partial<iRoomSettings>): void;
}
