import { TimeCallback } from '../timeCallback';

export interface iRoomBase {
  sonnenAufgangCallback: TimeCallback | undefined;
  sonnenUntergangCallback: TimeCallback | undefined;
  sonnenAufgangLichtCallback: TimeCallback | undefined;
  skipNextRolloUp: boolean;
  roomName: string;

  initializeBase(): void;

  persist(): void;

  recalcTimeCallbacks(): void;

  /**
   * Sets the light based on the current time, rollo Position and room Settings
   * @param movementDependant Only turn light on if there was a movement in the same room
   */
  setLightTimeBased(movementDependant: boolean): void;

  isNowLightTime(): boolean;
}
