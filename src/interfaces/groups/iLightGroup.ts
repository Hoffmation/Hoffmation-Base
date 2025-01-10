import { iBaseGroup } from './iBaseGroup';
import { ITimeCallback } from '../ITimeCallback';
import { iActuator, iLamp, iWledDevice } from '../baseDevices';
import { iLedRgbCct } from '../baseDevices/iLedRgbCct';
import {
  ActuatorSetStateCommand,
  LampSetLightCommand,
  LampSetTimeBasedCommand,
  LedSetLightCommand,
  LightGroupSwitchTimeConditionalCommand,
  WledSetLightCommand,
} from '../../command';

/**
 *
 */
export interface iLightGroup extends iBaseGroup {
  /**
   *
   */
  sonnenAufgangLichtCallback: ITimeCallback | undefined;
  /**
   *
   */
  sonnenUntergangLichtCallback: ITimeCallback | undefined;

  /**
   *
   */
  anyLightsOn(): boolean;

  /**
   *
   */
  getLights(): iLamp[];

  /**
   *
   */
  getLED(): iLedRgbCct[];

  /**
   *
   */
  getWled(): iWledDevice[];

  /**
   *
   */
  getOutlets(): iActuator[];

  /**
   *
   */
  getAllAsActuator(): iActuator[];

  /**
   *
   */
  handleSunriseOff(): void;

  /**
   *
   */
  switchAll(c: ActuatorSetStateCommand): void;

  /**
   *
   */
  switchTimeConditional(c: LightGroupSwitchTimeConditionalCommand): void;

  /**
   *
   */
  setAllLampen(c: LampSetLightCommand): void;

  /**
   *
   */
  setAllLampenTimeBased(c: LampSetTimeBasedCommand): void;

  /**
   *
   */
  setAllOutlets(c: ActuatorSetStateCommand): void;

  /**
   *
   */
  setAllActuatorsTimeBased(c: LampSetTimeBasedCommand): void;

  /**
   *
   */
  setAllLED(c: LedSetLightCommand): void;

  /**
   *
   */
  setAllWled(c: WledSetLightCommand): void;

  /**
   *
   */
  initialize(): void;

  /**
   *
   */
  recalculateTimeCallbacks(): void;

  /**
   *
   */
  reconfigureSunriseTimeCallback(): void;

  /**
   *
   */
  reconfigureSunsetTimeCallback(): void;

  /**
   *
   */
  ambientLightStartCallback(): void;
}
