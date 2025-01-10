import { iRoomDevice } from './iRoomDevice';
import { MagnetPosition } from '../../enums';

/**
 * This interface represents a magnet sensor device.
 *
 * For devices with {@link DeviceCapability.magnetSensor} capability.
 */
export interface iMagnetSensor extends iRoomDevice {
  /**
   * The current state of the Magnet Contact
   */
  position: MagnetPosition;
  /**
   * Whether a telegram message should be sent when the magnet contact is opened
   */
  telegramOnOpen: boolean;
  /**
   * Whether to announce when the magnet contact is opened using {@link iSpeaker}
   */
  speakOnOpen: boolean;

  /**
   * Add a callback that is called when the magnet contact is opened
   * @param pCallback - The callback to fire
   */
  addOpenCallback(pCallback: (pValue: boolean) => void): void;

  /**
   * Add a callback that is called when the magnet contact is closed
   * @param pCallback - The callback to fire
   */
  addClosedCallback(pCallback: (pValue: boolean) => void): void;
}
