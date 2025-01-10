/**
 *
 */
export interface iDeviceInfo {
  /**
   *
   */
  fullName: string;
  /**
   *
   */
  room: string;
  /**
   *
   */
  allDevicesKey?: string;
  /**
   *
   */
  customName: string;

  /**
   *
   */
  toJSON(): Partial<iDeviceInfo>;
}
