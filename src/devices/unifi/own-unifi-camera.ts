import { CameraDevice } from '../index';
import type { Camera, TypedEvent } from 'unifi-protect';
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
  // @ts-expect-error Kamera-Projektion wird später verwendet
  private _camera: Camera | null = null;

  public constructor(name: string, roomName: string, unifiCameraName: string) {
    super(name, roomName);
    this.unifiCameraName = unifiCameraName;
  }

  /**
   * Handles a realtime event the NVR attributed to this camera.
   * @param event - The typed event as classified by the NVR client
   */
  public update(event: TypedEvent): void {
    this.checkForMotionUpdate(event);
    this._lastUpdate = new Date();
  }

  private checkForMotionUpdate(event: TypedEvent): void {
    if (event.kind !== 'smartDetect' || !event.objectTypes.length) {
      // this.log(LogLevel.Debug, `Ignored event: ${JSON.stringify(event)}`);
      return;
    }
    this.log(LogLevel.Debug, `Update for "${event.kind}" to value: ${event.objectTypes.join(', ')}`);
    for (const smartDetectType of event.objectTypes) {
      switch (smartDetectType) {
        case 'licensePlate':
          this.log(LogLevel.Debug, `Detected "licensePlate" Data: ${JSON.stringify(event.metadata)}`);
          break;
        case 'person':
          this.onNewPersonDetectedValue(true, CommandSource.Automatic);
          break;
      }
    }
  }

  public initialize(camera: Camera): void {
    this._camera = camera;
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
