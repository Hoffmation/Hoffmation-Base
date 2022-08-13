import { FensterPosition } from '../models';
import { iBaseDevice } from './iBaseDevice';

export interface iHandleSensor extends iBaseDevice {
  position: FensterPosition;
  minutesOpen: number;

  addOffenCallback(pCallback: (pValue: boolean) => void): void;

  addKippCallback(pCallback: (pValue: boolean) => void): void;

  addClosedCallback(pCallback: (pValue: boolean) => void): void;
}
