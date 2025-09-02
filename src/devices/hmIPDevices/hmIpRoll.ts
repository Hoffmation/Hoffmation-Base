import { HmIPDevice } from './hmIpDevice';
import { iShutter, iWindow } from '../../interfaces';
import { ShutterSettings } from '../../settingsObjects';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { CommandSource, DeviceCapability, DeviceType, LogLevel } from '../../enums';
import {
  RestoreTargetAutomaticValueCommand,
  ShutterSetLevelCommand,
  WindowSetDesiredPositionCommand,
} from '../../command';
import { Utils } from '../../utils';
import { ShutterPositionChangedAction } from '../../action';
import { BlockAutomaticHandler } from '../../services';
import { ShutterUtils } from '../sharedFunctions';

export class HmIpRoll extends HmIPDevice implements iShutter {
  /** @inheritDoc */
  public settings: ShutterSettings = new ShutterSettings();

  /** @inheritDoc */
  public firstCommandRecieved: boolean = false;
  /** @inheritDoc */
  public targetAutomaticValue: number = 0;
  /** @inheritDoc */
  public blockAutomationHandler: BlockAutomaticHandler;
  /** @inheritDoc */
  public baseAutomaticLevel: number = 0;
  /** @inheritDoc */
  public lastAutomaticDownTime: number = 0;
  private _setLevelSwitchID: string;
  private _setLevel: number = -1;
  private _setLevelTime: number = -1;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpRoll);
    this.jsonOmitKeys.push('_window');
    this.deviceCapabilities.push(DeviceCapability.shutter);
    this.deviceCapabilities.push(DeviceCapability.blockAutomatic);
    this._setLevelSwitchID = `${this.info.fullID}.4.LEVEL`;
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

  private _currentLevel: number = -1;

  public get currentLevel(): number {
    if (this._setLevel !== -1 && this._currentLevel !== this._setLevel) {
      return this._setLevel;
    }
    return this._currentLevel;
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Rollo Update : ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case '3':
        if (idSplit[4] === 'LEVEL') {
          this.setCurrentLevel(state.val as number, true);
        }
        break;
    }
  }

  private _window?: iWindow;

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

  public persist(): void {
    this.dbo?.persistShutter(this);
  }

  private setCurrentLevel(value: number, initial: boolean = false): void {
    if (value !== this._setLevel && Utils.nowMS() - this._setLevelTime < 60 * 10000) {
      value = this._setLevel;
    }
    if (value !== this._currentLevel && this._window && !initial) {
      Utils.guardedNewThread(() => {
        this._window?.rolloPositionChange(new ShutterPositionChangedAction(this, value));
      }, this);
      this.persist();
    }
    this._currentLevel = value;
  }

  public setLevel(command: ShutterSetLevelCommand): void {
    ShutterUtils.setLevel(this, command);
  }

  public writePositionStateToDevice(pPosition: number): void {
    this._setLevel = pPosition;
    this.setState(this._setLevelSwitchID, pPosition);
  }

  public restoreTargetAutomaticValue(command: RestoreTargetAutomaticValueCommand): void {
    this.setLevel(new ShutterSetLevelCommand(command, this.targetAutomaticValue));
  }
}
