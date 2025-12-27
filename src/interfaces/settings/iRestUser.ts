/**
 *
 */
export interface iRestUser {
  /**
   *
   */
  username: string;
  /**
   *
   */
  passwordHash: string;
  /**
   *
   */
  publicKey: string;
  /**
   *
   */
  permissions: string[];
}
