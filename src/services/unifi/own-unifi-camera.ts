import { CameraDevice } from '../../devices';
import { ProtectCameraConfig } from 'unifi-protect';

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
  public update(): void {
    // const stateName = idSplit[4];
    // switch (stateName) {
    //   case 'MotionDetected':
    //     this._movementDetectedStateId = idSplit.join('.');
    //     this.onNewMotionDetectedValue((state.val as number) === 1);
    //     break;
    //   case 'PersonDetected':
    //     this._personDetectedStateId = idSplit.join('.');
    //     const newValue: boolean = (state.val as number) === 1;
    //     this.onNewPersonDetectedValue(newValue);
    //     break;
    //   case 'DogDetected':
    //     const newDogDetectionVal: boolean = (state.val as number) === 1;
    //     this.log(LogLevel.Debug, `Update for "${stateName}" to value: ${state.val}`);
    //     this.onNewDogDetectionValue(newDogDetectionVal);
    //     break;
    //   case 'MotionSnapshot':
    //     this.onNewImageSnapshot(state.val as string);
    //     break;
    // }
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
