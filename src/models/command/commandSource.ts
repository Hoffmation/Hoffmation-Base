// Definition: Enum for command source.
export enum CommandSource {
  /**
   * In case of unclear command stack/source this should be used.
   * @type {CommandSource.Unknown}
   */
  Unknown,
  /**
   * This should mark all startup commands, as this allows devices to treat this correctly.
   * @type {CommandSource.Initial}
   */
  Initial,
  /**
   * This should mark all commands that are executed as an automatic response to a certain action/change.
   * @type {CommandSource.Automatic}
   */
  Automatic,
  /**
   * This should mark all commands that are executed by a user thus having a higher priority than other automatic commands.
   * @type {CommandSource.Manual}
   */
  Manual,
  /**
   * This should mark all commands that are executed by an API call.
   * !WARNING! API could be an automatic call, but also a manual call e.g. using hoffmation-ios or homebridge-hoffmation --> So this is a higher priority than Automatic but still lower than manual/force.
   * @type {CommandSource.API}
   */
  API,
  /**
   * This should mark all commands that have highest priority, thus overruling/ignoring certain controls/safety mechanisms.
   * @type {CommandSource.Force}
   */
  Force,
}
