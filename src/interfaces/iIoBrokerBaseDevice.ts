import { iRoomDevice } from './baseDevices';
import { DeviceType } from '../enums';
import { iIoBrokerDeviceInfo } from './IIoBrokerDeviceInfo';
import { iIOBrokerConnection } from './iIOBrokerConnection';

export interface iIoBrokerBaseDevice extends iRoomDevice {
  deviceType: DeviceType;
  readonly id: string;
  readonly info: iIoBrokerDeviceInfo;
  readonly ioConn: iIOBrokerConnection | undefined;

  update(idSplit: string[], state: ioBroker.State, initial: boolean, pOverride: boolean): void;

  /**
   * Allows to react on the state change of a given state with the passed cb
   * @param stateName - Last part of the id e.g. "available" not "zigbee.0.00158d00053d3e4b.available"
   * @param cb - Desired Callback Action, with passed ioBroker.StateValue
   */
  addIndividualStateCallback(stateName: string, cb: (val: ioBroker.StateValue) => void): void;

  /**
   * Returns whether a connection to ioBroker is established or not
   * @param showError - If true, an error message will be written to the log if the connection is not established
   * @returns Whether a connection exists
   */
  checkIoConnection(showError: boolean): boolean;

  addToCorrectRoom(): void;

  /**
   * Sets the state of a given data point and returns true if that was successful.
   * @param pointId - Data point to write to
   * @param state - Data to write
   * @param onSuccess - Callback to run on successfully written data
   * @param onError - Callback to run if an error has occurred during writing the data
   */
  setState(
    pointId: string,
    state: string | number | boolean | ioBroker.State | ioBroker.SettableState | null,
    onSuccess: (() => void) | undefined,
    onError: ((error: Error) => void) | undefined,
  ): void;
}
