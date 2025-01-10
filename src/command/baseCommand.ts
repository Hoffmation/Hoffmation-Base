import { CommandSource, CommandType } from '../enums';

export abstract class BaseCommand {
  /**
   * The timestamp of the command being created
   */
  public readonly timestamp: Date;
  /**
   * The type of this command to be used for comparison.
   *
   * For checking if any command in the stack is of a specific type, use the {@link containsType} method.
   */
  public abstract type: CommandType;
  /**
   * If set, this will be used in regards to checking if this is a force/manual/automatic action.
   * @type {CommandSource | undefined} The source of the command
   */
  public overrideCommandSource: CommandSource | undefined;

  /**
   * Base class for all commands
   * @param source - The source of the command
   * @param reason - You can provide a reason for clarification
   */
  protected constructor(
    public readonly source: CommandSource | BaseCommand = CommandSource.Unknown,
    public readonly reason: string = '',
  ) {
    this.timestamp = new Date();
  }

  public get isAutomaticAction(): boolean {
    if (this.overrideCommandSource !== undefined) {
      return this.overrideCommandSource === CommandSource.Automatic;
    }
    if (this.source instanceof BaseCommand) {
      return this.source.isAutomaticAction;
    }
    return this.source === CommandSource.Automatic;
  }

  public get isForceAction(): boolean {
    if (this.overrideCommandSource !== undefined) {
      return (
        this.overrideCommandSource === CommandSource.Manual ||
        this.overrideCommandSource === CommandSource.API ||
        this.overrideCommandSource === CommandSource.Force
      );
    }
    if (this.source instanceof BaseCommand) {
      return this.source.isForceAction;
    }
    return (
      this.source === CommandSource.Manual || this.source === CommandSource.API || this.source === CommandSource.Force
    );
  }

  public get isManual(): boolean {
    if (this.overrideCommandSource !== undefined) {
      return this.overrideCommandSource === CommandSource.Manual || this.overrideCommandSource === CommandSource.API;
    }
    if (this.source instanceof BaseCommand) {
      return this.source.isManual;
    }
    return this.source === CommandSource.Manual || this.source === CommandSource.API;
  }

  public get isInitial(): boolean {
    if (this.overrideCommandSource !== undefined) {
      return this.overrideCommandSource === CommandSource.Initial;
    }
    if (this.source instanceof BaseCommand) {
      return this.source.isInitial;
    }
    return this.source === CommandSource.Initial;
  }

  public get reasonTrace(): string {
    const ownPart: string = this.reason !== '' ? `${this.type}("${this.reason}")` : `${this.type}`;
    if (typeof this.source === 'object') {
      return `${this.source.reasonTrace} -> ${ownPart}`;
    }

    return `CommandType("${CommandSource[this.source]}") stack => ${ownPart}`;
  }

  public containsType(type: CommandType): boolean {
    if (this.type === type) {
      return true;
    }
    if (this.source instanceof BaseCommand) {
      return this.source.containsType(type);
    }
    return false;
  }
}
