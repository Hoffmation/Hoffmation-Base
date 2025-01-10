import { IConfig, TibberFeed, TibberQueryBase } from 'tibber-api';
import { iTibberSettings } from '../server';

export class TibberService {
  private static _tibberQueryBase: TibberQueryBase;

  public static get tibberQueryBase(): TibberQueryBase {
    return this._tibberQueryBase;
  }

  private static _tibberFeed: TibberFeed;

  public static get tibberFeed(): TibberFeed {
    return this._tibberFeed;
  }

  private static _settings: iTibberSettings | undefined = undefined;

  public static get settings(): iTibberSettings | undefined {
    return this._settings;
  }

  private static _active: boolean;

  public static get active(): boolean {
    return this._active;
  }

  public static initialize(settings?: iTibberSettings): void {
    const newSettings: iTibberSettings | undefined = settings ?? this.settings;
    if (newSettings === undefined) {
      this._active = false;
      return;
    }

    this._settings = newSettings;

    const config: IConfig = {
      active: true,
      // Endpoint configuration.
      apiEndpoint: {
        apiKey: newSettings.apiKey, // Demo token
        queryUrl: 'wss://api.tibber.com/v1-beta/gql/subscriptions',
      },
      // Query configuration.
      homeId: newSettings.homeId,
      timestamp: true,
      power: true,
    };

    this._tibberQueryBase = new TibberQueryBase(config, 15000);
    // Instantiate TibberFeed.
    this._tibberFeed = new TibberFeed(this.tibberQueryBase);
  }
}
