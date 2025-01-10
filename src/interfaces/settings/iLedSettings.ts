import { iDimmerSettings } from '../deviceSettings';
import { LampSetTimeBasedCommand, LedSetLightCommand } from '../../command';

/**
 *
 */
export interface iLedSettings extends iDimmerSettings {
  /**
   *
   */
  defaultColor: string;
  /**
   *
   */
  dayColor: string;
  /**
   *
   */
  dayColorTemp: number;
  /**
   *
   */
  dawnColor: string;
  /**
   *
   */
  dawnColorTemp: number;
  /**
   *
   */
  duskColor: string;
  /**
   *
   */
  duskColorTemp: number;
  /**
   *
   */
  nightColor: string;
  /**
   *
   */
  nightColorTemp: number;

  /**
   *
   */
  buildLedSetLightCommand(c: LampSetTimeBasedCommand): LedSetLightCommand;
}
