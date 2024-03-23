import { CommandSource } from './commandSource';
import { CommandType } from './commandType';

export abstract class BaseCommand {
  public readonly timestamp: Date;
  abstract _commandType: CommandType;

  /**
   * Base class for all commands
   * @param source The source of the command
   * @param reason You can provide a reason for clarification
   */
  protected constructor(
    public readonly source: CommandSource | BaseCommand = CommandSource.Unknown,
    public readonly reason: string = '',
  ) {
    this.timestamp = new Date();
  }

  public get isAutomaticAction(): boolean {
    if (this.source instanceof BaseCommand) {
      return this.source.isAutomaticAction;
    }
    return this.source === CommandSource.Automatic;
  }

  public get isForceAction(): boolean {
    if (this.source instanceof BaseCommand) {
      return this.source.isForceAction;
    }
    return (
      this.source === CommandSource.Manual || this.source === CommandSource.API || this.source === CommandSource.Force
    );
  }

  public get isManual(): boolean {
    if (this.source instanceof BaseCommand) {
      return this.source.isManual;
    }
    return this.source === CommandSource.Manual || this.source === CommandSource.API;
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

  public containsType(type: CommandType): boolean {
    if (this._commandType === type) {
      return true;
    }
    if (this.source instanceof BaseCommand) {
      return this.source.containsType(type);
    }
    return false;
  }
}
