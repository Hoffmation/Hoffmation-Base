export interface IRessourceObject {
  de?: string;
  en: string;
}

export interface IRessources {
  alarmArmed: IRessourceObject;
  alarmNightModeArmed: IRessourceObject;
  closedAfterMinutes: IRessourceObject;
  fireAlarmEnd: IRessourceObject;
  fireAlarmRepeat: IRessourceObject;
  fireAlarmStart: IRessourceObject;
  goodMorning: IRessourceObject;
  intruderAlarm: IRessourceObject;
  intruderAdditionalDefenseWarning: IRessourceObject;
  intruderGreeting: IRessourceObject;
  intruderLeaveAndOwnerInformed: IRessourceObject;
  intruderShutterUpPleaseLeave: IRessourceObject;
  justClosed: IRessourceObject;
  vibrationAlarm: IRessourceObject;
  waterAlarmEnd: IRessourceObject;
  waterAlarmRepeat: IRessourceObject;
  waterAlarmStart: IRessourceObject;
  wasOpened: IRessourceObject;
  welcomeHome: IRessourceObject;
}
