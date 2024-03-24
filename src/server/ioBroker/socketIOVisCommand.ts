/* eslint-disable jsdoc/require-jsdoc */
export class SocketIOVisCommand {
  public command: string;
  public data: string;
  public instance: string;

  constructor(pObject: { command: string; data: string; instance: string }) {
    this.command = pObject.command;
    this.data = pObject.data;
    this.instance = pObject.instance;
  }
}
