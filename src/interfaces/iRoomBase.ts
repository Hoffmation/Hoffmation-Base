import { RoomSetLightTimeBasedCommand } from '../command';
import { DeviceCluster, HeatGroup, LightGroup, SmokeGroup, SpeakerGroup, WaterGroup, WindowGroup } from '../devices';
import { iIdHolder, ITimeCallback } from './index';
import { iPresenceGroup } from './groups/IPresenceGroup';
import { LogLevel } from '../enums';

import { iRoomSettingsController } from './iRoomSettingsController';

/**
 * This interface represents a room with it's base functionality.
 * Whilst accessing the custom rooms can be beneficial for direct device interaction, this provides interactions to e.g. device groups.
 */
export interface iRoomBase extends iIdHolder {
  // TODO: Interface bauen
  WindowGroup?: WindowGroup;
  // TODO: Interface bauen
  LightGroup?: LightGroup;
  // TODO: Interface bauen
  WaterGroup?: WaterGroup;
  // TODO: Interface bauen
  SmokeGroup?: SmokeGroup;
  // TODO: Interface bauen
  SonosGroup?: SpeakerGroup;
  // TODO: Interface bauen
  deviceCluster: DeviceCluster;
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
  HeatGroup: HeatGroup | undefined;
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
