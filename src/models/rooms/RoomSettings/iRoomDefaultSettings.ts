import { iTimePair } from '../../../server';

/**
 * Default settings for a room, which can then be overwritten by the room settings for each specific room
 */
export interface iRoomDefaultSettings {
  /**
   * @see RoomSettings.radioUrl
   */
  readonly radioUrl?: string;

  /**
   * @see RoomSettings.rolloHeatReduction
   */
  readonly rolloHeatReduction: boolean;

  /**
   * @see RoomSettings.roomIsAlwaysDark
   */
  readonly roomIsAlwaysDark: boolean;

  /**
   * @see RoomSettings.lampenBeiBewegung
   */
  readonly lampenBeiBewegung: boolean;

  /**
   * @see RoomSettings.lichtSonnenAufgangAus
   */
  readonly lichtSonnenAufgangAus: boolean;

  /**
   * @see RoomSettings.sonnenUntergangRollos
   */
  readonly sonnenUntergangRollos: boolean;

  /**
   * @see RoomSettings.sonnenUntergangRolloDelay
   */
  readonly sonnenUntergangRolloDelay: number;

  /**
   * @see RoomSettings.sonnenUntergangRolloMaxTime
   */
  readonly sonnenUntergangRolloMaxTime: iTimePair;

  /**
   * @see RoomSettings.sonnenUntergangLampenDelay
   */
  readonly sonnenUntergangLampenDelay: number;

  /**
   * @see RoomSettings.sonnenUntergangRolloAdditionalOffsetPerCloudiness
   */
  readonly sonnenUntergangRolloAdditionalOffsetPerCloudiness: number;

  /**
   * @see RoomSettings.sonnenUntergangRollos
   */
  readonly sonnenAufgangRollos: boolean;

  /**
   * @see RoomSettings.sonnenAufgangRolloDelay
   */
  readonly sonnenAufgangRolloDelay: number;

  /**
   * @see RoomSettings.sonnenAufgangRolloMinTime
   */
  readonly sonnenAufgangRolloMinTime: iTimePair;

  /**
   * @see RoomSettings.sonnenAufgangLampenDelay
   */
  readonly sonnenAufgangLampenDelay: number;

  /**
   * @see RoomSettings.movementResetTimer
   */
  readonly movementResetTimer: number;

  /**
   * @see RoomSettings.lightIfNoWindows
   */
  readonly lightIfNoWindows: boolean;

  /**
   * @see RoomSettings.ambientLightAfterSunset
   */
  readonly ambientLightAfterSunset: boolean;

  /**
   * @see RoomSettings.includeLampsInNormalMovementLightning
   */
  readonly includeLampsInNormalMovementLightning: boolean;
}
