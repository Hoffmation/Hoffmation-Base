import type { Camera, ProtectClient, TypedEvent } from 'unifi-protect';
import { loadProtectModule } from './protect-module';
import { OwnUnifiCamera } from './own-unifi-camera';
import { LogLevel, LogSource } from '../../enums';
import { iDisposable, iUnifiProtectOptions } from '../../interfaces';
import { ServerLogService } from '../../logging';
import { Utils } from '../../utils';
import { UnifiLogger } from './unifi-logger';

export class UnifiProtect implements iDisposable {
  private readonly unifiLogger: UnifiLogger = new UnifiLogger(LogSource.UnifiProtect);
  /**
   * Mapping for own devices
   */
  public static readonly ownCameras: Map<string, OwnUnifiCamera> = new Map<string, OwnUnifiCamera>();
  private _client: ProtectClient | null = null;
  private _connecting: boolean = false;
  private _disposed: boolean = false;
  private _eventAbort: AbortController | null = null;
  private _idMap: Map<string, string> = new Map<string, string>();
  private _ignoredIds: Set<string> = new Set<string>();

  public constructor(settings: iUnifiProtectOptions) {
    this.connect(settings);
    Utils.guardedInterval(
      () => {
        if (this._disposed || this._connecting || this._client !== null) {
          // Either shut down, already connecting or the client is up and recovers outages on its own.
          return;
        }
        this.connect(settings);
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Connects to the NVR. A single atomic operation which logs in, bootstraps and opens the realtime channel.
   * @param settings - The address and credentials of the NVR
   */
  private connect(settings: iUnifiProtectOptions): void {
    this._connecting = true;
    this._idMap = new Map<string, string>();
    this._ignoredIds = new Set<string>();
    loadProtectModule()
      .then((protect) =>
        protect.ProtectClient.connect({
          host: settings.nvrAddress,
          username: settings.username,
          password: settings.password,
          log: this.unifiLogger,
        }),
      )
      .then((client: ProtectClient): void => {
        this._connecting = false;
        if (this._disposed) {
          void client[Symbol.asyncDispose]();
          return;
        }
        this._client = client;
        this.initialize(client);
      })
      .catch((error: unknown): void => {
        this._connecting = false;
        ServerLogService.writeLog(LogLevel.Error, `Unifi-Protect: Login failed: ${UnifiProtect.describeError(error)}`);
      });
  }

  /**
   * Renders a typed `ProtectError` including its errno code and the whole cause chain,
   * as the message alone rarely names the actual failure.
   * @param error - The rejected value
   * @returns A single line description
   */
  private static describeError(error: unknown): string {
    if (!(error instanceof Error)) {
      return `${error}`;
    }
    const parts: string[] = [`${error.name}: ${error.message}`];
    const code: unknown = Reflect.get(error, 'code');
    if (typeof code === 'string') {
      parts.push(`code: ${code}`);
    }
    let cause: unknown = error.cause;
    while (cause instanceof Error) {
      parts.push(`caused by ${cause.name}: ${cause.message}`);
      cause = cause.cause;
    }
    return parts.join(' | ');
  }

  public dispose(): void {
    this._disposed = true;
    this._eventAbort?.abort();
    this._eventAbort = null;
    const client: ProtectClient | null = this._client;
    this._client = null;
    client?.[Symbol.asyncDispose]().catch((error: unknown): void => {
      ServerLogService.writeLog(LogLevel.Error, `Unifi-Protect: Disposal failed: ${error}`);
    });
  }

  public static addDevice(camera: OwnUnifiCamera): void {
    this.ownCameras.set((camera as OwnUnifiCamera).unifiCameraName, camera);
  }

  private initialize(client: ProtectClient): void {
    this.unifiLogger.info(`Unifi-Protect: Connected to "${client.controllerName}"`);
    for (const camera of client.cameras) {
      this.initializeCamera(camera);
    }
    void this.consumeEvents(client);
  }

  /**
   * Consumes the realtime firehose until the client is disposed or the stream dies.
   * @param client - The connected client whose event stream is consumed
   */
  private async consumeEvents(client: ProtectClient): Promise<void> {
    const abort: AbortController = new AbortController();
    this._eventAbort = abort;
    try {
      for await (const event of client.events({ signal: abort.signal })) {
        this.onEvent(client, event);
      }
    } catch (error: unknown) {
      if (!abort.signal.aborted) {
        ServerLogService.writeLog(LogLevel.Error, `Unifi-Protect: Event stream failed: ${error}`);
      }
    }
    if (this._client === client) {
      // The stream is the client's lifeline --> drop it, so the interval reconnects.
      this._client = null;
      void client[Symbol.asyncDispose]();
    }
  }

  private onEvent(client: ProtectClient, event: TypedEvent): void {
    switch (event.kind) {
      case 'bootstrapLoaded':
        for (const camera of client.cameras) {
          this.initializeCamera(camera);
        }
        break;

      case 'deviceAdded': {
        if (event.modelKey !== 'camera') {
          break;
        }
        const camera: Camera | undefined = client.camera(event.id);
        if (camera !== undefined) {
          this.initializeCamera(camera);
        }
        break;
      }

      case 'deviceRemoved':
        this._idMap.delete(event.id);
        this._ignoredIds.delete(event.id);
        break;

      case 'motionDetected':
      case 'smartDetect':
        this.forwardToCamera(event.cameraId, event);
        break;
    }
  }

  private forwardToCamera(cameraId: string, event: TypedEvent): void {
    const ownName: string | undefined = this._idMap.get(cameraId);
    if (!ownName) {
      return;
    }
    const ownCamera: OwnUnifiCamera | undefined = UnifiProtect.ownCameras.get(ownName);
    if (ownCamera === undefined) {
      return;
    }
    Utils.guardedFunction(() => {
      ownCamera.update(event);
    }, this);
  }

  private initializeCamera(camera: Camera): void {
    if (this._idMap.has(camera.id) || this._ignoredIds.has(camera.id)) {
      // Already known --> the projection is live, so there is nothing to refresh.
      return;
    }
    const name: string = camera.name;
    if (!name || !UnifiProtect.ownCameras.has(name)) {
      this._ignoredIds.add(camera.id);
      ServerLogService.writeLog(LogLevel.Info, `Unifi-Protect: Ignoring camera ${name}`);
      return;
    }
    const ownCamera: OwnUnifiCamera = UnifiProtect.ownCameras.get(name) as OwnUnifiCamera;
    ownCamera.initialize(camera);
    ServerLogService.writeLog(LogLevel.Info, `Unifi-Protect: Camera ${name} (re)initialized`);
    this._idMap.set(camera.id, name);
  }
}
