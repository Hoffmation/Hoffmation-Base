import { ButtonPosition, ButtonPressType } from '../../enums';
import { iRoomDevice } from './iRoomDevice';
import { iButton } from './iButton';

/**
 * Interface for Button Switch devices, providing e.g. access to the buttons and their assignments.
 *
 * For devices with {@link DeviceCapability.buttonSwitch} capability.
 */
export interface iButtonSwitch extends iRoomDevice {
  /**
   * The Top-Left Button which can be found on normale 4-6 Button switches
   */
  buttonTopLeft: iButton | undefined;
  /**
   * The Top-Right Button which can be found on normale 4-6 Button switches
   */
  buttonTopRight: iButton | undefined;

  /**
   * The vertically Middle and horicontally Left Button which can be found on 6 Button switches
   */
  buttonMidLeft: iButton | undefined;
  /**
   * The vertically Middle and horicontally Right Button which can be found on 6 Button switches
   */
  buttonMidRight: iButton | undefined;

  /**
   * The Bottom-Left Button which can be found on normale 4-6 Button switches
   */
  buttonBotLeft: iButton | undefined;
  /**
   * The Bottom-Right Button which can be found on normale 4-6 Button switches
   */
  buttonBotRight: iButton | undefined;

  /**
   * The Bottom Button which can be found on vertical 2 Button switches
   */
  buttonBot: iButton | undefined;
  /**
   * The Top Button which can be found on vertical 2 Button switches
   */
  buttonTop: iButton | undefined;

  /**
   * Persist the button press to the persistent storage
   * @param buttonName - The name of the button
   * @param pressType - The type of the button press
   */
  persist(buttonName: string, pressType: ButtonPressType): void;

  /**
   * @returns An description of all configured assignments
   */
  getButtonAssignment(): string;

  /**
   * Method to simulate a button press (e.g. for testing or to use a specific logic which is bound to this button)
   * @param position - The position of the button
   * @param pressType - The type of the button press
   */
  pressButton(position: ButtonPosition, pressType: ButtonPressType): Error | null;
}
