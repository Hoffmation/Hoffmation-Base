module.exports = async () => {
  // UTC stays the default so existing tests keep their fixed offsets. Tests that need to observe
  // daylight saving behaviour opt in explicitly through jest.dst.config.js, because process.env.TZ set inside
  // a test file never reaches V8 - the zone is resolved once, before the workers start.
  const timezone = process.env.HOFFMATION_TEST_TZ ?? 'UTC';
  console.log(`Settings timezone to ${timezone}`);
  process.env.TZ = timezone;
  return {
    preset: 'ts-jest',
    transform: { '^.+\\.jsx?$': 'babel-jest' },
    testEnvironment: 'node',
  };
};
