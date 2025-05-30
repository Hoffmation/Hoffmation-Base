/* eslint-disable prefer-rest-params,@typescript-eslint/ban-ts-comment,jsdoc/require-returns-description,jsdoc/require-param-description,jsdoc/require-jsdoc */
import { IncomingMessage } from 'http';
import io from 'socket.io-client';
import { iobrokerConnectionLogging } from './iobrokerConnectionLogging';
import { SocketIOVisCommand } from './socketIOVisCommand';
import { IoBrokerAuthInfo } from './ioBrokerAuthInfo';
import { iIOBrokerConnection } from '../interfaces';
import { ConnectionCallbacks } from '../models';
import { SocketIOConnectOpts } from './socketIOConnectOptions';
import { iobrokerConnectionLogLevel } from '../enums';
import { Utils } from '../utils';

let session: unknown;
let app: unknown;
let socketSession: unknown;
let storage: unknown;
const socketNamespace: string = '';
const socketUrl: string = '';
const socketForceWebSockets: boolean = true;

enum ConnectionState {
  notConnected,
  commandQueued,
  socketNotInitialized,
  connected,
}

export class IOBrokerConnection implements iIOBrokerConnection {
  private _authInfo: IoBrokerAuthInfo = new IoBrokerAuthInfo();
  private _authRunning: boolean = false;
  private _cmdData: unknown;
  private _cmdQueue?: Array<{
    func: string;
    args: IArguments;
  }> = new Array<{
    func: string;
    args: IArguments;
  }>();
  private _connCallbacks: ConnectionCallbacks = new ConnectionCallbacks();
  private _cmdInstance: string = '';
  private _countDown: number = 0;
  private _defaultMode: number = 0x644;
  private _disconnectedSince?: Date;
  // @ts-ignore
  private _isAuthRequired: boolean = false;
  private _isConnected: boolean = false;
  private _isSecure: boolean = false;
  private _lastTimer?: Date;
  // @ts-ignore
  private _onConnChange: unknown;
  // @ts-ignore
  private _onUpdate: unknown;
  private _reconnectInterval: number = 10000; // reconnect interval
  private _reloadInterval: number = 30; // if connection was absent longer than 30 seconds
  private _socket: SocketIOClient.Socket;
  private _timerTimeout?: NodeJS.Timeout;
  private _useStorage: boolean = false;
  private _connectInterval?: NodeJS.Timeout;
  private _countInterval?: NodeJS.Timeout;
  private _gettingStates?: number;

