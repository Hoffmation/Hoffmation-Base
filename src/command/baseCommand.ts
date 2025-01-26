import { CommandSource, CommandType } from '../enums';

import { iBaseCommand } from './iBaseCommand';
import _ from 'lodash';
import { iJsonOmitKeys } from '../interfaces';

export abstract class BaseCommand implements iBaseCommand, iJsonOmitKeys {
  /**
   *
   */
  public jsonOmitKeys = ['source'];
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
   * If set, describes why this command wasn't executed.
   */
  public ignoreReason: string | undefined;

  /**
   * Base class for all commands
   * @param source - The source of the command
   * @param reason - You can provide a reason for clarification
   */
  protected constructor(
    public readonly source: CommandSource | iBaseCommand = CommandSource.Unknown,
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
    let ownPart: string = `${this.type}`;
    if (this.reason) {
      ownPart += `("${this.reason}")`;
    }
    if (this.ignoreReason !== undefined) {
      ownPart += ` ignored due to: "${this.ignoreReason}"`;
    }
    if ((this.source as iBaseCommand).timestamp) {
      return `${(this.source as iBaseCommand).reasonTrace} -> ${ownPart}`;
    }

    return `CommandType("${CommandSource[this.source as CommandSource]}") stack => ${ownPart}`;
  }

  public containsType(type: CommandType): boolean {
    if (this.type === type) {
      return true;
    }
    if ((this.source as iBaseCommand).timestamp) {
      return (this.source as iBaseCommand).containsType(type);
    }
    return false;
  }

  public get logMessage(): string {
    return this.reasonTrace;
  }

  public toJSON(): Partial<BaseCommand> {
    // eslint-disable-next-line
    const result: any = _.omit(this, ['source']);
    result['logMessage'] = this.logMessage;
    return result;
  }
}
