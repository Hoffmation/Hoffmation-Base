import { DeviceType } from '../../deviceType';
import { ZigbeeDevice } from './index';
import {
  BatteryLevelChangeAction,
  CountToday,
  LogLevel,
  MotionSensorAction,
  MotionSensorSettings,
} from '../../../../models';
import { LogDebugType, Utils } from '../../../services';
import { iBatteryDevice, iMotionSensor } from '../../baseDeviceInterfaces';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { DeviceCapability } from '../../DeviceCapability';

export class ZigbeeMotionSensor extends ZigbeeDevice implements iMotionSensor, iBatteryDevice {
  /** @inheritDoc */
  public settings: MotionSensorSettings = new MotionSensorSettings();
  /** @inheritDoc */
  public detectionsToday: number = 0;
  protected _initialized: boolean = false;
  protected _movementDetectedCallback: Array<(action: MotionSensorAction) => void> = [];
  protected _needsMovementResetFallback: boolean = true;
  protected _fallBackTimeout: NodeJS.Timeout | undefined;
  protected _timeSinceLastMotion: number = 0;
  private _movementDetected: boolean = false;
  private _battery: number = -99;
  private _lastBatteryPersist: number = 0;
  private _lastBatteryLevel: number = -1;
  private _batteryLevelCallbacks: Array<(action: BatteryLevelChangeAction) => void> = [];

  public constructor(pInfo: IoBrokerDeviceInfo, type: DeviceType) {
    super(pInfo, type);
    this.deviceCapabilities.push(DeviceCapability.motionSensor);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
    if (!Utils.anyDboActive) {
      this._initialized = true;
    } else {
      Utils.dbo
        ?.motionSensorTodayCount(this)
        .then((todayCount: CountToday) => {
          this.detectionsToday = todayCount.count ?? 0;
          this.log(LogLevel.Debug, `Reinitialized movement counter with ${this.detectionsToday}`);
          this._initialized = true;
        })
        .catch((err: Error) => {
          this.log(LogLevel.Warn, `Failed to initialize movement counter, err ${err?.message ?? err}`);
        });
    }
  }

  /** @inheritDoc */
  public get lastBatteryPersist(): number {
    return this._lastBatteryPersist;
  }

  /** @inheritDoc */
  public get movementDetected(): boolean {
    if (!this.available) {
      // If the device is not available, there is no active movement
      return false;
    }

    if (Utils.nowMS() - this.lastUpdate.getTime() > 3600000) {
      // If the device has not been updated for more than an hour, there is no active movement
      return false;
    }

    return this._movementDetected;
  }

  /** @inheritDoc */
  public get battery(): number {
    return this._battery;
  }

  // Time since last motion in seconds
  /** @inheritDoc */
  public get timeSinceLastMotion(): number {
    return this._timeSinceLastMotion;
  }

  /** @inheritDoc */
  public addBatteryLevelCallback(pCallback: (action: BatteryLevelChangeAction) => void): void {
    this._batteryLevelCallbacks.push(pCallback);
  }

  /**
   * Adds a callback for when a motion state has changed.
   * @param pCallback - Function that accepts the new state as parameter
   */
  /** @inheritDoc */
  public addMovementCallback(pCallback: (action: MotionSensorAction) => void): void {
    this._movementDetectedCallback.push(pCallback);
  }

  /** @inheritDoc */
  public persistMotionSensor(): void {
    Utils.dbo?.persistMotionSensor(this);
  }

  public updateMovement(newState: boolean): void {
    if (!this._initialized && newState) {
      this.log(LogLevel.Trace, 'Movement recognized, but database initialization has not finished yet --> delay.');
      Utils.guardedTimeout(
        () => {
          this.updateMovement(newState);
        },
        1000,
        this,
      );
      return;
    }

    if (newState === this._movementDetected) {
      this.log(
        LogLevel.Debug,
        `Skip movement because state is already ${newState}`,
        LogDebugType.SkipUnchangedMovementState,
      );

      if (newState) {
        // Wenn ein Sensor sich nicht von alleine zurücksetzt, hier erzwingen.
        this.resetFallbackTimeout();
        this.startFallbackTimeout();
      }
      return;
    }

    this.resetFallbackTimeout();
    this._movementDetected = newState;
    this.persistMotionSensor();
    this.log(LogLevel.Debug, `New movement state: ${newState}`, LogDebugType.NewMovementState);

    if (newState) {
      this.startFallbackTimeout();
      this.detectionsToday++;
      this.log(LogLevel.Trace, `This is movement no. ${this.detectionsToday}`);
    }

    for (const c of this._movementDetectedCallback) {
      c(new MotionSensorAction(this));
    }
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Motion update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, pOverride);
    switch (idSplit[3]) {
      case 'battery':
        this._battery = state.val as number;
        this.checkForBatteryChange();
        this.persistBatteryDevice();
        if (this._battery < 20) {
          this.log(LogLevel.Warn, 'Das Zigbee Gerät hat unter 20% Batterie.');
        }
        break;
      case 'occupancy':
        this.log(LogLevel.Trace, `Motion sensor: Update for motion state of ${this.info.customName}: ${state.val}`);
        this.updateMovement(state.val as boolean);
        break;
      case 'no_motion':
        this.log(
          (state.val as number) < 100 ? LogLevel.Trace : LogLevel.DeepTrace,
          `Motion sensor: Update for time since last motion of ${this.info.customName}: ${state.val}`,
        );
        this._timeSinceLastMotion = state.val as number;
        break;
    }
  }

  /** @inheritDoc */
  public persistBatteryDevice(): void {
    const now: number = Utils.nowMS();
    if (this._lastBatteryPersist + 60000 > now) {
      return;
    }
    Utils.dbo?.persistBatteryDevice(this);
    this._lastBatteryPersist = now;
  }

  private resetFallbackTimeout(): void {
    if (this._fallBackTimeout) {
      this.log(LogLevel.Trace, 'Fallback Timeout zurücksetzen');
      clearTimeout(this._fallBackTimeout);
    }
  }

  private startFallbackTimeout(): void {
    if (!this._needsMovementResetFallback) {
      return;
    }
    this._fallBackTimeout = Utils.guardedTimeout(
      () => {
        this.log(LogLevel.Debug, 'Benötige Fallback Bewegungs Reset');
        this._fallBackTimeout = undefined;
        this.updateMovement(false);
      },
      270000,
      this,
    );
  }

  /**
   * Checks whether the battery level did change and if so fires the callbacks
   */
  private checkForBatteryChange(): void {
    const newLevel: number = this.battery;
    if (newLevel == -1 || newLevel == this._lastBatteryLevel) {
      return;
    }
    for (const cb of this._batteryLevelCallbacks) {
      cb(new BatteryLevelChangeAction(this));
    }
    this._lastBatteryLevel = newLevel;
  }
}
