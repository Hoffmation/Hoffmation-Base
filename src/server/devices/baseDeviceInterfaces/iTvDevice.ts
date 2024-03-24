import { iRoomDevice } from './iRoomDevice';

// TODO: Add missing Comments
export interface iTvDevice extends iRoomDevice {
  readonly on: boolean;

  /**
   * Turns the TV on
   */
  turnOn(): void;

  /**
   * Turns the TV off
   */
  turnOff(): void;

  /**
   * Increases the volume of the TV
   */
  volumeUp(): void;

  /**
   * Decreases the volume of the TV
   */
  volumeDown(): void;
}
