const base = require('./jest.config');

module.exports = async () => {
  // The default configuration, only in a zone that observes daylight saving, for the tests that have to see a
  // clock jump. Selected through --config rather than an inline "TZ=... jest" assignment: that form is not
  // portable to Windows cmd, and this is a published library whose test script has to run there too.
  process.env.HOFFMATION_TEST_TZ = 'Europe/Berlin';
  return base();
};
