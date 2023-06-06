import { Window } from '../groups';
import { iRoomDevice } from './iRoomDevice';
import { ShutterSettings } from '../../../models';

export interface iShutter extends iRoomDevice {
  settings: ShutterSettings;
  currentLevel: number;
  desiredWindowShutterLevel: number;
  window: Window | undefined;

  persist(): void;

  setLevel(pPosition: number, initial: boolean, skipOpenWarning?: boolean): void;
}
