/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports =
  async () => {
    console.log("Settings timezone to UTC")
    process.env.TZ = 'UTC';
    return {
      preset: 'ts-jest',
      testEnvironment: 'node',
    };
  };