  public constructor(
    connOptions: SocketIOConnectOpts = {},
    connCallbacks: ConnectionCallbacks = new ConnectionCallbacks(),
    objectsRequired: boolean = false,
  ) {
    // init namespace
    if (typeof socketNamespace !== 'undefined') this.namespace = socketNamespace;

    if (!connOptions.name) connOptions.name = this.namespace;

    // To start vis as local use one of:
    // - start vis from directory with name local, e.g. c:/blbla/local/ioBroker.vis/www/index.html
    // - do not create "_socket/info.js" file in "www" directory
    // - create "_socket/info.js" file with
    //   var socketUrl = "local"; var socketSession = ""; sysLang="en";
    //   in this case you can overwrite browser language settings
    if (
      this._isExecutedInBrowser &&
      (document.URL.split('/local/')[1] ||
        (typeof socketUrl === 'undefined' && !connOptions.connLink) ||
        (typeof socketUrl !== 'undefined' && socketUrl === 'local'))
    ) {
      this._type = 'local';
    }

    if (typeof session !== 'undefined') {
      // @ts-ignore
      const user = session.get('user');
      if (user) {
        this._authInfo.user = user;
        // @ts-ignore
        this._authInfo.hash = session.get('hash');
        // @ts-ignore
        this._authInfo.salt = session.get('salt');
      }
    }

    this._connCallbacks = connCallbacks;

    let connLink: string | undefined = connOptions.connLink;
    if (!connOptions.connLink && this._isExecutedInBrowser) {
      connLink = window.localStorage.getItem('connLink') ?? undefined;
    }

    // Connection data from "/_socket/info.js"
    if (!connLink && typeof socketUrl !== 'undefined') connLink = socketUrl;
    if (!connOptions.socketSession && typeof socketSession !== 'undefined') connOptions.socketSession = socketSession;
    if (connOptions.socketForceWebSockets === undefined && typeof socketForceWebSockets !== 'undefined') {
      connOptions.socketForceWebSockets = socketForceWebSockets;
    }

    connOptions.socketSession = connOptions.socketSession || 'nokey';

    let url: string;
    if (connLink) {
      url = connLink;
      if (typeof connLink !== 'undefined') {
        if (connLink[0] === ':') connLink = location.protocol + '://' + location.hostname + connLink;
      }
    } else {
      url = location.protocol + '//' + location.host;
    }

    const opts: SocketIOClient.ConnectOpts = {
      query: 'key=' + connOptions.socketSession,
      reconnectionDelayMax: 20000,
      reconnectionAttempts: Infinity,
      reconnection: false,
      upgrade: !connOptions.socketForceWebSockets,
      rememberUpgrade: connOptions.socketForceWebSockets,
      transports: connOptions.socketForceWebSockets ? ['websocket'] : undefined,
    };

    iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Trace, `Going to create socket for url ${url}`);
    console.log(opts);
    this._socket = io(url, opts);
    iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Trace, 'Created socket');

    this._socket.on('connect', () => {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, 'In Connect callback');
      if (this._disconnectedSince) {
        const offlineTime = new Date().getTime() - this._disconnectedSince.getTime();
        iobrokerConnectionLogging.writeLog(
          iobrokerConnectionLogLevel.Debug,
          'was offline for ' + offlineTime / 1000 + 's',
        );

        // reload whole page if no connection longer than some period
        if (this._isExecutedInBrowser && this._reloadInterval && offlineTime > this._reloadInterval * 1000) {
          window.location.reload();
        }

        this._disconnectedSince = undefined;
      }

      if (this._connectInterval) {
        clearInterval(this._connectInterval);
        this._connectInterval = undefined;
      }
      if (this._countInterval) {
        clearInterval(this._countInterval);
        this._countInterval = undefined;
      }

      if (this.isExecutedInBrowser) {
        const elem = document.getElementById('server-disconnect');
        if (elem) elem.style.display = 'none';
      }

      this._socket.emit('name', connOptions.name);
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, ' Connected => authenticate');
      Utils.guardedTimeout(
        () => {
          const wait = Utils.guardedTimeout(
            () => {
              iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Error, 'No answer from server');
              if (this._isExecutedInBrowser) window.location.reload();
            },
            3000,
            this,
          );

          this._socket.emit('authenticate', (isOk: boolean, isSecure: boolean | null) => {
            clearTimeout(wait);
            iobrokerConnectionLogging.writeLog(
              iobrokerConnectionLogLevel.Debug,
              `Authenticated: ${isOk}; isSecure: ${isSecure}`,
            );
            if (isOk) {
              this._onAuth(objectsRequired, isSecure ?? false);
            } else {
              iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, 'permissionError');
            }
          });
        },
        50,
        this,
      );
    });

    this._socket.on('reauthenticate', () => {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Error, 'Connection.ts: socket.on(reauthenticate)');
      if (this._connCallbacks.onConnChange) {
        this._connCallbacks.onConnChange(false);
        if (typeof app !== 'undefined') {
          // @ts-ignore
          app.onConnChange(false);
        }
      }
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Warn, 'reauthenticate');
      if (this._isExecutedInBrowser) window.location.reload();
    });

    this._socket.on('connect_error', (err: unknown) => {
      iobrokerConnectionLogging.writeLog(
        iobrokerConnectionLogLevel.Error,
        `Couldn't Connect --> Reconecting (Error: ${err})`,
      );

      this.reconnect(connOptions);
    });

    this._socket.on('disconnect', () => {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Error, "Connection.ts: socket.on('disconnect')");
      this._disconnectedSince = new Date();

      // called only once when connection lost (and it was here before)
      this._isConnected = false;
      if (this._connCallbacks.onConnChange !== undefined) {
        Utils.guardedTimeout(
          () => {
            if (typeof this._connCallbacks.onConnChange !== 'undefined') {
              this._connCallbacks.onConnChange(this._isConnected);
            }
            if (typeof app !== 'undefined') {
              // @ts-ignore
              app.onConnChange(this._isConnected);
            }
          },
          5000,
          this,
        );
      }

      // reconnect
      this.reconnect(connOptions);
    });

    // after reconnect the "connect" event will be called
    this._socket.on('reconnect', () => {
      const discoSinceTime: number = this._disconnectedSince === undefined ? 0 : this._disconnectedSince?.getTime();
      const offlineTime = new Date().getTime() - discoSinceTime;
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Info, `was offline for ${offlineTime / 1000}s`);

      // reload whole page if no connection longer than one minute
      if (this._reloadInterval && offlineTime > this._reloadInterval * 1000) {
        window.location.reload();
      }
      // anyway "on connect" is called
    });

    this._socket.on('objectChange', (id: string, obj: ioBroker.Object) => {
      // If cache used
      if (this._useStorage && typeof storage !== 'undefined') {
        // @ts-ignore
        const objects = this._objects || storage.get('objects');
        if (objects) {
          if (obj) {
            objects[id] = obj;
          } else {
            if (objects[id]) delete objects[id];
          }
          // @ts-ignore
          storage.set('objects', objects);
        }
      }

      if (this._connCallbacks.onObjectChange) {
        this._connCallbacks.onObjectChange(id, obj);
      }
    });

    this._socket.on('stateChange', (id: string, state: ioBroker.State) => {
      if (!id || state === null || typeof state !== 'object') return;

      if (this._connCallbacks.onCommand && id === this.namespace + '.control.command') {
        if (state.ack) return;

        if (
          state.val &&
          typeof state.val === 'string' &&
          state.val[0] === '{' &&
          state.val[state.val.length - 1] === '}'
        ) {
          try {
            state.val = JSON.parse(state.val);
          } catch (_e) {
            iobrokerConnectionLogging.writeLog(
              iobrokerConnectionLogLevel.Debug,
              'Command seems to be an object, but cannot parse it: ' + state.val,
            );
          }
        }
        // if command is an object {instance: 'iii', command: 'cmd', data: 'ddd'}
        // @ts-ignore
        if (state.val && typeof state.val === 'object' && (state.val as unknown).instance) {
          // vis only:
          const visCommand: SocketIOVisCommand = new SocketIOVisCommand(
            state.val as {
              command: string;
              data: string;
              instance: string;
            },
          );
          if (this._connCallbacks.onCommand(visCommand.instance, visCommand.command, visCommand.data)) {
            // clear state
            this.setState(id, { val: '', ack: true });
          }
        } else {
          if (this._connCallbacks.onCommand(this._cmdInstance, state.val, this._cmdData)) {
            // clear state
            this.setState(id, { val: '', ack: true });
          }
        }
      } else if (id === this.namespace + '.control.data') {
        this._cmdData = state.val;
      } else if (id === this.namespace + '.control.instance') {
        this._cmdInstance = state.val as string;
      } else if (this._connCallbacks.onUpdate) {
        this._connCallbacks.onUpdate(id, state);
      }
    });

    this._socket.on('permissionError', (err: Error) => {
      if (this._connCallbacks.onError) {
        /* {
                     command:
                     type:
                     operation:
                     arg:
                     }*/
        this._connCallbacks.onError(err);
      } else {
        iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, 'permissionError');
      }
    });

    this._socket.on('error', (reason: Error | string) => {
      if (!(reason as Error)?.message) {
        iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Error, `Recieved socket error event: ${reason}`);
      }
      const err: Error = reason as Error;
      iobrokerConnectionLogging.writeLog(
        iobrokerConnectionLogLevel.Error,
        `Recieved socket error: ${err.message}\nStack:${err.stack}`,
      );
      // @ts-ignore
      const innerErr: Error = (reason as unknown).description as Error;
      if (innerErr) {
        iobrokerConnectionLogging.writeLog(
          iobrokerConnectionLogLevel.Error,
          `Inner socket error: ${innerErr.message}\nStack:${innerErr.stack}`,
        );
      }
    });
  }

  private _isExecutedInBrowser: boolean = false;

  /**
   * Getter isExecutedInBrowser
   * @returns
   */
  public get isExecutedInBrowser(): boolean {
    return this._isExecutedInBrowser;
  }

  private _enums?: Record<string, ioBroker.EnumObject>; // used if _useStorage === true

  /**
   * Getter enums
   * @returns
   */
  public get enums(): Record<string, ioBroker.EnumObject> | undefined {
    return this._enums;
  }

  /**
   * Setter enums
   * @param value
   */
  public set enums(value: Record<string, ioBroker.EnumObject> | undefined) {
    this._enums = value;
  }

  private _isAuthDone: boolean = false;

  /**
   * Getter isAuthDone
   * @returns
   */
  public get isAuthDone(): boolean {
    return this._isAuthDone;
  }

  //#region GetterSetter

  private _namespace: string = 'vis.0';

  /**
   * Getter namespace
   * @returns
   */
  public get namespace(): string {
    return this._namespace;
  }

  /**
   * Setter namespace
   * @param value
   */
  public set namespace(value: string) {
    this._namespace = value;
  }

  private _objects?: Record<string, ioBroker.Object>; // used if _useStorage === true

  /**
   * Getter objects
   * @returns
   */
  public get objects(): Record<string, ioBroker.Object> | undefined {
    return this._objects;
  }

  /**
   * Setter objects
   * @param value
   */
  public set objects(value: Record<string, ioBroker.Object> | undefined) {
    this._objects = value;
  }

  private _type: string = 'socket.io'; // [SignalR | socket.io | local]

  /**
   * Getter type
   * @returns
   */
  public get type(): string {
    return this._type;
  }

  /**
   * Setter type
   * @param value
   */
  public set type(value: string) {
    this._type = value;
  }

  private _timeout: number = 0; // 0 - use transport default timeout to detect disconnect

  /**
   * Getter timeout
   * @returns
   */
  public get timeout(): number {
    return this._timeout;
  }

  /**
   * Setter timeout
   * @param value
   */
  public set timeout(value: number) {
    this._timeout = value;
  }

  private _user: string = '';

  /**
   * Getter user
   * @returns
   */
  public get user(): string {
    return this._user;
  }

  //#endregion

  /**
   * Setter user
   * @param value
   */
  public set user(value: string) {
    this._user = value;
  }

  public reconnect(pConnOptions: unknown): void {
    // reconnect
    // @ts-ignore
    if (this._connectInterval !== undefined || (pConnOptions.mayReconnect && !pConnOptions.mayReconnect())) {
      return;
    }
    iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Trace, 'Connection.ts: reconnect()');
    this._connectInterval = Utils.guardedInterval(
      () => {
        iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, 'Trying connect...');
        this._socket.connect();
        this._countDown = Math.floor(this._reconnectInterval / 1000);
        iobrokerConnectionLogging.writeLog(
          iobrokerConnectionLogLevel.Trace,
          `Connection.ts: Connection Retry Countdown ${this._countDown}`,
        );
      },
      this._reconnectInterval,
      this,
    );

    this._countDown = Math.floor(this._reconnectInterval / 1000);
    iobrokerConnectionLogging.writeLog(
      iobrokerConnectionLogLevel.Trace,
      `Connection.ts: Connection Retry Countdown ${this._countDown}`,
    );

    this._countInterval = Utils.guardedInterval(
      () => {
        this._countDown--;
        iobrokerConnectionLogging.writeLog(
          iobrokerConnectionLogLevel.Trace,
          `Connection.ts: Connection Retry Countdown ${this._countDown}`,
        );
      },
      1000,
      this,
    );
  }

  // FIXME: CallBack Type
  public logout(callback: unknown): void {
    if (!this._isConnected) {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, 'No connection!');
      return;
    }

    this._socket.emit('logout', callback);
  }

  // FIXME: CallBack Type
  public getVersion(callback: unknown): void {
    if (this._checkConnection('getVersion', arguments) != ConnectionState.connected) {
      return;
    }

    this._socket.emit(
      'getVersion',
      // FIXME: version Type
      (error: unknown, version: string) => {
        if (callback) {
          // @ts-ignore
          callback(error, version);
        }
      },
    );
  }

  public readFile(filename: string, callback: ioBroker.ReadFileCallback, isRemote: boolean): void {
    if (!callback) throw 'No callback set';

    if (this._type === 'local') {
      try {
        // @ts-ignore
        const data = storage.get(filename);
        // @ts-ignore
        callback(null, data ? JSON.parse(storage.get(filename)) : null);
      } catch (err) {
        // @ts-ignore
        callback(err, undefined);
      }
      return;
    }
    if (this._checkConnection('readFile', arguments) != ConnectionState.connected) return;

    if (!isRemote && typeof app !== 'undefined') {
      // @ts-ignore
      app.readLocalFile(filename.replace(/^\/vis\.0\//, ''), callback);
      return;
    }
    let adapter = this.namespace;
    if (filename[0] === '/') {
      const p = filename.split('/');
      adapter = p[1];
      p.splice(0, 2);
      filename = p.join('/');
    }

    this._socket.emit(
      'readFile',
      adapter,
      filename,
      (err: Error, data: string | Buffer | undefined, mimeType: string) => {
        Utils.guardedNewThread(() => {
          callback(err, data, mimeType);
        }, this);
      },
    );
  }

  public getMimeType(ext: string): string {
    if (ext.indexOf('.') !== -1) {
      const regMatch = ext.toLowerCase().match(/\.[^.]+$/);
      ext = regMatch !== null && regMatch.length > 0 ? regMatch[0] : '';
    }
    let _mimeType;
    if (ext === '.css') {
      _mimeType = 'text/css';
    } else if (ext === '.bmp') {
      _mimeType = 'image/bmp';
    } else if (ext === '.png') {
      _mimeType = 'image/png';
    } else if (ext === '.jpg') {
      _mimeType = 'image/jpeg';
    } else if (ext === '.jpeg') {
      _mimeType = 'image/jpeg';
    } else if (ext === '.gif') {
      _mimeType = 'image/gif';
    } else if (ext === '.tif') {
      _mimeType = 'image/tiff';
    } else if (ext === '.js') {
      _mimeType = 'application/javascript';
    } else if (ext === '.html') {
      _mimeType = 'text/html';
    } else if (ext === '.htm') {
      _mimeType = 'text/html';
    } else if (ext === '.json') {
      _mimeType = 'application/json';
    } else if (ext === '.xml') {
      _mimeType = 'text/xml';
    } else if (ext === '.svg') {
      _mimeType = 'image/svg+xml';
    } else if (ext === '.eot') {
      _mimeType = 'application/vnd.ms-fontobject';
    } else if (ext === '.ttf') {
      _mimeType = 'application/font-sfnt';
    } else if (ext === '.woff') {
      _mimeType = 'application/font-woff';
    } else if (ext === '.wav') {
      _mimeType = 'audio/wav';
    } else if (ext === '.mp3') {
      _mimeType = 'audio/mpeg3';
    } else {
      _mimeType = 'text/javascript';
    }
    return _mimeType;
  }

  // FIXME: Callback Type
  public readFile64(filename: string, callback: unknown, isRemote: boolean): void {
    if (!callback) {
      throw 'No callback set';
    }

    if (this._checkConnection('readFile', arguments) != ConnectionState.connected) return;

    if (!isRemote && typeof app !== 'undefined') {
      // FIXME: data Type
      // @ts-ignore
      app.readLocalFile(filename.replace(/^\/vis\.0\//, ''), (err: Error, data: string, mimeType: string) => {
        Utils.guardedNewThread(() => {
          if (data) {
            // @ts-ignore
            callback(err, { mime: mimeType || this.getMimeType(filename), data: btoa(data) }, filename);
          } else {
            // @ts-ignore
            callback(err, filename);
          }
        }, this);
      });
    } else {
      let adapter = this.namespace;
      if (filename[0] === '/') {
        const p = filename.split('/');
        adapter = p[1];
        p.splice(0, 2);
        filename = p.join('/');
      }

      this._socket.emit(
        'readFile64',
        adapter,
        filename,
        // FIXME: data Type
        (err: Error, data: unknown, mimeType: string) => {
          Utils.guardedNewThread(() => {
            if (data) {
              // @ts-ignore
              callback(err, { mime: mimeType || this.getMimeType(filename), data: data }, filename);
            } else {
              // @ts-ignore
              callback(err, { mime: mimeType || this.getMimeType(filename) }, filename);
            }
          }, this);
        },
      );
    }
  }

  // @ts-ignore
  public writeFile(
    filename: string,
    data: unknown | string,
    mode: number,
    callback: ioBroker.ErrnoCallback,
    // @ts-ignore
    ..._args: unknown[]
  ): void {
    if (this._type === 'local') {
      // @ts-ignore
      storage.set(filename, JSON.stringify(data));
      if (callback) {
        callback();
      }
      return;
    }

    if (this._checkConnection('writeFile', arguments) != ConnectionState.connected) {
      return;
    }
    // @ts-ignore
    const sData: string = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;

    const parts = filename.split('/');
    const adapter = parts[1];
    parts.splice(0, 2);
    if (adapter === 'vis') {
      this._socket.emit(
        'writeFile',
        adapter,
        parts.join('/'),
        sData,
        mode ? { mode: this._defaultMode } : {},
        callback,
      );
      return;
    }

    this._socket.emit('writeFile', this.namespace, filename, sData, mode ? { mode: this._defaultMode } : {}, callback);
  }

  // Write file base 64
  public writeFile64(filename: string, data: string, callback: ioBroker.ErrnoCallback): void {
    if (this._checkConnection('writeFile', arguments) != ConnectionState.connected) return;

    const parts = filename.split('/');
    const adapter = parts[1];
    parts.splice(0, 2);

    this._socket.emit('writeFile', adapter, parts.join('/'), atob(data), { mode: this._defaultMode }, callback);
  }

  public readDir(dirname: string, callback: ioBroker.ReadDirCallback): void {
    //socket.io
    if (this._socket === null) {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, 'socket.io not initialized');
      return;
    }
    if (!dirname) dirname = '/';
    const parts = dirname.split('/');
    const adapter = parts[1];
    parts.splice(0, 2);

    this._socket.emit(
      'readDir',
      adapter,
      parts.join('/'),
      { filter: true },
      (err: Error, data: ioBroker.ReadDirResult[]) => {
        if (callback) callback(err, data);
      },
    );
  }

  public mkdir(dirname: string, callback: ioBroker.ErrnoCallback): void {
    const parts = dirname.split('/');
    const adapter = parts[1];
    parts.splice(0, 2);

    this._socket.emit('mkdir', adapter, parts.join('/'), (err: Error) => {
      if (callback) {
        callback(err);
      }
    });
  }

  public unlink(name: string, callback: ioBroker.ErrorCallback): void {
    const parts = name.split('/');
    const adapter = parts[1];
    parts.splice(0, 2);

    this._socket.emit('unlink', adapter, parts.join('/'), (err: Error) => {
      if (callback) {
        callback(err);
      }
    });
  }

  public renameFile(oldname: string, newname: string, callback: ioBroker.ErrnoCallback): void {
    const parts1 = oldname.split('/');
    const adapter = parts1[1];
    parts1.splice(0, 2);
    const parts2 = newname.split('/');
    parts2.splice(0, 2);
    this._socket.emit('rename', adapter, parts1.join('/'), parts2.join('/'), (err: Error) => {
      if (callback) {
        callback(err);
      }
    });
  }

  public setState(
    pointId: string,
    state: string | number | boolean | ioBroker.State | ioBroker.SettableState | null,
    callback?: ioBroker.SetStateCallback,
  ): void {
    //socket.io
    if (this._socket === null) {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, 'socket.io not initialized');
      return;
    }
    if (!callback) {
      callback = (err?, id?) => {
        if (err) {
          iobrokerConnectionLogging.writeLog(
            iobrokerConnectionLogLevel.Error,
            `socket.io setState Error: ${err}\nwith updating ${pointId} to value ${state}\nid:${id}`,
          );
        }
      };
    }
    this._socket.emit('setState', pointId, state, callback);
  }

  public sendTo(
    instance: string,
    command: string,
    payload: ioBroker.MessagePayload,
    callback: ioBroker.MessageCallback | ioBroker.MessageCallbackInfo,
  ): void {
    //socket.io
    if (this._socket === null) {
      //SocketIoLogging.writeLog(SocketIoLogLevel.Debug,'socket.io not initialized');
      return;
    }
    this._socket.emit('sendTo', instance, command, payload, callback);
  }

  // callback(err: Error, data)
  public getStates(idPattern: string = '*', callback: ioBroker.GetStatesCallback): void {
    iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, 'ioBrokerConnection.getStates');
    if (this._type === 'local') {
      return callback(null, {});
    }

    const connected: ConnectionState = this._checkConnection('getStates', arguments);
    if (connected != ConnectionState.connected) {
      iobrokerConnectionLogging.writeLog(
        iobrokerConnectionLogLevel.Debug,
        `getStates: Not connected, current Connection: ${connected}`,
      );
      return;
    }
    this._gettingStates = this._gettingStates || 0;
    this._gettingStates++;
    if (this._gettingStates > 1) {
      // fix for slow devices
      iobrokerConnectionLogging.writeLog(
        iobrokerConnectionLogLevel.Debug,
        'Trying to get empty list, because the whole list could not be loaded',
      );
      // FIXME: Check if this is correct to get all
      idPattern = '*';
    }
    this._socket.emit('getStates', idPattern, (err: Error, data: Record<string, ioBroker.State>) => {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, `getStates Callback; Error: "${err}"`);
      if (this._gettingStates !== undefined) {
        this._gettingStates--;
      }
      if (err || !data) {
        if (callback) {
          callback(err || new Error('Authentication required'));
        }
      } else if (callback) {
        callback(null, data);
      }
    });
  }

  // callback(err: Error, data)
  public getObjects(useCache: boolean, callback: ioBroker.GetObjectsCallback): void {
    if (typeof useCache === 'function') {
      callback = useCache;
      useCache = false;
    }
    // If cache used
    if (this._useStorage && useCache) {
      if (typeof storage !== 'undefined') {
        // @ts-ignore
        const objects = this._objects || storage.get('objects');
        if (objects) return callback(null, objects);
      } else if (this._objects) {
        return callback(null, this._objects);
      }
    }

    if (this._checkConnection('getObjects', arguments) != ConnectionState.connected) return;
    this._socket.emit('getObjects', (err: Error, data: Record<string, ioBroker.Object>) => {
      if (err) {
        callback(err);
        return;
      }

      // Read all enums
      this._socket.emit(
        'getObjectView',
        'system',
        'enum',
        { startkey: 'enum.', endkey: 'enum.\u9999' },
        (
          err: Error,
          res: {
            rows: ioBroker.GetObjectViewItem<ioBroker.Object>[];
          },
        ) => {
          if (err) {
            callback(err);
            return;
          }
          const enums: Record<string, ioBroker.EnumObject> = {};
          for (const row of res.rows) {
            const currentId = row.id;
            if (row.value !== null) {
              data[currentId] = row.value;
              enums[currentId] = row.value as ioBroker.EnumObject;
            }
          }

          // Read all adapters for images
          this._socket.emit(
            'getObjectView',
            'system',
            'instance',
            { startkey: 'system.adapter.', endkey: 'system.adapter.\u9999' },
            (
              err: Error,
              res: {
                // @ts-ignore
                rows: ioBroker.GetObjectViewItem<unknown>[];
              },
            ) => {
              if (err) {
                callback(err);
                return;
              }
              for (const row of res.rows) {
                if (row.value !== null) {
                  // @ts-ignore
                  data[row.id] = row.value;
                }
              }
              // find out default file mode
              if (
                data['system.adapter.' + this.namespace] &&
                data['system.adapter.' + this.namespace].native &&
                data['system.adapter.' + this.namespace].native.defaultFileMode
              ) {
                this._defaultMode = data['system.adapter.' + this.namespace].native.defaultFileMode;
              }

              // Read all channels for images
              this._socket.emit(
                'getObjectView',
                'system',
                'channel',
                { startkey: '', endkey: '\u9999' },
                (
                  err: Error,
                  res: {
                    // @ts-ignore
                    rows: ioBroker.GetObjectViewItem<unknown>[];
                  },
                ) => {
                  if (err) {
                    callback(err);
                    return;
                  }

                  for (const row of res.rows) {
                    if (row.value !== null) {
                      // @ts-ignore
                      data[row.id] = row.value;
                    }
                  }

                  // Read all devices for images
                  this._socket.emit(
                    'getObjectView',
                    'system',
                    'device',
                    { startkey: '', endkey: '\u9999' },
                    (
                      err: Error,
                      res: {
                        // @ts-ignore
                        rows: ioBroker.GetObjectViewItem<unknown>[];
                      },
                    ) => {
                      if (err) {
                        callback(err);
                        return;
                      }

                      for (const row of res.rows) {
                        if (row.value !== null) {
                          // @ts-ignore
                          data[row.id] = row.value;
                        }
                      }

                      if (this._useStorage) {
                        this._fillChildren(data);
                        this._objects = data;
                        this._enums = enums;

                        if (typeof storage !== 'undefined') {
                          // @ts-ignore
                          storage.set('objects', data);
                          // @ts-ignore
                          storage.set('enums', enums);
                          // @ts-ignore
                          storage.set('timeSync', new Date().getTime());
                        }
                      }

                      if (callback) callback(err, data);
                    },
                  );
                },
              );
            },
          );
        },
      );
    });
  }

  // @ts-ignore
  public getChildren(
    id: string,
    useCache: boolean,
    callback: (err?: Error | null, children?: string[]) => void,
    // @ts-ignore
    ..._args: unknown[]
  ): void {
    if (this._checkConnection('getChildren', arguments) != ConnectionState.connected) return;

    if (!id) return callback(new Error('getChildren: no id given'));

    const data: Record<string, ioBroker.Object> = {};

    if (this._useStorage && useCache) {
      if (typeof storage !== 'undefined') {
        // @ts-ignore
        const objects = storage.get('objects');
        if (objects && objects[id] && objects[id].children) {
          return callback(null, objects[id].children);
        }
      } else {
        // @ts-ignore
        if (this._objects && this._objects[id] && this._objects[id].children) {
          // @ts-ignore
          return callback(null, this._objects[id].children);
        }
      }
    }

    // Read all devices
    this._socket.emit(
      'getObjectView',
      'system',
      'device',
      { startkey: id + '.', endkey: id + '.\u9999' },
      (
        err: Error,
        res: {
          // @ts-ignore
          rows: ioBroker.GetObjectViewItem<unknown>[];
        },
      ) => {
        if (err) {
          callback(err);
          return;
        }

        for (const row of res.rows) {
          if (row.value !== null) {
            // @ts-ignore
            data[row.id] = row.value;
          }
        }

        this._socket.emit(
          'getObjectView',
          'system',
          'channel',
          { startkey: id + '.', endkey: id + '.\u9999' },
          (
            err: Error,
            res: {
              // @ts-ignore
              rows: ioBroker.GetObjectViewItem<unknown>[];
            },
          ) => {
            if (err) {
              callback(err);
              return;
            }

            for (const row of res.rows) {
              if (row.value !== null) {
                // @ts-ignore
                data[row.id] = row.value;
              }
            }

            // Read all adapters for images
            this._socket.emit(
              'getObjectView',
              'system',
              'state',
              { startkey: id + '.', endkey: id + '.\u9999' },
              (
                err: Error,
                res: {
                  // @ts-ignore
                  rows: ioBroker.GetObjectViewItem<unknown>[];
                },
              ) => {
                if (err) {
                  callback(err);
                  return;
                }

                for (const row of res.rows) {
                  if (row.value !== null) {
                    // @ts-ignore
                    data[row.id] = row.value;
                  }
                }

                const list = [];

                const count = id.split('.').length;

                // find direct children
                for (const _id in data) {
                  const parts = _id.split('.');
                  if (count + 1 === parts.length) {
                    list.push(_id);
                  }
                }
                list.sort();

                if (this._useStorage && typeof storage !== 'undefined') {
                  // @ts-ignore
                  const objects = storage.get('objects') || {};

                  for (const id_ in data) {
                    objects[id_] = data[id_];
                  }
                  if (objects[id] && objects[id].common) {
                    objects[id].children = list;
                  }
                  // Store for every element theirs children
                  const items = [];
                  for (const __id in data) {
                    items.push(__id);
                  }
                  items.sort();

                  for (let k = 0; k < items.length; k++) {
                    if (objects[items[k]].common) {
                      let j = k + 1;
                      const children = [];
                      const len = items[k].length + 1;
                      const name = items[k] + '.';
                      while (j < items.length && items[j].substring(0, len) === name) {
                        children.push(items[j++]);
                      }

                      objects[items[k]].children = children;
                    }
                  }

                  // @ts-ignore
                  storage.set('objects', objects);
                }

                if (callback) callback(err, list);
              },
            );
          },
        );
      },
    );
  }

  public getObject(id: string, useCache: boolean, callback: ioBroker.GetObjectCallback): void {
    if (!id) return callback(new Error('no id given'));

    // If cache used
    if (this._useStorage && useCache && typeof storage !== 'undefined') {
      if (typeof storage !== 'undefined') {
        // @ts-ignore
        const objects = this._objects || storage.get('objects');
        if (objects && objects[id]) return callback(null, objects[id]);
      } else if (this._enums) {
        return callback(null, this._enums as unknown as ioBroker.OtherObject);
      }
    }

    this._socket.emit('getObject', id, (err: Error, obj: ioBroker.Object) => {
      if (err) {
        callback(err);
        return;
      }
      if (this._useStorage && typeof storage !== 'undefined') {
        // @ts-ignore
        const objects = storage.get('objects') || {};
        objects[id] = obj;
        // @ts-ignore
        storage.set('objects', objects);
      }
      return callback(null, obj);
    });
  }

  // return time when the objects were synchronized
  public getSyncTime(): Date {
    if (this._useStorage && typeof storage !== 'undefined') {
      // @ts-ignore
      const timeSync = storage.get('timeSync');
      if (timeSync) return new Date(timeSync);
    }
    return new Date(0);
  }

  // @ts-ignore
  public addObject(_objId: unknown, _obj: unknown, _callback: unknown): void {
    if (!this._isConnected) {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, 'No connection!');
      return;
    }
    //socket.io
    if (this._socket === null) {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, 'socket.io not initialized');
      return;
    }
  }

  public delObject(objId: string): void {
    if (this._checkConnection('delObject', arguments) != ConnectionState.connected) return;

    this._socket.emit('delObject', objId);
  }

  public httpGet(url: string, callback: (res: IncomingMessage | Error) => void): void {
    if (!this._isConnected) {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, 'No connection!');
      return;
    }
    //socket.io
    if (this._socket === null) {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, 'socket.io not initialized');
      return;
    }
    this._socket.emit('httpGet', url, (data: IncomingMessage | Error) => {
      if (callback) callback(data);
    });
  }

  public logError(errorText: string): void {
    iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, 'Error: ' + errorText);
    if (!this._isConnected) {
      //SocketIoLogging.writeLog(SocketIoLogLevel.Debug,'No connection!');
      return;
    }
    //socket.io
    if (this._socket === null) {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, 'socket.io not initialized');
      return;
    }
    this._socket.emit('log', 'error', 'Addon DashUI  ' + errorText);
  }

  public authenticate(user: string, password: string, salt: string): void {
    this._authRunning = true;

    if (user !== undefined) {
      this._authInfo = {
        user: user,
        hash: password + salt,
        salt: salt,
      };
    }

    if (!this._isConnected) {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, 'No connection!');
      return;
    }

    if (!this._authInfo) {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, 'No credentials!');
    }
  }

  // FIXME finish implementation of this file

  public getConfig(
    useCache: boolean,
    callback: (error: Error | null, conf?: Record<string, unknown>) => void,
    // @ts-ignore
    ..._args: unknown[]
  ): void {
    if (this._checkConnection('getConfig', arguments) != ConnectionState.connected) return;

    if (typeof useCache === 'function') {
      callback = useCache;
      useCache = false;
    }
    if (this._useStorage && useCache) {
      if (typeof storage !== 'undefined') {
        // @ts-ignore
        const objects = storage.get('objects');
        if (objects && objects['system.config']) {
          return callback(null, objects['system.config'].common);
        }
      } else if (this._objects && this._objects['system.config']) {
        return callback(null, this._objects['system.config'].common);
      }
    }
    this._socket.emit('getObject', 'system.config', (err: Error, obj: ioBroker.Object) => {
      if (err || !obj || !obj.common) {
        callback(new Error('Cannot read language'));
        return;
      }

      if (this._useStorage && typeof storage !== 'undefined') {
        // @ts-ignore
        const objects = storage.get('objects') || {};
        objects['system.config'] = obj;
        // @ts-ignore
        storage.set('objects', objects);
      }

      callback(null, obj.common);
    });
  }

  public sendCommand(
    instance: string,
    command: string,
    data: string | number | boolean | unknown[] | Record<string, unknown> | null,
    ack: boolean = true,
  ): void {
    this.setState(this.namespace + '.control.instance', { val: instance || 'notdefined', ack: true });
    // @ts-ignore
    this.setState(this.namespace + '.control.data', { val: data, ack: true });
    this.setState(this.namespace + '.control.command', { val: command, ack: ack });
  }

  public readProjects(
    callback: (
      err?: NodeJS.ErrnoException | null,
      objects?: Array<{
        name: string;
        readOnly: undefined | boolean;
        mode: number;
      }>,
    ) => void,
  ): void {
    this.readDir('/' + this.namespace, (err?: NodeJS.ErrnoException | null, dirs?: ioBroker.ReadDirResult[]) => {
      const result: Array<{
        name: string;
        readOnly: undefined | boolean;
        mode: number;
      }> = [];
      let count = 0;
      if (err) {
        callback(err);
        return;
      }

      if (dirs === undefined) {
        callback(new Error('No Dirs Found'));
        return;
      }

      for (const dir of dirs) {
        if (!dir.isDir) {
          continue;
        }

        count++;
        this._detectViews(dir.file, (subErr, project) => {
          if (project) result.push(project);

          err = err || subErr;
          if (!--count) callback(err, result);
        });
      }
    });
  }

  public chmodProject(projectDir: string, mode: number | string, callback: ioBroker.ChownFileCallback): void {
    //socket.io
    if (this._socket === null) {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, 'socket.io not initialized');
      return;
    }
    this._socket.emit(
      'chmodFile',
      this.namespace,
      projectDir + '*',
      { mode: mode },
      (err: Error, data?: ioBroker.ChownFileResult[], id?: string) => {
        if (callback) {
          // @ts-ignore
          callback(err, data, id);
        }
      },
    );
  }

  public clearCache(): void {
    if (typeof storage !== 'undefined') {
      // @ts-ignore
      storage.empty();
    }
  }

  public getHistory(
    id: string,
    options: ioBroker.GetHistoryOptions & {
      timeout?: number;
    },
    callback: ioBroker.GetHistoryCallback,
    // @ts-ignore
    ..._args: unknown[]
  ): void {
    if (this._checkConnection('getHistory', arguments) != ConnectionState.connected) return;

    if (!options) options = {};

    if (!options.timeout) {
      options.timeout = 2000;
    }

    let timeout: NodeJS.Timeout | undefined = Utils.guardedTimeout(
      () => {
        timeout = undefined;
        callback(new Error('timeout'));
      },
      options.timeout,
      this,
    );
    this._socket.emit('getHistory', id, options, (err: Error, result: ioBroker.GetHistoryResult) => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
      callback(err, result);
    });
  }

  private _checkConnection(pFunc: unknown, pArguments: IArguments): ConnectionState {
    if (!this._isConnected) {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Warn, '_checkConnection: No connection!');
      return ConnectionState.notConnected;
    }

    // @ts-ignore
    if (this._queueCmdIfRequired(pFunc, pArguments)) {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Warn, 'Command queued');
      return ConnectionState.commandQueued;
    }

    //socket.io
    if (this._socket === null) {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Warn, 'socket.io not initialized');
      return ConnectionState.socketNotInitialized;
    }
    return ConnectionState.connected;
  }

  private _monitor(): void {
    if (this._timerTimeout !== undefined) return;
    const ts: number = new Date().getTime();
    const lastTimerTime: number = this._lastTimer === undefined ? 0 : this._lastTimer.getTime();
    if (this._reloadInterval && ts - lastTimerTime > this._reloadInterval * 1000) {
      // It seems, that PC was in a sleep => Reload page to request authentication anew
      if (this._isExecutedInBrowser) window.location.reload();
    } else {
      this._lastTimer = new Date(ts);
    }
    this._timerTimeout = Utils.guardedTimeout(
      () => {
        this._timerTimeout = undefined;
        this._monitor();
      },
      10000,
      this,
    );
  }

  private _onAuth(pObjectsRequired: boolean, pIsSecure: boolean): void {
    iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, '_onAuth()');
    this._isSecure = pIsSecure;

    if (this._isSecure) {
      this._lastTimer = new Date();
      this._monitor();
    }

    this._socket.emit('subscribe', '*');
    if (pObjectsRequired) this._socket.emit('subscribeObjects', '*');

    if (this._isConnected === true) {
      // This seems to be a reconnect because we're already connected!
      // -> prevent firing onConnChange twice
      iobrokerConnectionLogging.writeLog(
        iobrokerConnectionLogLevel.Debug,
        '_onAuth() -> prevent firing onConnChange twice',
      );
      return;
    }

    this._isConnected = true;
    if (!this._connCallbacks.onConnChange) {
      return;
    }
    Utils.guardedNewThread(() => {
      this._socket.emit('authEnabled', (auth: boolean, user: string) => {
        iobrokerConnectionLogging.writeLog(
          iobrokerConnectionLogLevel.Debug,
          `_onAuth()->authEnabled.CB: ${auth}; user:${user}`,
        );
        if (!auth) {
          this._isAuthDone = true;
        }
        this._user = user;
        if (typeof this._connCallbacks.onConnChange !== 'undefined') {
          this._connCallbacks.onConnChange(this._isConnected);
        }
        if (typeof app !== 'undefined') {
          // @ts-ignore
          app.onConnChange(this._isConnected);
        }
      });
    }, this);
  }

  // FIXME: CallBack Type
  private _checkAuth(callback: unknown) {
    if (!this._isConnected) {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Debug, '_checkAuth: No connection!');
      return;
    }
    //socket.io
    if (this._socket === null) {
      iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.DeepTrace, '_checkAuth: socket.io not initialized');
      return;
    }
    this._socket.emit(
      'getVersion',
      // FIXME: CallBack Type
      (error: unknown, version: unknown) => {
        if (callback) {
          iobrokerConnectionLogging.writeLog(
            iobrokerConnectionLogLevel.DeepTrace,
            '_checkAuth: socket.io getVersion Callback',
          );
          // @ts-ignore
          callback(error, version);
        }
      },
    );
  }

  // TODO: check if ioBroker.Object is correct
  private _fillChildren(objects: {
    [id: string]: ioBroker.Object & {
      children?: string[];
    };
  }): void {
    const items: Array<string> = [];

    for (const id in objects) {
      items.push(id);
    }
    items.sort();

    for (let i = 0; i < items.length; i++) {
      if (objects[items[i]].common) {
        let j = i + 1;
        const children = [];
        const len = items[i].length + 1;
        const name = items[i] + '.';
        while (j < items.length && items[j].substring(0, len) === name) {
          children.push(items[j++]);
        }

        objects[items[i]].children = children;
      }
    }
  }

  private _queueCmdIfRequired(func: string, args: IArguments) {
    if (this.isAuthDone) {
      iobrokerConnectionLogging.writeLog(
        iobrokerConnectionLogLevel.DeepTrace,
        '_queueCmdIfRequired: Auth is already done',
      );
      return false;
    }
    iobrokerConnectionLogging.writeLog(iobrokerConnectionLogLevel.Trace, '_queueCmdIfRequired: Auth is not yet done');
    // Queue command
    // @ts-ignore
    this._cmdQueue.push({ func: func, args: args });
    if (this._authRunning) {
      iobrokerConnectionLogging.writeLog(
        iobrokerConnectionLogLevel.DeepTrace,
        '_queueCmdIfRequired: Authentication Process is already Running',
      );
      return true;
    }

    iobrokerConnectionLogging.writeLog(
      iobrokerConnectionLogLevel.Trace,
      '_queueCmdIfRequired: Starting Authentication Process',
    );
    this._authRunning = true;
    // Try to read version
    // @ts-ignore
    this._checkAuth((error: unknown, version: string) => {
      iobrokerConnectionLogging.writeLog(
        iobrokerConnectionLogLevel.DeepTrace,
        `_queueCmdIfRequired: _checkAuth CB data: "${version}"`,
      );
      // If we have got version string, so there is no authentication, or we are authenticated
      this._authRunning = false;
      if (!version) {
        // Auth required
        this._isAuthRequired = true;
        // What for AuthRequest from server
        return;
      }
      this._isAuthDone = true;
      // Repeat all stored requests
      const __cmdQueue = this._cmdQueue;
      // Trigger GC
      this._cmdQueue = undefined;
      this._cmdQueue = [];
      // @ts-ignore
      for (let t = 0, len = __cmdQueue.length; t < len; t++) {
        // @ts-ignore
        (this as unknown)[__cmdQueue[t].func].apply(this, __cmdQueue[t].args);
      }
    });

    return true;
  }

  private _detectViews(
    projectDir: string,
    callback: (
      err?: NodeJS.ErrnoException | null,
      obj?: {
        name: string;
        readOnly: undefined | boolean;
        mode: number;
      },
    ) => void,
  ) {
    this.readDir(
      `/${this.namespace}/${projectDir}`,
      (err?: NodeJS.ErrnoException | null, dirs?: ioBroker.ReadDirResult[]) => {
        if (err) {
          callback(err);
          return;
        }

        // find vis-views.json
        if (dirs === undefined) {
          callback(new Error('No directories found'));
          return;
        }

        for (const dir of dirs) {
          if (dir.file === 'vis-views.json' && (!dir.acl || dir.acl.read)) {
            return callback(err, {
              name: projectDir,
              readOnly: dir.acl && !dir.acl.write,
              mode: dir.acl ? dir.acl.permissions : 0,
            });
          }
        }
        callback(err);
      },
    );
  }

  /** @inheritDoc */
  public dispose(): void {
    if (this._connectInterval) {
      clearInterval(this._connectInterval);
      this._connectInterval = undefined;
    }
    if (this._countInterval) {
      clearInterval(this._countInterval);
      this._countInterval = undefined;
    }
  }
}
