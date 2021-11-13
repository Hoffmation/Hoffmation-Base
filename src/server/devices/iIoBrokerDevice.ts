import { DeviceInfo } from './DeviceInfo';
import { IOBrokerConnection } from '../ioBroker/connection';

export abstract class ioBrokerBaseDevice {
  private _ioConnection?: IOBrokerConnection;

  protected constructor(private _info: DeviceInfo) {}

  /**
   * Getter info
   * @return {TradFriInfo}
   */
  public get info(): DeviceInfo {
    return this._info;
  }

  /**
   * Setter info
   * @param {TradFriInfo} value
   */
  public set info(value: DeviceInfo) {
    this._info = value;
  }

  /**
   * Getter ioConn
   * @return {IOBrokerConnection}
   */
  public get ioConn(): IOBrokerConnection | undefined {
    return this._ioConnection;
  }

  /**
   * Setter ioConn
   * @param {IOBrokerConnection} value
   */
  public set ioConn(value: IOBrokerConnection | undefined) {
    this._ioConnection = value;
  }

  protected abstract addToCorrectRoom(): void;

  protected abstract update(idSplit: string[], state: ioBroker.State, initial: boolean, pOverride: boolean): void;
}
