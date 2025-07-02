import { iRoomDevice } from './iRoomDevice';
import { iTemporaryDisableAutomatic } from './iTemporaryDisableAutomatic';
import { ShutterSetLevelCommand } from '../../command';
import { iWindow } from '../groups';
import { iShutterSettings } from '../settings/iShutterSettings';

/**
 * This interface represents a shutter device.
 *
 * For devices with {@link DeviceCapability.shutter} capability.
 */
export interface iShutter extends iRoomDevice, iTemporaryDisableAutomatic {
  /**
   * Whether the first command has been received
   */
  firstCommandRecieved: boolean;
  /**
   * The settings for the shutter
   */
  settings: iShutterSettings;
  /**
   * The current level of the shutter (0 = closed, 100 = open)
   */
  readonly currentLevel: number;
  /**
   * The target level of the shutter (0 = closed, 100 = open)
   */
  targetAutomaticValue: number;
  /**
   * The desired level of the shutter for this window (this might be different from the current level due to the desired level being set by the user)
   */
  desiredWindowShutterLevel: number;
  /**
   * The window this shutter is located within
   */
  window: iWindow | undefined;

  /**
   * Persists the current information of the shutter to the database
   */
  persist(): void;

  /**
   * Sets the level of the shutter
   * @param command - The command to execute
   */
  setLevel(command: ShutterSetLevelCommand): void;

  /**
   * Moves the shutter to a specific position
   * @param pPosition
   */
  writePositionStateToDevice(pPosition: number): void;
}
