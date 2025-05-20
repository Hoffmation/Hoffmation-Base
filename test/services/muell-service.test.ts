import { MuellService, ServerLogService } from '../../src';

jest.mock('unifi-protect', () => jest.fn()); // Working now, phew
jest.mock('unifi-access', () => jest.fn()); // Working now, phew

describe('MuellService', () => {
  jest.setTimeout(10000);
  ServerLogService.settings.logLevel = -1;
  it('Should download calendar and initialize objects', async () => {
    MuellService.intialize(
      {
        calendarURL: 'https://gelsendienste.abisapp.de/abfuhrkalender?format=ical&street=40E7634F&number=1',
      },
      undefined,
    );
    await new Promise((r) => setTimeout(r, 8000));
    if (MuellService.loadingPending) {
      return;
    }
    expect(MuellService.graueTonne.nextDate).toBeDefined();
    expect(MuellService.brauneTonne.nextDate).toBeDefined();
    expect(MuellService.blaueTonne.nextDate).toBeDefined();
    expect(MuellService.gelbeTonne.nextDate).toBeDefined();
    console.log('Next Graue Tonne for manual test: ', MuellService.graueTonne.nextDate);
  });
});
