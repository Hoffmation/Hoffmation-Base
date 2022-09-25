import { TvDevice } from './tvDevice';
import { DeviceType } from '../deviceType';
import { TvDeviceType } from './tvDeviceType';
import Samsung, { KEYS } from 'samsung-tv-control';
import { LogLevel } from '../../../models';

export class SamsungTv extends TvDevice {
  public deviceType: DeviceType = DeviceType.SamsungTv;
  private _device: Samsung;

  public constructor(name: string, roomName: string, ip: string, mac: string, token: string) {
    super(name, roomName, ip, TvDeviceType.Samsung);
    this._device = new Samsung({
      debug: false,
      ip: ip,
      mac: mac,
      nameApp: 'hoffmation',
      port: 8001,
      token: token,
    });
  }

  private _on: boolean = false;

  public get on(): boolean {
    return this._on;
  }

  public override automaticCheck(): void {
    this._device
      .isAvailable()
      .then((available: boolean) => {
        this._on = available;
      })
      .catch((reason: unknown) => {
        this.log(LogLevel.Warn, `Available check failed ${reason}`);
      })
      .finally(() => {
        super.automaticCheck();
      });
  }

  public turnOff(): void {
    this.sendKey(KEYS.KEY_POWER);
  }

  public turnOn(): void {
    void this._device.turnOn();
  }

  public volumeDown(): void {
    this.sendKey(KEYS.KEY_VOLDOWN);
  }

  public volumeUp(): void {
    this.sendKey(KEYS.KEY_VOLUP);
  }

  private sendKey(key: KEYS): void {
    this._device.sendKey(key, (err, _res) => {
      if (err) {
        this.log(LogLevel.Warn, `SendKeyFailed: ${err}`);
      }
    });
  }
}
