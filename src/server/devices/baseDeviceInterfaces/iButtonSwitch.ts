import { Button, ButtonPosition, ButtonPressType } from '../button';
import { iRoomDevice } from './iRoomDevice';

export interface iButtonSwitch extends iRoomDevice {
  // Primarily in 4-6 Button switches
  buttonTopLeft: Button | undefined;
  // Primarily in 4-6 Button switches
  buttonTopRight: Button | undefined;

  // Primarily in 6 Button switches
  buttonMidLeft: Button | undefined;
  // Primarily in 6 Button switches
  buttonMidRight: Button | undefined;

  // Primarily in 4-6 Button switches
  buttonBotLeft: Button | undefined;
  // Primarily in 4-6 Button switches
  buttonBotRight: Button | undefined;

  // Primarily in 2 Button switches (top, bot)
  buttonBot: Button | undefined;
  // Primarily in 2 Button switches (top, bot)
  buttonTop: Button | undefined;

  /**
   * Persist the button press to the persistent storage
   * @param {string} buttonName - The name of the button
   * @param {ButtonPressType} pressType - The type of the button press
   */
  persist(buttonName: string, pressType: ButtonPressType): void;

  /**
   * @returns An description of all configured assignments
   */
  getButtonAssignment(): string;

  /**
   * Method to simulate a button press (e.g. for testing or to use a specific logic which is bound to this button)
   * @param {ButtonPosition} position - The position of the button
   * @param {ButtonPressType} pressType - The type of the button press
   */
  pressButton(position: ButtonPosition, pressType: ButtonPressType): Error | null;
}
