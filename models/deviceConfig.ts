export interface deviceConfig {
  type?: ioBroker.ObjectType;
  _id: string;
  ts?: number;
  from?: string;
  native?: any;
  common?: any & { name: string };
}
