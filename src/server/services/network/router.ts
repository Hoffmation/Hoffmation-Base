export abstract class Router {
  private static _router: Router | undefined = undefined;

  public static getRouter(): Router | undefined {
    return this._router;
  }

  protected static setRouter(router: Router) {
    this._router = router;
  }

  public abstract reconnectDeviceByMac(mac: string): Promise<boolean>;

  public abstract reconnectDeviceByIp(ip: string): Promise<boolean>;
}
