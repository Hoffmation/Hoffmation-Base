import _ from 'lodash';
import { VeluxDevice } from './veluxDevice';
import { iShutter, iWindow } from '../../interfaces';
import { ShutterSettings } from '../deviceSettings';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { CommandSource, DeviceCapability, DeviceType, LogDebugType, LogLevel, WindowPosition } from '../../enums';
import { ShutterPositionChangedAction } from '../../action';
import { ShutterSetLevelCommand, WindowSetDesiredPositionCommand } from '../../command';
import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';
import { Utils } from '../../utils';

export class VeluxShutter extends VeluxDevice implements iShutter {
  /** @inheritDoc */
  public settings: ShutterSettings = new ShutterSettings();
  private readonly _setLevelSwitchID: string;
  private _firstCommandRecieved: boolean = false;
  private _setLevel: number = -1;
  private _setLevelTime: number = -1;
  private _currentLevel: number = -1;
  private _window?: iWindow;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.VeluxShutter);
    this.deviceCapabilities.push(DeviceCapability.shutter);
    this._setLevelSwitchID = `${this.info.fullID}.targetPosition`;
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
    let targetLevel: number = command.level;
    if (!this._firstCommandRecieved && !command.isInitial) {
      this._firstCommandRecieved = true;
    }
    if (this._firstCommandRecieved && command.isInitial) {
      this.log(LogLevel.Debug, `Skipped initial Rollo to ${targetLevel} as we recieved a command already`);
      return;
    }
    if (this.currentLevel === targetLevel && !command.isForceAction) {
      this.log(
        LogLevel.Debug,
        `Skip Rollo command to Position ${targetLevel} as this is the current one, commandLog: ${command.logMessage}`,
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
    this.log(LogLevel.Debug, command.logMessage);

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
    // Level is inverted for Velux Adapter (100 = 0, 0 = 100, 25 = 75, etc.)
    this.setState(this._setLevelSwitchID, Math.abs(targetLevel - 100));
  }

  public toJSON(): Partial<IoBrokerBaseDevice> {
    return _.omit(super.toJSON(), ['_window']);
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
