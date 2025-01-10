import { iObjectSettings } from './iObjectSettings';

/**
 *
 */
export interface iGroupSettings extends iObjectSettings {
  /**
   *
   */
  toJSON(): Partial<iGroupSettings>;
}
