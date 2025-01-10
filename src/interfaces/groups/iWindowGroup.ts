import { iWindow } from './iWindow';
import { HandleChangeAction } from '../../action';
import {
  RoomRestoreShutterPositionCommand,
  ShutterSunriseUpCommand,
  ShutterSunsetDownCommand,
  WindowSetDesiredPositionCommand,
  WindowSetRolloByWeatherStatusCommand,
} from '../../command';
import { ITimeCallback } from '../ITimeCallback';
import { iBaseGroup } from './iBaseGroup';

export interface iWindowGroup extends iBaseGroup {
  sunriseShutterCallback: ITimeCallback | undefined;
  sunsetShutterCallback: ITimeCallback | undefined;
  readonly anyShutterDown: boolean;
  readonly anyWindowOpen: boolean;
  windows: iWindow[];

  /**
   * Adds Callbacks to each window and their handles.
   * @param cb - The callback to execute on met condition.
   */
  addHandleChangeCallback(cb: (handleChangeAction: HandleChangeAction) => void): void;

  setDesiredPosition(c: WindowSetDesiredPositionCommand): void;

  initialize(): void;

  recalcTimeCallbacks(): void;

  setRolloByWeatherStatus(c: WindowSetRolloByWeatherStatusCommand): void;

  sunriseUp(c: ShutterSunriseUpCommand): void;

  restoreShutterPosition(c: RoomRestoreShutterPositionCommand): void;

  changeVibrationMotionBlock(block: boolean): void;

  sunsetDown(c: ShutterSunsetDownCommand): void;

  reconfigureSunsetShutterCallback(): void;

  reconfigureSunriseShutterCallback(): void;
}
