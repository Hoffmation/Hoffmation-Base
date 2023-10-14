import { GarageDoorOpenerSettings } from '../../../models';
import { iRoomDevice } from './iRoomDevice';

export interface iGarageDoorOpener extends iRoomDevice {
  settings: GarageDoorOpenerSettings;

  readonly isClosed: boolean;

  open(): void;

  close(): void;

  trigger(): void;
}
