import { iRoomBase } from './iRoomBase';

export interface iRoomAddDeviceItem {
  setID: (value: string) => iRoomBase | undefined;
  index: number;
  customName: string;
  added: boolean;
}
