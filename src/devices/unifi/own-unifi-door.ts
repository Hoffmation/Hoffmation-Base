import {
  AccessDeviceConfig,
  AccessDeviceConfigInterface,
  AccessEventDoorbellCancel,
  AccessEventDoorbellRing,
  AccessEventPacket,
} from 'unifi-access';
import { DoorDevice } from '../DoorDevice';
import { LogLevel } from '../../enums';

export class OwnUnifiDoor extends DoorDevice {
  /**
   * The name of the unifi device as written in Unifi-Access
   */
  public readonly unifiDeviceName: string;
  // @ts-expect-error Config wird später verwendet
  private _config: AccessDeviceConfigInterface | null = null;
  private _lastDoorbellRingRequestId: string | null = null;

  public constructor(name: string, roomName: string, unifiDeviceName: string) {
    super(name, roomName);
    this.unifiDeviceName = unifiDeviceName;
  }

  public update(packet: AccessEventPacket): void {
    this.checkForDingUpdate(packet);
    this._lastUpdate = new Date();
  }

  public initialize(data: AccessDeviceConfig): void {
    this._config = data;
  }

  protected resetDingActiveState(): void {
    // Nothing
  }

  private checkForDingUpdate(packet: AccessEventPacket) {
    switch (packet.event) {
      case 'access.data.device.remote_unlock':
        this.log(LogLevel.Debug, `Device ${this.unifiDeviceName} was unlocked`);
        return;
      case 'access.logs.add':
        const event: AccessLogEvent = packet.data as AccessLogEvent;
        if (
          event._source.authentication?.credential_provider === 'BUTTON_DOOR_BELL' &&
          event._source.event.type === 'access.door.unlock'
        ) {
          // this.log(LogLevel.Debug, `Ding Event details: ${Util.inspect(event, false, 5)}`);
          this.onNewDingActiveValue(true);
        }
        return;
      case 'access.remote_view':
        const ringEvent: AccessEventDoorbellRing = packet.data as AccessEventDoorbellRing;
        this._lastDoorbellRingRequestId = ringEvent.request_id;
        this.onNewDingActiveValue(true);
        return;
      case 'access.remote_view.change':
        const cancelEvent: AccessEventDoorbellCancel = packet.data as AccessEventDoorbellCancel;
        if (
          cancelEvent.remote_call_request_id === this._lastDoorbellRingRequestId &&
          this._lastDoorbellRingRequestId !== null
        ) {
          this._lastDoorbellRingRequestId = null;
          this.onNewDingActiveValue(false);
        }
        return;
      case 'access.data.device.update':
      default:
        return;
    }
  }
}

type AccessLogEvent = {
  tag: string;
  _source: {
    actor: {
      id: string;
      type: string;
      display_name: string;
    };
    authentication?: {
      credential_provider: string;
    };
    event: {
      display_message: string;
      log_key: string;
      published: number;
      result: string;
      type: 'access.door.unlock';
    };
  };
};
