import { FensterPosition } from '../models';
import { iRoomDevice } from './iRoomDevice';

export interface iHandleSensor extends iRoomDevice {
  position: FensterPosition;
  minutesOpen: number;

  addOffenCallback(pCallback: (pValue: boolean) => void): void;

  addKippCallback(pCallback: (pValue: boolean) => void): void;

  addClosedCallback(pCallback: (pValue: boolean) => void): void;
}
