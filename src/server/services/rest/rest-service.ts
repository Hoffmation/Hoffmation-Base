import { iRestSettings } from '../../config/iConfig';
import { Express } from 'express';
import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models/logLevel';
import { Devices } from '../../devices/devices';
import { RoomBase } from '../../../models/rooms/RoomBase';

export class RestService {
  private static _app: Express;

  public static initialize(app: Express, config: iRestSettings): void {
    this._app = app;
    this._app.get('/isAlive', (_req, res) => {
      res.send(`Hoffmation-Base active ${new Date()}`);
    });

    this._app.listen(config.expressPort, () => {
      ServerLogService.writeLog(LogLevel.Info, `Example app listening at http://localhost:${config.expressPort}`);
    });

    this._app.get('/devices', (_req, res) => {
      return res.send(Devices.alLDevices);
    });

    this._app.get('/rooms', (_req, res) => {
      return res.send(RoomBase.Rooms);
    });

    app.get('/rooms/:roomId', (req, res) => {
      return res.send(RoomBase.Rooms[req.params.roomId]);
    });
  }
}
