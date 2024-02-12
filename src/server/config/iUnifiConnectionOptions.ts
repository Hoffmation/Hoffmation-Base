export interface iUnifiConnectionOptions {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  token2FA?: string;
  site?: string;
  sslverify?: boolean;
  timeout?: number;
  rememberMe?: boolean;
}
