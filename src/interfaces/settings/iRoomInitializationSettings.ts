import { RoomDeviceAddingSettings } from '../../models';

/**
 * The settings for initializing a room (after Devices are generated) to add devices to the room
 */
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
