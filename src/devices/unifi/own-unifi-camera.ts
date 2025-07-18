import { CameraDevice } from '../index';
import { ProtectCameraConfig, ProtectEventAdd, ProtectEventPacket } from 'unifi-protect';
import { CommandSource, LogLevel } from '../../enums';

export class OwnUnifiCamera extends CameraDevice {
  /**
   * The name of the camera in Unifi
   */
  public readonly unifiCameraName: string;
  /** @inheritDoc */
  public override readonly mpegStreamLink: string = '';
  /** @inheritDoc */
  public override readonly h264IosStreamLink: string = '';
  /** @inheritDoc */
  public override rtspStreamLink: string = '';
  /** @inheritDoc */
  public override readonly currentImageLink: string = '';
  // @ts-expect-error Config wird später verwendet
  private _config: ProtectCameraConfig | null = null;

  public constructor(name: string, roomName: string, unifiCameraName: string) {
    super(name, roomName);
    this.unifiCameraName = unifiCameraName;
  }

  /**
   * @inheritDoc
   */
  public update(packet: ProtectEventPacket, baseEvent?: ProtectEventAdd): void {
    this.checkForMotionUpdate(packet, baseEvent);
    this._lastUpdate = new Date();
  }

  private checkForMotionUpdate(packet: ProtectEventPacket, baseEvent?: ProtectEventAdd): void {
    const payload = packet.payload as ProtectEventAdd | ProtectCameraConfig;
    const eventAddInfo: ProtectEventAdd = baseEvent ?? (payload as ProtectEventAdd);
    const payloadAsEventAdd: ProtectEventAdd = payload as ProtectEventAdd;
    if (
      packet.header.modelKey !== 'smartDetectObject' &&
      (packet.header.modelKey !== 'event' ||
        !['smartDetectLine', 'smartDetectZone'].includes(eventAddInfo.type) ||
        !(payloadAsEventAdd.smartDetectTypes ?? []).length)
    ) {
      // this.log(LogLevel.Debug, `Ignored event: ${JSON.stringify(packet)}`);
      // this.log(LogLevel.Debug, `Ignored event initial Info: ${JSON.stringify(baseEvent)}`);
      return;
    }
    this.log(LogLevel.Debug, `Update for "${packet.header.modelKey}" to value: ${JSON.stringify(payload)}`);
    const detectedTypes: string[] =
      packet.header.modelKey === 'smartDetectObject'
        ? [payloadAsEventAdd.type]
        : (payloadAsEventAdd?.smartDetectTypes ?? []);
    for (const smartDetectType of detectedTypes) {
      switch (smartDetectType) {
        case 'licensePlate':
          this.log(
            LogLevel.Debug,
            `Detected "licensePlate": ${JSON.stringify(payloadAsEventAdd.metadata.licensePlate)}`,
          );
          break;
        case 'person':
          this.onNewPersonDetectedValue(true, CommandSource.Automatic);
          break;
      }
    }
  }

  public initialize(data: ProtectCameraConfig): void {
    this._config = data;
  }

  protected resetPersonDetectedState(): void {
    // Nothing
  }

  protected resetDogDetectedState(): void {
    // Nothing
  }

  protected resetMovementDetectedState(): void {
    // Nothing
  }
}
