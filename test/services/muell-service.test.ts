import { MuellService, ServerLogService } from '../../src';

describe('MuellService', () => {
  jest.setTimeout(10000);
  ServerLogService.settings.logLevel = -1;
  it('Should download calendar and initialize objects', async () => {
    MuellService.intialize(
      {
        calendarURL: 'https://gelsendienste.abisapp.de/abfuhrkalender?format=ical&street=CDB7055D&number=1',
      },
      undefined,
    );
    await new Promise((r) => setTimeout(r, 5000));
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
