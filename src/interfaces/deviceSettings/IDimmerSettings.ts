import { iActuatorSettings } from './iActuatorSettings';
import { DimmerSetLightCommand, LampSetTimeBasedCommand } from '../../command';

/**
 *
 */
export interface iDimmerSettings extends iActuatorSettings {
  /**
   *
   */
  nightBrightness: number;
  /**
   *
   */
  dawnBrightness: number;
  /**
   *
   */
  duskBrightness: number;
  /**
   *
   */
  dayBrightness: number;
  /**
   *
   */
  turnOnThreshhold: number;

  /**
   *
   */
  fromPartialObject(data: Partial<iDimmerSettings>): void;

  /**
   *
   */
  toJSON(): Partial<iDimmerSettings>;

  /**
   *
   */
  buildDimmerSetLightCommand(c: LampSetTimeBasedCommand): DimmerSetLightCommand;
}
