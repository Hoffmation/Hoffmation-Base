import { AccessApi, AccessDeviceConfig, AccessEventPacket } from 'unifi-access';
import { LogLevel, LogSource } from '../../enums';
import { iDisposable, iUnifiProtectOptions } from '../../interfaces';
import { ServerLogService } from '../../logging';
import { Utils } from '../../utils';
import { UnifiLogger } from './unifi-logger';
import { OwnUnifiDoor } from './own-unifi-door';

export class UnifiAccess implements iDisposable {
  /**
   * Mapping for own devices
   */
  public static readonly ownDoors: Map<string, OwnUnifiDoor> = new Map<string, OwnUnifiDoor>();
  private readonly unifiLogger: UnifiLogger = new UnifiLogger(LogSource.UnifiAccess);
  private readonly _api: AccessApi;
  // private _deviceStates: Map<string, unknown> = new Map<string, unknown>();
  private _idMap: Map<string, string> = new Map<string, string>();
  private _lastUpdate: Date = new Date(0);

  public constructor(settings: iUnifiProtectOptions) {
    this._api = new AccessApi(this.unifiLogger);
    this.reconnect(settings);
    Utils.guardedInterval(
      () => {
        if (new Date().getTime() - this._lastUpdate.getTime() < 180 * 1000) {
          // We had an update within the last 3 minutes --> no need to reconnect
          return;
        }
        this._api.logout();
        Utils.guardedTimeout(
          () => {
            this.reconnect(settings);
          },
          5000,
          this,
        );
      },
      5 * 60 * 1000,
    );
  }

  public static addDevice(door: OwnUnifiDoor): void {
    this.ownDoors.set(door.unifiDeviceName, door);
  }

  public dispose(): void {
    this._api.logout();
  }

  private reconnect(settings: iUnifiProtectOptions): void {
    this._api
      .login(settings.nvrAddress, settings.usernameAccess, settings.password)
      .then((_loggedIn: boolean): void => {
        this.initialize();
      })
      .catch((error: unknown): void => {
        ServerLogService.writeLog(LogLevel.Error, `Unifi-Protect: Login failed: ${error}`);
      });
  }

  private async initialize(): Promise<void> {
    this.unifiLogger.info('Unifi-Access: Login successful');
    const bootstrap: boolean = await this._api.getBootstrap();
    if (!bootstrap || !this._api.bootstrap) {
      this.unifiLogger.error('Unifi-Access: Bootstrap failed');
      return;
    }
    // const info: AccessBootstrapConfigInterface = this._api.bootstrap;
    if (this._api.devices === null) {
      this.unifiLogger.error('Unifi-Access: No devices found');
      return;
    }
    for (const device of this._api.devices) {
      this.initializeDevice(device);
    }
    this._api.off('message', this.onMessage.bind(this));
    this._api.on('message', this.onMessage.bind(this));
  }

  private onMessage(packet: AccessEventPacket): void {
    const deviceConfig = packet.data as AccessDeviceConfig;
    this._lastUpdate = new Date();
    switch (deviceConfig.device_type) {
      case 'nvr':
        break;

      default:
        // this.unifiLogger.debug(`onMessage: ${JSON.stringify(packet)}`);
        // Lookup the device.
        const ownName: string | undefined = this._idMap.get(packet.event_object_id);
        if (!ownName) {
          break;
        }
        const ownDoor: OwnUnifiDoor | undefined = UnifiAccess.ownDoors.get(ownName);
        if (ownDoor !== undefined) {
          ownDoor.update(packet);
          break;
        }

        break;
    }

    // Update the internal list we maintain.
    // if (deviceConfig) {
    //   this._deviceStates.set(packet.header.id, Object.assign(this._deviceStates.get(packet.header.id) ?? {}, payload));
    // }
  }

  private initializeDevice(data: AccessDeviceConfig): void {
    if (!UnifiAccess.ownDoors.has(data.alias)) {
      ServerLogService.writeLog(LogLevel.Info, `Unifi-Protect: Ignoring camera ${data.name}`);
      return;
    }
    const door: OwnUnifiDoor = UnifiAccess.ownDoors.get(data.alias) as OwnUnifiDoor;
    door.initialize(data);
    ServerLogService.writeLog(
      LogLevel.Info,
      `Unifi-Access: ${data.name} (re)initialized with unique_id: ${data.unique_id}`,
    );
    this._idMap.set(data.unique_id, data.alias);
  }
}
