import { WindowPosition } from '../models';
import { iRoomDevice } from './iRoomDevice';

export interface iHandleSensor extends iRoomDevice {
  /**
   * The current position of the handle
   */
  position: WindowPosition;
  /**
   * The time the handle was open in minutes
   */
  minutesOpen: number;

  /**
   * Add a callback that is called when the handle is change to open
   * @param {(pValue: boolean) => void} pCallback - The callback to fire
   */
  addOffenCallback(pCallback: (pValue: boolean) => void): void;

  /**
   * Add a callback that is called when the handle is changed to ajar
   * @param {(pValue: boolean) => void} pCallback - The callback to fire
   */
  addKippCallback(pCallback: (pValue: boolean) => void): void;

  /**
   * Add a callback that is called when the handle is changed to closed
   * @param {(pValue: boolean) => void} pCallback - The callback to fire
   */
  addClosedCallback(pCallback: (pValue: boolean) => void): void;
}
