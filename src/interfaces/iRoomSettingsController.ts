import { iRoomDefaultSettings } from './settings';
import { iSunTimeOffsets } from './iSunTimeOffsets';
import { iRoomSettings } from './iRoomSettings';
import { iTimePair } from './iTimePair';
import { iRoomBase } from './iRoomBase';

/**
 *
 */
export interface iRoomSettingsController extends iRoomDefaultSettings {
  /**
   *
   */
  roomName: string;
  /**
   *
   */
  rolloOffset: iSunTimeOffsets;
  /**
   *
   */
  lampOffset: iSunTimeOffsets;
  /**
   *
   */
  readonly settingsContainer: iRoomSettings;
  /**
   *
   */
  readonly lichtSonnenAufgangAus: boolean;
  /**
   *
   */
  readonly ambientLightAfterSunset: boolean;
  /**
   *
   */
  readonly rolloHeatReduction: boolean;
  /**
   *
   */
  readonly sonnenAufgangRollos: boolean;
  /**
   *
   */
  readonly sonnenUntergangRolloMaxTime: iTimePair;
  /**
   *
   */
  readonly sonnenAufgangRolloMinTime: iTimePair;
  /**
   *
   */
  readonly lightIfNoWindows: boolean;
  /**
   *
   */
  readonly lampenBeiBewegung: boolean;
  /**
   *
   */
  readonly sonnenUntergangRollos: boolean;
  /**
   *
   */
  readonly movementResetTimer: number;

  /**
   * The custom start of night for this room
   */
  readonly nightStart?: iTimePair;
  /**
   * The custom end of night for this room
   */
  readonly nightEnd?: iTimePair;
  /**
   *
   */
  readonly sonnenUntergangRolloDelay: number;
  /**
   *
   */
  readonly sonnenUntergangLampenDelay: number;
  /**
   *
   */
  readonly sonnenUntergangRolloAdditionalOffsetPerCloudiness: number;
  /**
   *
   */
  readonly sonnenAufgangRolloDelay: number;
  /**
   *
   */
  readonly sonnenAufgangLampenDelay: number;
  /**
   *
   */
  readonly roomIsAlwaysDark: boolean;
  /**
   *
   */
  readonly radioUrl: string;
  /**
   *
   */
  readonly includeLampsInNormalMovementLightning: boolean;
  /**
   *
   */
  readonly room: iRoomBase | undefined;

  /**
   *
   */
  toJSON(): Partial<iRoomSettingsController>;

  /**
   *
   */
  onSettingChange(): void;

  /**
   *
   */
  recalcRolloOffset(): void;

  /**
   *
   */
  recalcLampOffset(): void;
}
