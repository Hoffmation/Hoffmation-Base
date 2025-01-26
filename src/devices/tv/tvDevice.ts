import _ from 'lodash';
import { DeviceCapability, DeviceType, TvDeviceType } from '../../enums';
import { iTvDevice } from '../../interfaces';
import { TvSettings } from '../../settingsObjects';
import { DeviceInfo } from '../DeviceInfo';
import { Utils } from '../../utils';
import { RoomBaseDevice } from '../RoomBaseDevice';

export abstract class TvDevice extends RoomBaseDevice implements iTvDevice {
  /** @inheritDoc */
  public settings: TvSettings = new TvSettings();
  /**
   * @inheritDoc
   */
  public deviceCapabilities: DeviceCapability[] = [DeviceCapability.tv];

  protected constructor(
    name: string,
    roomName: string,
    public ip: string,
    public tvDeviceType: TvDeviceType,
    deviceType: DeviceType,
  ) {
    const info = new DeviceInfo();
    info.fullName = `TV ${name}`;
    info.customName = `${roomName} ${name}`;
    info.room = roomName;
    const allDevicesKey = `tv-${roomName}-${name}`;
    info.allDevicesKey = allDevicesKey;
    super(info, deviceType);
    this.deviceCapabilities.push(DeviceCapability.tv);
    Utils.guardedInterval(this.automaticCheck, 60000, this, false);
  }

  public get name(): string {
    return this.info.customName;
  }

  public get id(): string {
    return this.info.allDevicesKey ?? `ac-${this.info.room}-${this.info.customName}`;
  }

  public abstract get on(): boolean;

  public abstract volumeDown(): void;

  public abstract volumeUp(): void;

  public abstract turnOn(): void;

  public abstract turnOff(): void;

  public turnOffDueToMissingEnergy(): void {
    this.turnOff();
  }

  public automaticCheck(): void {
    // TODO: Implement automatic turn off
  }

  public toJSON(): Partial<TvDevice> {
    // eslint-disable-next-line
    const result: any = _.omit(super.toJSON() as Partial<TvDevice>, ['room']);
    result['on'] = this.on;
    return Utils.jsonFilter(result);
  }
}
