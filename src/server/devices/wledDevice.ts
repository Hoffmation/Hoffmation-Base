import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';
import { DeviceType } from './deviceType';
import { ServerLogService, Utils } from '../services';
import {
  ActuatorSetStateCommand,
  ActuatorToggleCommand,
  CollisionSolving,
  DimmerSetLightCommand,
  LampSetTimeBasedCommand,
  LampToggleLightCommand,
  LogLevel,
  RestoreTargetAutomaticValueCommand,
  WledSetLightCommand,
  WledSettings,
} from '../../models';
import { IoBrokerDeviceInfo } from './IoBrokerDeviceInfo';
import { iDimmableLamp } from './baseDeviceInterfaces/iDimmableLamp';
import { BlockAutomaticHandler } from '../services/blockAutomaticHandler';
import { LampUtils } from './sharedFunctions';

export class WledDevice extends IoBrokerBaseDevice implements iDimmableLamp {
  public on: boolean = false;
  public brightness: number = -1;
  public battery: number = -1;
  public queuedValue: boolean | null = null;
  public settings: WledSettings = new WledSettings();
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  public targetAutomaticState: boolean = false;
  private readonly _onID: string;
  private readonly _presetID: string;
  private readonly _brightnessID: string;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.WledDevice);
    this._onID = `${this.info.fullID}.on`;
    this._presetID = `${this.info.fullID}.ps`;
    this._brightnessID = `${this.info.fullID}.bri`;
    this.blockAutomationHandler = new BlockAutomaticHandler(this.restoreTargetAutomaticValue.bind(this));
  }

  public get actuatorOn(): boolean {
    return this.on;
  }

  public get lightOn(): boolean {
    return this.on;
  }

  public restoreTargetAutomaticValue(c: RestoreTargetAutomaticValueCommand): void {
    this.log(LogLevel.Debug, c.logMessage);
    this.setLight(new WledSetLightCommand(c, this.targetAutomaticState, 'Lampen RestoreTargetAutomaticValue'));
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

  public setLight(c: DimmerSetLightCommand): void {
    this.setWled(
      new WledSetLightCommand(
        c,
        c.on,
        'Set Wled due to DimmerSetLightCommand',
        c.timeout,
        c.brightness,
        c.transitionTime,
        undefined,
      ),
    );
  }

  public setWled(c: WledSetLightCommand): void {
    this.log(LogLevel.Debug, c.logMessage);
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

    if (c.on && c.brightness !== -1 && this.brightness < 10) {
      c.brightness = 10;
    }

    ServerLogService.writeLog(
      LogLevel.Debug,
      `WLED Schalten: "${this.info.customName}" An: ${c.on}\tHelligkeit: ${c.brightness}%`,
    );

    this.queuedValue = c.on;
    this.setState(this._onID, c.on, undefined, (err) => {
      ServerLogService.writeLog(LogLevel.Error, `WLED schalten ergab Fehler: ${err}`);
    });

    if (c.preset !== undefined) {
      this.setState(this._presetID, c.preset, undefined, (err) => {
        ServerLogService.writeLog(LogLevel.Error, `WLED schalten ergab Fehler: ${err}`);
      });
    } else if (c.brightness > -1) {
      this.setState(this._brightnessID, c.brightness, undefined, (err) => {
        ServerLogService.writeLog(LogLevel.Error, `Dimmer Helligkeit schalten ergab Fehler: ${err}`);
      });
    }

    if (c.timeout !== undefined && c.timeout > -1 && !dontBlock) {
      this.blockAutomationHandler.disableAutomatic(c.timeout, CollisionSolving.overrideIfGreater);
    }
  }

  public setTimeBased(c: LampSetTimeBasedCommand): void {
    this.log(LogLevel.Debug, `Wled setTimeBased ${c.time}`);
    this.setWled(WledSetLightCommand.byTimeBased(this.settings, c));
  }

  public persist(): void {
    Utils.dbo?.persistActuator(this);
  }

  public setActuator(command: ActuatorSetStateCommand): void {
    this.setWled(new WledSetLightCommand(command, command.on, 'Set Wled due to ActuatorSetStateCommand'));
  }

  public toggleActuator(c: ActuatorToggleCommand): boolean {
    const setActuatorCommand: ActuatorSetStateCommand = ActuatorSetStateCommand.byActuatorAndToggleCommand(this, c);
    this.setActuator(setActuatorCommand);
    return setActuatorCommand.on;
  }

  public toggleLight(c: LampToggleLightCommand): boolean {
    return LampUtils.toggleLight(this, c);
  }
}
