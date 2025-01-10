export abstract class Router {
  private static _router: Router | undefined = undefined;

  public static getRouter(): Router | undefined {
    return this._router;
  }

  protected static setRouter(router: Router) {
    this._router = router;
  }

  /**
   * Authorize a device to connect to the network.
   * @param {string} mac - The MAC address of the device.
   * @param {number} minutes - The number of minutes from now on the device is authorized to connect.
   * @param {number} uploadLimit - The upload limit in kbps.
   * @param {number} downloadLimit - The download limit in kbps.
   * @returns {Promise<boolean>} - True if the device was authorized, false otherwise.
   */
  public abstract authorizeDevice(
    mac: string,
    minutes: number,
    uploadLimit: number,
    downloadLimit: number,
  ): Promise<boolean>;

  public abstract reconnectDeviceByMac(mac: string): Promise<boolean>;

  public abstract reconnectDeviceByIp(ip: string): Promise<boolean>;
}
