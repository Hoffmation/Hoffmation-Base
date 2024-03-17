import { CommandSource } from './commandSource';
import { CommandType } from './commandType';

export abstract class BaseCommand {
  public readonly timestamp: Date;
  abstract _commandType: CommandType;

  public constructor(
    public readonly source: CommandSource | BaseCommand = CommandSource.Unknown,
    public readonly reason: string = '',
  ) {
    this.timestamp = new Date();
  }

  public get isForceAction(): boolean {
    if (this.source instanceof BaseCommand) {
      return this.source.isForceAction;
    }
    return (
      this.source === CommandSource.Manual || this.source === CommandSource.API || this.source === CommandSource.Force
    );
  }

  public get isInitial(): boolean {
    if (this.source instanceof BaseCommand) {
      return this.source.isInitial;
    }
    return this.source === CommandSource.Initial;
  }

  public get reasonTrace(): string {
    const ownPart: string = this.reason !== '' ? `${this._commandType}("${this.reason}")` : `${this._commandType}`;
    if (typeof this.source === 'object') {
      return `${this.source.reasonTrace} -> ${ownPart}`;
    }

    return `CommandType("${CommandSource[this.source]}") stack => ${ownPart}`;
  }
}