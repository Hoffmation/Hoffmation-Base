import { MotionSensorSettings } from './motionSensorSettings';
import { Utils } from '../../utils/utils';

export class CameraSettings extends MotionSensorSettings {
  /**
   * Whether to alert detected persons via telegram.
   */
  public alertPersonOnTelegram: boolean = false;
  /**
   * Whether to ignore all movement except for persons.
   */
  public movementDetectionOnPersonOnly: boolean = false;
  /**
   * Whether to also react on movement off dogs.
   */
  public movementDetectionOnDogsToo: boolean = false;
  /**
   * Whether the camera has audio.
   */
  public hasAudio: boolean = false;
  /**
   * Whether the camera has a speaker.
   */
  public hasSpeaker: boolean = false;

  public fromPartialObject(data: Partial<CameraSettings>): void {
    this.alertPersonOnTelegram = data.alertPersonOnTelegram ?? this.alertPersonOnTelegram;
    this.movementDetectionOnPersonOnly = data.movementDetectionOnPersonOnly ?? this.movementDetectionOnPersonOnly;
    this.movementDetectionOnDogsToo = data.movementDetectionOnDogsToo ?? this.movementDetectionOnDogsToo;
    this.hasAudio = data.hasAudio ?? this.hasAudio;
    this.hasAudio = data.hasSpeaker ?? this.hasSpeaker;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<MotionSensorSettings> {
    return Utils.jsonFilter(this);
  }
}
