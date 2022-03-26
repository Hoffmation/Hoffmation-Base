import { IDeviceUpdater } from '../devices/iDeviceUpdater';
import { ServerLogService } from '../services/log-service/log-service';
import { Utils } from '../services/utils/utils';
import { ConnectionCallbacks } from '../../models/connectionCallbacks';
import { DeviceUpdater } from '../devices/deviceUpdater';
import { IOBrokerConnection } from './connection';
import { SettingsService } from '../services/settings-service';
import { LogLevel } from '../../models/logLevel';
import { TimeCallbackService } from '../services/time-callback-service';
import { iRoomBase } from '../../models/rooms/iRoomBase';

export class ioBrokerMain {
  public static iOConnection: IOBrokerConnection | undefined;
  private static roomConstructors: { [roomName: string]: { new (): iRoomBase } } = {};
  private servConn: IOBrokerConnection;
  private deviceUpdater: IDeviceUpdater;
  private states: Record<string, ioBroker.State> = {};
  private connectionCallbacks: ConnectionCallbacks;

  public static addRoomConstructor(roomName: string, constr: { new (): iRoomBase }): void {
    if (ioBrokerMain.roomConstructors[roomName] !== undefined) {
      ServerLogService.writeLog(LogLevel.Error, `Konstruktor für Raum mit Namen "${roomName}" bereits hinzugefügt`);
      return;
    }
    ioBrokerMain.roomConstructors[roomName] = constr;
  }

  public constructor(pDeviceUpdater: DeviceUpdater) {
    this.deviceUpdater = pDeviceUpdater;
    this.connectionCallbacks = new ConnectionCallbacks();
    this.initConnCallbacks();

    this.servConn = new IOBrokerConnection(
      {
        name: '', // optional - default 'vis.0'
        connLink: SettingsService.settings.ioBrokerUrl, // optional URL of the socket.io adapter
        socketSession: '', // optional - used by authentication
      },
      this.connectionCallbacks,
    );

    ioBrokerMain.iOConnection = this.servConn;
    ioBrokerMain.initRooms();
  }

  private static initRooms(): void {
    ServerLogService.writeLog(LogLevel.Info, `Recieved ioConnection initializing rooms now.`);
    for (const key in ioBrokerMain.roomConstructors) {
      new ioBrokerMain.roomConstructors[key]();
    }
  }

  private initConnCallbacks(): void {
    this.connectionCallbacks.onObjectChange = (pId: string, pObj: ioBroker.Object) => {
      Utils.guardedNewThread(() => {
        this.deviceUpdater.updateObject(pId, pObj);
      }, this);
    };

    this.connectionCallbacks.onConnChange = (isConnected: boolean) => {
      if (!isConnected) {
        console.log('disconnected');
        return;
      }

      console.log('connected');
      this.servConn.getStates(null, (err, _states) => {
        if (err !== null && err !== undefined) {
          ServerLogService.writeLog(LogLevel.Info, `Iobroker Error: ${err?.message ?? err}\n${err.stack}`);
        }
        if (_states === undefined) {
          return;
        }
        ServerLogService.writeLog(LogLevel.Debug, `Im initialen GetStates Callback`);

        let count = 0;
        for (const id in _states) {
          this.deviceUpdater.updateState(id, _states[id], true);
          count++;
        }
        console.log('Received ' + count + ' states.');
        this.states = _states;
        TimeCallbackService.performCheck();
        TimeCallbackService.performCheck();
      });
    };
    this.connectionCallbacks.onRefresh = () => {
      //
    };

    this.connectionCallbacks.onUpdate = (id: string, state: ioBroker.State) => {
      Utils.guardedNewThread(() => {
        // console.log('NEW VALUE of ' + id + ': ' + JSON.stringify(state));
        this.states[id] = state;
        this.deviceUpdater.updateState(id, state);
      }, this);
    };

    this.connectionCallbacks.onError = (err: any) => {
      console.log(`Cannot execute ${err.command} for ${err.arg}, because of insufficient permissions`);
    };
  }
}
