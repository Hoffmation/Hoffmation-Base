import { TimeCallback } from '../timeCallback';
import { RoomSetLightTimeBasedCommand } from '../command';

export interface iRoomBase {
  sunriseShutterCallback: TimeCallback | undefined;
  sunsetShutterCallback: TimeCallback | undefined;
  sonnenAufgangLichtCallback: TimeCallback | undefined;
  sonnenUntergangLichtCallback: TimeCallback | undefined;
  skipNextRolloUp: boolean;
  roomName: string;

  initializeBase(): void;

  persist(): void;

  recalcTimeCallbacks(): void;

  setLightTimeBased(c: RoomSetLightTimeBasedCommand): void;

  isNowLightTime(): boolean;
}
