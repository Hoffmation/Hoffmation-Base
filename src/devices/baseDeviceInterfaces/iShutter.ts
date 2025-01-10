import { Window } from '../groups';
import { iRoomDevice } from './iRoomDevice';
import { ShutterSettings } from '../../models/deviceSettings';
import { ShutterSetLevelCommand } from '../../models/command';

/**
 * This interface represents a shutter device.
 *
 * For devices with {@link DeviceCapability.shutter} capability.
 */
export interface iShutter extends iRoomDevice {
  /**
   * The settings for the shutter
   */
  settings: ShutterSettings;
  /**
   * The current level of the shutter (0 = closed, 100 = open)
   */
  readonly currentLevel: number;
  /**
   * The desired level of the shutter for this window (this might be different from the current level due to the desired level being set by the user)
   */
  desiredWindowShutterLevel: number;
  /**
   * The window this shutter is located within
   */
  window: Window | undefined;

  /**
   * Persists the current information of the shutter to the database
   */
  persist(): void;

  /**
   * Sets the level of the shutter
   * @param command - The command to execute
   */
  setLevel(command: ShutterSetLevelCommand): void;
}
