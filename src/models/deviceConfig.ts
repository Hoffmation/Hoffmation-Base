export interface deviceConfig {
  type?: ioBroker.ObjectType;
  _id: string;
  ts?: number;
  from?: string;
  native?: unknown;
  common?: unknown & { name: string };
}
