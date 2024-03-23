import { iRoomDevice } from './iRoomDevice';

// TODO: Add missing Comments
export interface iTvDevice extends iRoomDevice {
  readonly on: boolean;

  turnOn(): void;

  turnOff(): void;

  volumeUp(): void;

  volumeDown(): void;
}
