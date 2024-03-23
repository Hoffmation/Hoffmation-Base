import { GarageDoorOpenerSettings } from '../../../models';
import { iRoomDevice } from './iRoomDevice';

// TODO: Add missing Comments
export interface iGarageDoorOpener extends iRoomDevice {
  settings: GarageDoorOpenerSettings;

  readonly isClosed: boolean;

  open(): void;

  close(): void;

  trigger(): void;
}
