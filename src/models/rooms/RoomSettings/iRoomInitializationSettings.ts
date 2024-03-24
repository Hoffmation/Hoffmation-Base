import { RoomDeviceAddingSettings } from './roomDeviceAddingSettings';

export interface iRoomInitializationSettings {
  /**
   * The settings for adding a device to the room
   */
  deviceAddingSettings?: RoomDeviceAddingSettings;
  /**
   * The short name of the room
   */
  shortName: string;
}
