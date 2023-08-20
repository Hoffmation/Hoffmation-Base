import { iRoomDevice } from './iRoomDevice';

export interface iLock extends iRoomDevice {
  readonly locked: boolean;

  open(): void;

  lock(): void;
}
