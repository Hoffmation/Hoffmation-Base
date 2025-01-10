import { iBaseGroup } from './iBaseGroup';
import { WindowRestoreDesiredPositionCommand, WindowSetDesiredPositionCommand } from '../../command';
import { iHandle, iMagnetSensor, iShutter, iVibrationSensor } from '../baseDevices';
import { WindowPosition } from '../../enums';
import { HandleChangeAction, ShutterPositionChangedAction } from '../../action';

export interface iWindow extends iBaseGroup {
  readonly desiredPosition: number;
  readonly anyShutterDown: boolean;
  readonly anyHandleNotClosed: boolean;

  readonly handleIds: string[];
  readonly vibrationIds: string[];
  readonly shutterIds: string[];
  readonly magnetIds: string[];

  /**
   * sets the desired Pos and moves rollo to this level
   * @param c - The command to execute
   */
  setDesiredPosition(c: WindowSetDesiredPositionCommand): void;

  getHandle(): iHandle[];

  getMagnetContact(): iMagnetSensor[];

  getShutter(): iShutter[];

  getVibration(): iVibrationSensor[];

  griffeInPosition(pPosition: WindowPosition): number;

  initialize(): void;

  rolloPositionChange(action: ShutterPositionChangedAction): void;

  restoreDesiredPosition(c: WindowRestoreDesiredPositionCommand): void;

  addHandleChangeCallback(cb: (handleChangeAction: HandleChangeAction) => void): void;
}
