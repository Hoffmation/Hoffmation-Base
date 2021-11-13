export class SocketIOVisCommand {
  public command: string;
  public data: string;
  public instance: string;

  constructor(pObject: any) {
    this.command = pObject.command;
    this.data = pObject.data;
    this.instance = pObject.instance;
  }
}
