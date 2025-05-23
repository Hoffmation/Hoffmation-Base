import { iLoadMeter } from '../../interfaces/baseDevices/iLoadMeter';
import { ZigbeeActuator } from './BaseDevices';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability, DeviceType, LogLevel } from '../../enums';

export class ZigbeeUbisysActuator extends ZigbeeActuator implements iLoadMeter {
  private _loadPower: number = 0;
  protected readonly _actuatorOnStateIdState: string;

  /**
   * Creates an instance of {@link DeviceType.ZigbeeUbisysActuator} or a derived class like {@link ZigbeeUbisysLampe}
   * @param pInfo - Device creation information
   * @param deviceType - The device type (if not {@link DeviceType.ZigbeeUbisysActuator})
   */
  public constructor(pInfo: IoBrokerDeviceInfo, deviceType: DeviceType = DeviceType.ZigbeeUbisysActuator) {
    super(pInfo, deviceType);
    this.deviceCapabilities.push(DeviceCapability.loadMetering);
    this._actuatorOnStateIdState = `${pInfo.fullID}.state`;
  }

  /** @inheritDoc */
  public get loadPower(): number {
    return this._loadPower;
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    switch (idSplit[3]) {
      case 'load_power':
        const newLoadPower: number = state.val as number;
        this.log(
          Math.abs(newLoadPower - this._loadPower) > 0.25 ? LogLevel.Trace : LogLevel.DeepTrace,
          `Outlet update, new current load power: ${state.val}`,
        );
        this._loadPower = newLoadPower;
        break;
    }
    super.update(idSplit, state, initial, true);
  }
}
