import { iBaseGroup } from './iBaseGroup';
import { iSpeaker } from '../baseDevices';

/**
 *
 */
export interface iSpeakerGroup extends iBaseGroup {
  /**
   *
   */
  getOwnSonosDevices(): iSpeaker[];

  /**
   *
   */
  playRadio(radioUrl: string): void;

  /**
   *
   */
  turnOff(): void;

  /**
   *
   */
  trigger(track: string): void;
}
