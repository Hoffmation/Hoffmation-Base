import { iRoomDevice } from './iRoomDevice';

export interface iTvDevice extends iRoomDevice {
  readonly on: boolean;

  turnOn(): void;

  turnOff(): void;

  volumeUp(): void;

  volumeDown(): void;
}
