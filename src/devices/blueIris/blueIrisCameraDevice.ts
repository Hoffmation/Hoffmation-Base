import { CameraDevice } from '../CameraDevice';
import { BlueIrisCoordinator } from './blueIrisCoordinator';
import { LogLevel } from '../../enums';
import { ioBrokerMain } from '../../ioBroker';
import { SettingsService } from '../../settings-service';

export class BlueIrisCameraDevice extends CameraDevice {
  /**
   * The name of the camera in BlueIris
   */
  public readonly blueIrisName: string;
  /** @inheritDoc */
  public override readonly mpegStreamLink: string = '';
  /** @inheritDoc */
  public override readonly h264IosStreamLink: string = '';
  /** @inheritDoc */
  public override readonly rtspStreamLink: string = '';
  /** @inheritDoc */
  public override readonly currentImageLink: string = '';
  private _personDetectedStateId: string | undefined = undefined;
  private _dogDetectedStateId: string | undefined = undefined;
  private _movementDetectedStateId: string | undefined = undefined;

  public constructor(mqttName: string, roomName: string, blueIrisName: string) {
    super(mqttName, roomName);
    this.blueIrisName = blueIrisName;
    BlueIrisCoordinator.addDevice(this, mqttName);
    const blueIrisSettings = SettingsService.settings.blueIris;
    if (blueIrisSettings !== undefined) {
      this.mpegStreamLink = `${blueIrisSettings.serverAddress}/mjpg/${this.blueIrisName}/video.mjpg?user=${blueIrisSettings.username}&pw=${blueIrisSettings.password}`;
      this.h264IosStreamLink = `${blueIrisSettings.serverAddress}/h264/${this.blueIrisName}/temp.m?user=${blueIrisSettings.username}&pw=${blueIrisSettings.password}`;
      this.rtspStreamLink = `rtsp://${blueIrisSettings.username}:${
        blueIrisSettings.password
      }@${blueIrisSettings.serverAddress.replace('http://', '')}:80/${this.blueIrisName}`;
      this.currentImageLink = `${blueIrisSettings.serverAddress}/image/${this.blueIrisName}.jpg?q=100&s=100&user=${blueIrisSettings.username}&pw=${blueIrisSettings.password}`;
    }
  }

  /**
   * Inform this camera of state updates within iOBroker
   * @param idSplit - The id split of the state
   * @param state - The state that has been updated
   */
  public update(idSplit: string[], state: ioBroker.State): void {
    const stateName = idSplit[4];
    switch (stateName) {
      case 'MotionDetected':
        this._movementDetectedStateId = idSplit.join('.');
        this.onNewMotionDetectedValue((state.val as number) === 1);
        break;
      case 'PersonDetected':
        this._personDetectedStateId = idSplit.join('.');
        const newValue: boolean = (state.val as number) === 1;
        this.onNewPersonDetectedValue(newValue);
        break;
      case 'DogDetected':
        this._dogDetectedStateId = idSplit.join('.');
        const newDogDetectionVal: boolean = (state.val as number) === 1;
        this.log(LogLevel.Debug, `Update for "${stateName}" to value: ${state.val}`);
        this.onNewDogDetectionValue(newDogDetectionVal);
        break;
      case 'MotionSnapshot':
        this.onNewImageSnapshot(state.val as string);
        break;
    }
  }

  protected resetPersonDetectedState(): void {
    if (this._personDetectedStateId !== undefined) {
      ioBrokerMain.iOConnection?.setState(this._personDetectedStateId, { val: 0, ack: true });
    }
  }

  protected resetDogDetectedState(): void {
    if (this._dogDetectedStateId !== undefined) {
      ioBrokerMain.iOConnection?.setState(this._dogDetectedStateId, { val: 0, ack: true });
    }
  }

  protected resetMovementDetectedState(): void {
    if (this._movementDetectedStateId !== undefined) {
      ioBrokerMain.iOConnection?.setState(this._movementDetectedStateId, { val: 0, ack: true });
    }
  }
}
