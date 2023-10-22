import { Utils } from '../../server';
import { MotionSensorSettings } from './motionSensorSettings';

export class CameraSettings extends MotionSensorSettings {
  public alertPersonOnTelegram: boolean = false;
  public movementDetectionOnPersonOnly: boolean = false;
  public movementDetectionOnDogsToo: boolean = false;
  public hasAudio: boolean = false;

  public fromPartialObject(data: Partial<CameraSettings>): void {
    this.alertPersonOnTelegram = data.alertPersonOnTelegram ?? this.alertPersonOnTelegram;
    this.movementDetectionOnPersonOnly = data.movementDetectionOnPersonOnly ?? this.movementDetectionOnPersonOnly;
    this.movementDetectionOnDogsToo = data.movementDetectionOnDogsToo ?? this.movementDetectionOnDogsToo;
    this.hasAudio = data.hasAudio ?? this.hasAudio;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<MotionSensorSettings> {
    return Utils.jsonFilter(this);
  }
}
