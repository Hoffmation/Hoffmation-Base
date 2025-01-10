/**
 * The options needed for connecting to an InfluxDB database
 */
export interface InfluxDbConnectionOptions {
  /**
   * The host address of the InfluxDB server (or its ip address)
   */
  host: string;
  /**
   * The port of the InfluxDB server
   */
  port: number;
  /**
   * The name of the database to connect to
   */
  database: string;
  /**
   * The username to use for authentication
   */
  username: string;
  /**
   * The password to use for authentication
   */
  password: string;
  /**
   * The retention policy to use for writing data (if not specified, the default retention policy is used)
   */
  retentionPolicy?: string;
}
