import { iNukiSettings } from '../../config';
import { HTTPSService } from '../https-service';
import { HTTPSOptions } from '../HTTPSOptions';

export class NukiService {
  public static settings: iNukiSettings;
  public static active: boolean = false;

  public static initialize(settings?: iNukiSettings): void {
    if (!settings && this.settings === undefined) {
      this.active = false;
      return;
    }
    this.settings = settings;
    this.active = true;
  }

  public static async getSmartLockData(lockId: string): Promise<any> {
    const promise = new Promise<any>((resolve, reject) => {
      HTTPSService.request(
        new HTTPSOptions('api.nuki.io', `/smartlock/${lockId}`, {}, 'GET', 443),
        '',
        5,
        (data: string, statuscode: number) => {
          if (statuscode !== 200) {
            reject(`Error ${statuscode} while getting smartlock data`);
            return;
          }
          resolve(JSON.parse(data));
        },
      );
    });
    return promise;
  }
}
