import { iRoomAddDeviceItem } from './iRoomAddDeviceItem';
import { DeviceType } from '../enums';
import { iRoomBase } from './iRoomBase';

export interface iRoomDeviceAddingSettings {
  devices: iRoomAddDeviceItem[][];
  RoomName: string;

  addDevice(
    deviceType: DeviceType,
    setID: (value: string) => iRoomBase,
    index: number,
    customName: string | undefined,
  ): void;

  checkMissing(): void;
}
