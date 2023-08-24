import { InfluxDB } from 'influx';
import { DachsInfluxDataPoint } from '../interfaces/dachsInfluxDataPoint';
import { InfluxDbConnectionOptions } from '../interfaces';

const ignoredMeasurements: string[] = ['solarcharger/History/Daily'];

/**
 * This class is highly inspired by https://github.com/victronenergy/venus-docker-grafana-images
 * Thanks guys, keep up the good work!
 */
export class DachsInfluxClient {
  private client: InfluxDB;
  private accumulatedPoints: DachsInfluxDataPoint[] = [];

  public constructor(private readonly opts: InfluxDbConnectionOptions) {
    this.client = new InfluxDB({
      host: opts.host,
      port: opts.port,
      protocol: 'http',
      database: opts.database,
      username: opts.username,
      password: opts.password,
      pool: {
        maxRetries: 5,
      },
    });

    this.client
      .getDatabaseNames()
      .then((names: string[]): void => {
        if (!names.includes(opts.database)) {
          console.log(`Creating database ${opts.database}`);
          this.client.createDatabase(opts.database).then(this.setRetention.bind(this));
        } else {
          this.setRetention();
        }
      })
      .catch((error: any): void => {
        console.error(`Error getting database names: ${error}`);
      });
  }

  private setRetention(): void {
    const retentionOpts: { duration: string; replication: number; isDefault: boolean } = {
      duration: this.opts.retentionPolicy ?? '30d',
      replication: 1,
      isDefault: true,
    };
    this.client.createRetentionPolicy('dachs', retentionOpts).catch((_error: any): void => {
      this.client.alterRetentionPolicy('dachs', retentionOpts).catch((error: any): void => {
        console.error(`Error setting retention policy: ${error}`);
      });
    });
  }

  public addMeasurementToQueue(measurement: string, data: string | number): void {
    if (ignoredMeasurements.find((path) => measurement.startsWith(path))) {
      return;
    }
    let valueKey: string = 'value';
    if (typeof data === 'string') {
      valueKey = 'stringValue';
    }
    const point = {
      timestamp: new Date(),
      measurement: measurement,
      fields: {
        [valueKey]: data,
      },
    };
    this.accumulatedPoints.push(point);
  }

  public flush(): void {
    this.client.writePoints(this.accumulatedPoints).catch((err) => {
      console.error(`Error writing to InfluxDB! ${err.stack}`);
    });
    this.accumulatedPoints = [];
  }
}
