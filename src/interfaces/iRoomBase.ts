import { RoomSetLightTimeBasedCommand } from '../command';
import {
  iHeatGroup,
  iLightGroup,
  iPresenceGroup,
  iSmokeGroup,
  iSpeakerGroup,
  iWaterGroup,
  iWindowGroup,
} from './groups';
import { LogLevel } from '../enums';

import { iRoomSettingsController } from './iRoomSettingsController';
import { iIdHolder } from './iIdHolder';
import { iDeviceCluster } from './iDevicecluster';
import { ITimeCallback } from './ITimeCallback';
import { iTrilaterationPoint } from './iTrilaterationPoint';

/**
 * This interface represents a room with it's base functionality.
 * Whilst accessing the custom rooms can be beneficial for direct device interaction, this provides interactions to e.g. device groups.
 */
export interface iRoomBase extends iIdHolder {
  /**
   *
   */
  WindowGroup?: iWindowGroup;
  /**
   *
   */
  LightGroup?: iLightGroup;
  /**
   *
   */
  WaterGroup?: iWaterGroup;
  /**
   *
   */
  SmokeGroup?: iSmokeGroup;
  /**
   *
   */
  SonosGroup?: iSpeakerGroup;
  /**
   *
   */
  deviceCluster: iDeviceCluster;
  /**
   *
   */
  etage?: number;
  /**
   *
   */
  settings: iRoomSettingsController;
  /**
   *
   */
  PraesenzGroup: iPresenceGroup | undefined;
  /**
   *
   */
  HeatGroup: iHeatGroup | undefined;
  /**
   * The time-callback for controlling shutters at sunrise
   */
  sunriseShutterCallback: ITimeCallback | undefined;
  /**
   * The time-callback for controlling shutters at sunset
   */
  sunsetShutterCallback: ITimeCallback | undefined;
  /**
   * The time-callback for controlling light at sunrise
   */
  sonnenAufgangLichtCallback: ITimeCallback | undefined;
  /**
   * The time-callback for controlling light at sunset
   */
  sonnenUntergangLichtCallback: ITimeCallback | undefined;

  /**
   * The bot-left corner of the room in 2D/3D Map
   */
  startPoint?: iTrilaterationPoint;
  /**
   * The top-right corner of the room in 2D/3D Map
   */
  endPoint?: iTrilaterationPoint;

  /**
   *
   */
  log(level: LogLevel, message: string): unknown;

  /**
   * Whether the next sunset shutter-up should be skipped (afterwards this resets to false)
   */
  skipNextRolloUp: boolean;
  /**
   * The name of the room
   */
  roomName: string;

  /**
   * The custom name of the room
   */
  customName: string;

  /**
   * This function initializes the roomBase object of this room
   */
  initializeBase(): void;

  /**
   * This function stores the roominformation to the database
   */
  persist(): void;

  /**
   * This function recalculates the ITimeCallbacks (e.g. sunset, sunrise handling)
   */
  recalcTimeCallbacks(): void;

  /**
   * This function sets the light in the room based on the command
   * @param c - The command to execute
   */
  setLightTimeBased(c: RoomSetLightTimeBasedCommand): void;

  /**
   * This function checks if it is now light time respecting the room settings, the current time and the daylight hours for this location.
   * @returns
   */
  isNowLightTime(): boolean;
}
