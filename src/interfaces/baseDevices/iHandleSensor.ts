import { iDisposable } from '../iDisposeable';
import { LogDebugType, LogLevel, WindowPosition } from '../../enums';
import { iWindow } from '../groups';
import { HandleChangeAction } from '../../action';

export interface iHandleSensor extends iDisposable {
  position: WindowPosition;
  minutesOpen: number;
  window: iWindow | undefined;

  updatePosition(pValue: WindowPosition): void;

  /** @inheritDoc */
  addOffenCallback(pCallback: (pValue: boolean) => void): void;

  /** @inheritDoc */
  addKippCallback(pCallback: (pValue: boolean) => void): void;

  /** @inheritDoc */
  addClosedCallback(pCallback: (pValue: boolean) => void): void;

  addHandleChangeCallback(cb: (handleChangeAction: HandleChangeAction) => void): void;

  /**
   * Persists the handle sensor state to the persistence layer
   */
  persist(): void;

  log(level: LogLevel, message: string, debugType: LogDebugType): void;

  toJSON(): Partial<iHandleSensor>;
}
