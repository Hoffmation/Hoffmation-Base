import { CommandSource } from './commandSource';

export class BaseCommand {
  public readonly timestamp: Date;

  public constructor(
    private readonly _commandName: string,
    public readonly source: CommandSource | BaseCommand = CommandSource.Unknown,
    private readonly _reason: string = '',
  ) {
    this.timestamp = new Date();
  }

  public get isUserAction(): boolean {
    if (this.source instanceof BaseCommand) {
      return this.source.isUserAction;
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
    let reason: string = '';
    if (this.source instanceof BaseCommand) {
      reason = this.source.reasonTrace;
    }
    if (this._reason === '') {
      return `${reason} -> ${this._commandName}`;
    }
    return `${reason} -> ${this._commandName}(${this._reason})`;
  }
}
