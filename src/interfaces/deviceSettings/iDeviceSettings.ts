import { iBlockAutomaticSettings, iExcessEnergyConsumerSettings, iObjectSettings } from '../settings';
import { BlockAutomaticCommand, iBaseCommand } from '../../command';

/**
 *
 */
export interface iDeviceSettings extends iObjectSettings {
  /**
   *
   */
  energySettings: iExcessEnergyConsumerSettings | undefined;

  /**
   * The position of the device in the room in meters
   * @default {x: 0, y: 0, z: 0}
   */
  trilaterationRoomPosition: { x: number; y: number; z: number };

  /**
   *
   */
  blockAutomaticSettings: iBlockAutomaticSettings | undefined;
  /**
   *
   */
  skipInHomebridge: boolean;

  /**
   *
   */
  fromPartialObject(_obj: Partial<iDeviceSettings>): void;

  /**
   *
   */
  toJSON(): Partial<iDeviceSettings>;

  /**
   *
   */
  buildBlockAutomaticCommand(c: iBaseCommand): BlockAutomaticCommand | null | undefined;
}
