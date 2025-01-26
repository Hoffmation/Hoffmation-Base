import { HmIPDevice } from './hmIpDevice';
import { iShutter, iWindow } from '../../interfaces';
import { ShutterSettings } from '../../settingsObjects';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { CommandSource, DeviceCapability, DeviceType, LogDebugType, LogLevel, WindowPosition } from '../../enums';
import { ShutterSetLevelCommand, WindowSetDesiredPositionCommand } from '../../command';
import { Utils } from '../../utils';
import { ShutterPositionChangedAction } from '../../action';

export class HmIpRoll extends HmIPDevice implements iShutter {
  /** @inheritDoc */
  public settings: ShutterSettings = new ShutterSettings();
  private _setLevelSwitchID: string;
  private _firstCommandRecieved: boolean = false;
  private _setLevel: number = -1;
  private _setLevelTime: number = -1;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpRoll);
    this.jsonOmitKeys.push('_window');
    this.deviceCapabilities.push(DeviceCapability.shutter);
    this._setLevelSwitchID = `${this.info.fullID}.4.LEVEL`;
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
    let targetLevel: number = command.level;
    if (!this._firstCommandRecieved && !command.isInitial) {
      this._firstCommandRecieved = true;
    }
    if (this._firstCommandRecieved && command.isInitial) {
      this.log(LogLevel.Debug, `Skipped initial Rollo to ${targetLevel} as we recieved a command already`);
      return;
    }
    if (this.currentLevel === targetLevel && !command.isForceAction) {
      this.logCommand(
        command,
        `Skip Rollo command to Position ${targetLevel} as this is the current one`,
        LogDebugType.SkipUnchangedRolloPosition,
      );
      return;
    }
    if (this._setLevelSwitchID === '') {
      this.log(LogLevel.Error, 'Keine Switch ID bekannt.');
      return;
    }

    if (!this.checkIoConnection(true)) {
      return;
    }
    this.logCommand(command);

    if (this._window !== undefined) {
      if (this._window.griffeInPosition(WindowPosition.open) > 0 && command.level < 100) {
        if (!command.skipOpenWarning) {
          this.log(LogLevel.Alert, 'Not closing the shutter, as the window is open!');
        }
        return;
      }
      if (this._window.griffeInPosition(WindowPosition.tilted) > 0 && targetLevel < 50) {
        targetLevel = 50;
        if (!command.skipOpenWarning) {
          this.log(LogLevel.Alert, 'Not closing the shutter, as the window is half open!');
        }
      }
    }

    this._setLevel = targetLevel;
    this.log(LogLevel.Debug, `Fahre Rollo auf Position ${targetLevel}`);
    this.setState(this._setLevelSwitchID, targetLevel);
  }
}
