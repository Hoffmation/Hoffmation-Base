import { Utils } from '../../server';
import { MotionSensorSettings } from './motionSensorSettings';

export class CameraSettings extends MotionSensorSettings {
  public alertPersonOnTelegram: boolean = false;
  public movementDetectionOnPersonOnly: boolean = false;

  public fromPartialObject(data: Partial<CameraSettings>): void {
    this.alertPersonOnTelegram = data.alertPersonOnTelegram ?? this.alertPersonOnTelegram;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<MotionSensorSettings> {
    return Utils.jsonFilter(this);
  }
}
