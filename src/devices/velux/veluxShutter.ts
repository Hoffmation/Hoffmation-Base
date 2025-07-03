import { VeluxDevice } from './veluxDevice';
import { iShutter, iTemporaryDisableAutomatic, iWindow } from '../../interfaces';
import { ShutterSettings } from '../../settingsObjects';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { CommandSource, DeviceCapability, DeviceType, LogLevel } from '../../enums';
import { ShutterPositionChangedAction } from '../../action';
import {
  RestoreTargetAutomaticValueCommand,
  ShutterSetLevelCommand,
  WindowSetDesiredPositionCommand,
} from '../../command';
import { Utils } from '../../utils';
import { ShutterUtils } from '../sharedFunctions';
import { BlockAutomaticHandler } from '../../services';

export class VeluxShutter extends VeluxDevice implements iShutter, iTemporaryDisableAutomatic {
  /** @inheritDoc */
  public settings: ShutterSettings = new ShutterSettings();
  private readonly _setLevelSwitchID: string;
  /** @inheritDoc */
  public firstCommandRecieved: boolean = false;
  /** @inheritDoc */
  public targetAutomaticValue: number = 0;
  /** @inheritDoc */
  public baseAutomaticLevel: number = 0;
  private _setLevel: number = -1;
  private _setLevelTime: number = -1;
  private _currentLevel: number = -1;
  private _window?: iWindow;
  /** @inheritDoc */
  public blockAutomationHandler: BlockAutomaticHandler;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.VeluxShutter);
    this.jsonOmitKeys.push('_window');
    this.deviceCapabilities.push(DeviceCapability.shutter);
    this._setLevelSwitchID = `${this.info.fullID}.targetPosition`;
    this.blockAutomationHandler = new BlockAutomaticHandler(
      this.restoreTargetAutomaticValue.bind(this),
      this.log.bind(this),
    );
    this.dbo?.getLastDesiredPosition(this).then((val) => {
      if (val.desiredPosition === -1) {
        return;
      }
      this._window?.setDesiredPosition(
        new WindowSetDesiredPositionCommand(
          CommandSource.Automatic,
          val.desiredPosition,
          'Found persisted last desired position in DB',
        ),
      );
    });
  }

  public get currentLevel(): number {
    if (this._setLevel !== -1 && this._currentLevel !== this._setLevel) {
      return this._setLevel;
    }
    return this._currentLevel;
  }

  public get window(): iWindow | undefined {
    return this._window;
  }

  public set window(value: iWindow | undefined) {
    this._window = value;
  }

  public get desiredWindowShutterLevel(): number {
    if (this._window === undefined) {
      return -1;
    }
    return this._window.desiredPosition;
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Rollo Update : ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[4]) {
      case 'currentPosition':
        this.setCurrentLevel(state.val as number, true);
        break;
    }
  }

  public persist(): void {
    this.dbo?.persistShutter(this);
  }

  public setLevel(command: ShutterSetLevelCommand): void {
    ShutterUtils.setLevel(this, command);
  }

  public writePositionStateToDevice(pPosition: number): void {
    this._setLevel = pPosition;
    // Level is inverted for Velux Adapter (100 = 0, 0 = 100, 25 = 75, etc.)
    this.setState(this._setLevelSwitchID, Math.abs(pPosition - 100));
  }

  public restoreTargetAutomaticValue(command: RestoreTargetAutomaticValueCommand): void {
    this.setLevel(new ShutterSetLevelCommand(command, this.targetAutomaticValue));
  }

  private setCurrentLevel(value: number, initial: boolean = false): void {
    let correctedValue: number = Math.abs(value - 100);
    if (correctedValue !== this._setLevel && Utils.nowMS() - this._setLevelTime < 60 * 10000) {
      correctedValue = this._setLevel;
    }
    if (correctedValue !== this._currentLevel && this._window && !initial) {
      Utils.guardedNewThread(() => {
        this._window?.rolloPositionChange(new ShutterPositionChangedAction(this, correctedValue));
      }, this);
      this.persist();
    }
    this._currentLevel = correctedValue;
  }
}
