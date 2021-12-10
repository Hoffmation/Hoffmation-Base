import { MuellService } from '../../src/server/services/calendar/müll-service';
import { ServerLogService } from '../../src/server/services/log-service';

describe('Test Muell Service', () => {
  jest.setTimeout(10000);
  ServerLogService.logLevel = -1;
  it('Should download calendar and initialize objects', async () => {
    MuellService.intialize(
      {
        calendarURL: 'https://gelsendienste.abisapp.de/abfuhrkalender?format=ical&street=CDB7055D&number=1',
      },
      undefined,
    );
    await new Promise((r) => setTimeout(r, 5000));
    expect(MuellService.graueTonne.nextDate).toBeDefined();
    expect(MuellService.brauneTonne.nextDate).toBeDefined();
    expect(MuellService.blaueTonne.nextDate).toBeDefined();
    expect(MuellService.gelbeTonne.nextDate).toBeDefined();
  });
});
