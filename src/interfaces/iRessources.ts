/* eslint-disable jsdoc/require-jsdoc */

import { iRessourceObject } from './IRessourceObject';

export interface IRessources {
  alarmArmed: iRessourceObject;
  alarmNightModeArmed: iRessourceObject;
  closedAfterMinutes: iRessourceObject;
  fireAlarmEnd: iRessourceObject;
  fireAlarmRepeat: iRessourceObject;
  fireAlarmStart: iRessourceObject;
  goodMorning: iRessourceObject;
  intruderAlarm: iRessourceObject;
  intruderAdditionalDefenseWarning: iRessourceObject;
  intruderGreeting: iRessourceObject;
  intruderLeaveAndOwnerInformed: iRessourceObject;
  intruderShutterUpPleaseLeave: iRessourceObject;
  justClosed: iRessourceObject;
  vibrationAlarm: iRessourceObject;
  waterAlarmEnd: iRessourceObject;
  waterAlarmRepeat: iRessourceObject;
  waterAlarmStart: iRessourceObject;
  wasOpened: iRessourceObject;
  welcomeHome: iRessourceObject;
}
