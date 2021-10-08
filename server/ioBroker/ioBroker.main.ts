import { LogLevel } from '../../models/logLevel';
import { Devices } from '../devices/devices';
import { DeviceUpdater } from '../devices/deviceUpdater';
import { IDeviceUpdater } from '../devices/iDeviceUpdater';
import { ServerLogService } from '../services/log-service';
import { TimeCallbackService } from '../services/time-callback-service';
import { IOBrokerConnection } from './connection';
import { ConnectionCallbacks } from '../../models/connectionCallbacks';
import { RoomBase } from '../../models/rooms/RoomBase';
import { Utils } from '../services/utils/utils';
import { SettingsService } from "../services/settings-service";

export class ioBrokerMain {
  private static roomConstructors: { [roomName: string]: { new (): RoomBase } } = {};
  private servConn: IOBrokerConnection;
  private deviceUpdater: IDeviceUpdater;
  private states: Record<string, ioBroker.State> = {};
  private connectionCallbacks: ConnectionCallbacks;

  public static addRoomConstructor(roomName: string, constr: { new (): RoomBase }): void {
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

    Devices.addIoConnection(this.servConn);
    ioBrokerMain.initRooms();
  }

  private static initRooms(): void {
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
