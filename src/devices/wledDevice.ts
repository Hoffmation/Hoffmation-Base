import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';
import { DeviceType } from './deviceType';
import { IoBrokerDeviceInfo } from './IoBrokerDeviceInfo';
import { iDimmableLamp } from './baseDeviceInterfaces';
import { LampUtils } from './sharedFunctions';
import { DeviceCapability } from './DeviceCapability';
import { BlockAutomaticHandler } from '../services/blockAutomaticHandler';
import { Utils } from '../utils/utils';
import { LogDebugType, LogLevel, ServerLogService } from '../logging';
import { WledSettings } from '../models/deviceSettings';
import {
  ActuatorSetStateCommand,
  ActuatorToggleCommand,
  ActuatorWriteStateToDeviceCommand,
  BlockAutomaticCommand,
  DimmerSetLightCommand,
  LampSetTimeBasedCommand,
  LampToggleLightCommand,
  RestoreTargetAutomaticValueCommand,
  WledSetLightCommand,
} from '../models/command';

export class WledDevice extends IoBrokerBaseDevice implements iDimmableLamp {
  /** @inheritDoc */
  public brightness: number = -1;
  /** @inheritDoc */
  public queuedValue: boolean | null = null;
  /** @inheritDoc */
  public settings: WledSettings = new WledSettings();
  /** @inheritDoc */
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  /** @inheritDoc */
  public targetAutomaticState: boolean = false;
  private on: boolean = false;
  protected override readonly _debounceStateDelay: number = 500;
  private readonly _onID: string;
  private readonly _presetID: string;
  private readonly _brightnessID: string;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.WledDevice);
    this._onID = `${this.info.fullID}.on`;
    this._presetID = `${this.info.fullID}.ps`;
    this._brightnessID = `${this.info.fullID}.bri`;
    this.blockAutomationHandler = new BlockAutomaticHandler(
      this.restoreTargetAutomaticValue.bind(this),
      this.log.bind(this),
    );
    this.deviceCapabilities.push(DeviceCapability.lamp);
    this.deviceCapabilities.push(DeviceCapability.dimmablelamp);
  }

  /** @inheritDoc */
  public get actuatorOn(): boolean {
    return this.on;
  }

  /** @inheritDoc */
  public restoreTargetAutomaticValue(c: RestoreTargetAutomaticValueCommand): void {
    this.setLight(new WledSetLightCommand(c, this.targetAutomaticState));
  }

  public override update(
    idSplit: string[],
    state: ioBroker.State,
    initial: boolean = false,
    _pOverride: boolean = false,
  ): void {
    this.queuedValue = null;
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Wled: ${initial ? 'Initiales ' : ''}Update für "${this.info.customName}": ID: ${idSplit.join(
        '.',
      )} JSON: ${JSON.stringify(state)}`,
    );

    switch (idSplit[3]) {
      case 'on':
        this.on = state.val as boolean;
        break;
      case 'bri':
        this.brightness = state.val as number;
        break;
    }
  }

  /** @inheritDoc */
  public setLight(c: DimmerSetLightCommand): void {
    this.setWled(
      new WledSetLightCommand(
        c,
        c.on,
        'Set Wled due to DimmerSetLightCommand',
        c.disableAutomaticCommand,
        c.brightness,
        c.transitionTime,
        undefined,
      ),
    );
  }

  public setWled(c: WledSetLightCommand): void {
    if (this._onID === '') {
      ServerLogService.writeLog(LogLevel.Error, `Keine On ID für "${this.info.customName}" bekannt.`);
      return;
    }

    if (!this.ioConn) {
      ServerLogService.writeLog(LogLevel.Error, `Keine Connection für "${this.info.customName}" bekannt.`);
      return;
    }

    const dontBlock: boolean = LampUtils.checkUnBlock(this, c);

    if (LampUtils.checkBlockActive(this, c)) {
      return;
    }
    if (c.isAutomaticAction) {
      // Preserve the target state for the automatic handler, as
      this.targetAutomaticState = c.on;
    }

    if (LampUtils.canDimmerChangeBeSkipped(this, c)) {
      return;
    }

    this.log(LogLevel.Debug, c.logMessage);

    if (c.on && c.brightness !== -1 && this.brightness < 10) {
      c.brightness = 10;
    }

    this.queuedValue = c.on;

    if (!c.on) {
      this.writeActuatorStateToDevice(new ActuatorWriteStateToDeviceCommand(c, c.on, 'WLED ausschalten'));
    } else if (c.preset !== undefined) {
      // This also turns the device on
      this.setState(this._presetID, c.preset, undefined, (err) => {
        ServerLogService.writeLog(LogLevel.Error, `WLED schalten ergab Fehler: ${err}`);
      });
    } else if (c.brightness > -1) {
      // This also turns the device on
      this.setState(this._brightnessID, c.brightness, undefined, (err) => {
        ServerLogService.writeLog(LogLevel.Error, `Dimmer Helligkeit schalten ergab Fehler: ${err}`);
      });
    }

    if (dontBlock || c.disableAutomaticCommand === null) {
      return;
    }
    if (c.disableAutomaticCommand === undefined && c.isForceAction) {
      c.disableAutomaticCommand = BlockAutomaticCommand.fromDeviceSettings(c, this.settings);
    }

    if (c.disableAutomaticCommand) {
      this.blockAutomationHandler.disableAutomatic(c.disableAutomaticCommand);
    }
  }

  public setTimeBased(c: LampSetTimeBasedCommand): void {
    this.setWled(WledSetLightCommand.byTimeBased(this.settings, c));
  }

  /** @inheritDoc */
  public persist(): void {
    Utils.dbo?.persistActuator(this);
  }

  /** @inheritDoc */
  public setActuator(command: ActuatorSetStateCommand): void {
    this.setWled(new WledSetLightCommand(command, command.on, 'Set Wled due to ActuatorSetStateCommand'));
  }

  /** @inheritDoc */
  public toggleActuator(c: ActuatorToggleCommand): boolean {
    const setActuatorCommand: ActuatorSetStateCommand = ActuatorSetStateCommand.byActuatorAndToggleCommand(this, c);
    this.setActuator(setActuatorCommand);
    return setActuatorCommand.on;
  }

  /** @inheritDoc */
  public toggleLight(c: LampToggleLightCommand): boolean {
    return LampUtils.toggleLight(this, c);
  }

  /** @inheritDoc */
  public writeActuatorStateToDevice(c: ActuatorWriteStateToDeviceCommand): void {
    this.log(LogLevel.Debug, c.logMessage, LogDebugType.SetActuator);
    this.setState(this._onID, c.stateValue, undefined, (err) => {
      ServerLogService.writeLog(LogLevel.Error, `WLED schalten ergab Fehler: ${err}`);
    });
  }
}
