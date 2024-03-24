import { DeviceUpdater, IDeviceUpdater } from '../devices';
import { ServerLogService, SettingsService, TimeCallbackService, Utils } from '../services';
import { ConnectionCallbacks, iRoomBase, LogLevel } from '../../models';
import { IOBrokerConnection } from './connection';

export class ioBrokerMain {
  private static readonly SplitKeys: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  /**
   * The connection to the ioBroker server
   */
  public static iOConnection: IOBrokerConnection | undefined;
  private static roomConstructors: { [roomName: string]: { new (): iRoomBase } } = {};
  private servConn: IOBrokerConnection;
  private deviceUpdater: IDeviceUpdater;
  private states: Record<string, ioBroker.State> = {};
  private connectionCallbacks: ConnectionCallbacks;

  public constructor(pDeviceUpdater: DeviceUpdater) {
    this.deviceUpdater = pDeviceUpdater;
    this.connectionCallbacks = new ConnectionCallbacks();
    this.initConnCallbacks();

    this.servConn = new IOBrokerConnection(
      {
        name: '', // optional - default 'vis.0'
        connLink: SettingsService.settings.ioBroker?.ioBrokerUrl ?? SettingsService.settings.ioBrokerUrl,
        socketSession: '', // optional - used by authentication
      },
      this.connectionCallbacks,
    );

    ioBrokerMain.iOConnection = this.servConn;
    ioBrokerMain.initRooms();
  }

  public static addRoomConstructor(roomName: string, constr: { new (): iRoomBase }): void {
    if (ioBrokerMain.roomConstructors[roomName] !== undefined) {
      ServerLogService.writeLog(LogLevel.Error, `Konstruktor für Raum mit Namen "${roomName}" bereits hinzugefügt`);
      return;
    }
    ioBrokerMain.roomConstructors[roomName] = constr;
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
        ServerLogService.writeLog(LogLevel.Info, 'onConnChange.disconnected');
        return;
      }

      ServerLogService.writeLog(LogLevel.Info, 'onConnChange.connected');
      this.retrieveAllStates();
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

    this.connectionCallbacks.onError = (err: {
      /**
       * Command that was executed
       */
      command: string;
      /**
       * Argument that was passed to the command
       */
      arg: string;
    }) => {
      console.log(`Cannot execute ${err.command} for ${err.arg}, because of insufficient permissions`);
    };
  }

  private async retrieveAllStates(): Promise<void> {
    const allStates: Record<string, ioBroker.State> = {};
    if (SettingsService.settings.ioBroker?.useSplitInitialization !== true) {
      this.processAllStates((await this.getStatesRange(`*`)) ?? {});
      return;
    }
    for (const char of ioBrokerMain.SplitKeys) {
      const range = await this.getStatesRange(`${char}*`);
      if (range) {
        for (const id in range) {
          allStates[id] = range[id];
        }
      }
    }
    this.processAllStates(allStates);
  }

  private getStatesRange(pattern: string): Promise<Record<string, ioBroker.State> | undefined> {
    return new Promise<Record<string, ioBroker.State> | undefined>((res) => {
      this.servConn.getStates(pattern, (err, _states) => {
        ServerLogService.writeLog(LogLevel.Debug, `iobroker.getStates(${pattern}).CB(${err}, ...)`);
        if (err !== null && err !== undefined) {
          ServerLogService.writeLog(LogLevel.Info, `Iobroker Error: ${err?.message ?? err}\n${err.stack}`);
        }
        res(_states);
      });
    });
  }

  private processAllStates(allStates: Record<string, ioBroker.State>): void {
    let count = 0;
    for (const id in allStates) {
      this.deviceUpdater.updateState(id, allStates[id], true);
      count++;
    }
    ServerLogService.writeLog(LogLevel.Info, `Received ${count} states.`);
    this.states = allStates;
    TimeCallbackService.performCheck();
    TimeCallbackService.performCheck();
  }
}
