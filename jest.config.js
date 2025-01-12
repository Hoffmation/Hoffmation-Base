module.exports = async () => {
  console.log('Settings timezone to UTC');
  process.env.TZ = 'UTC';
  return {
    preset: 'ts-jest',
    transform: { '^.+\\.jsx?$': 'babel-jest' },
    testEnvironment: 'node',
  };
};
