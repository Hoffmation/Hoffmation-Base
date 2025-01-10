import { iDimmerSettings } from '../deviceSettings';

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
}
