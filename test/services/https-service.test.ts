// Imported by module path rather than through the package barrel: the barrel pulls in every device, and a
// device that is being changed in parallel would fail this suite for a reason that has nothing to do with it.
// The logging barrel has to come first - it and the utils barrel reference each other, and only this
// direction has the ring storage in place by the time the log service initialises its static field.
import { ServerLogService } from '../../src/logging';
import { HTTPSOptions } from '../../src/services/HTTPSOptions';
import { HTTPSService } from '../../src/services/https-service';
import { LogLevel } from '../../src/enums';
import { EventEmitter } from 'events';
import HTTPS from 'https';
import { IncomingMessage } from 'http';
// Default import rather than a namespace one: a namespace is a set of non-configurable getters, so a spy
// cannot be put on it. This one is the module object itself - the same one the service reads through.
import fs from 'fs';

jest.mock('unifi-access', () => jest.fn());

/** The city coordinate of the test data - a city, not an installation. */
const CITY_LATITUDE: string = '52.03';
const CITY_LONGITUDE: string = '8.53';
/**
 * A placeholder, never a real key - the last case below asserts that exactly this string is *absent* from
 * every log line, so no case here ever needs a real one.
 */
const PLACEHOLDER_APPID: string = 'test-appid-placeholder';
/** The milliseconds `HTTPSService.request` waits between two attempts. */
const RETRY_DELAY_MS: number = 100;

/**
 * Stands in for the outgoing request `https.request` hands back: an emitter the case drives, plus the three
 * methods the service calls on it.
 */
interface iFakeRequest extends EventEmitter {
  write: jest.Mock;
  end: jest.Mock;
  destroy: jest.Mock;
}

/** The attempts `HTTPSService.request` has made, oldest first. */
let attempts: iFakeRequest[] = [];
/** The response handler of each attempt, in the same order. */
let responseHandlers: ((res: IncomingMessage) => void)[] = [];
/** Everything that reached `ServerLogService.writeLog` while a case ran. */
let logged: string[] = [];
/** The `timeout` each attempt was configured with, in the same order as {@link attempts}. */
let timeoutsConfigured: (number | undefined)[] = [];
let httpsSpy: jest.SpyInstance | undefined;
let logSpy: jest.SpyInstance | undefined;

/**
 * Builds the request options the cases work with: a redacted path for the constructor and the real query -
 * carrying coordinate and key - assigned afterwards, exactly as every caller of the service assembles them.
 * @returns - The options of one request
 */
function createOptions(): HTTPSOptions {
  const options: HTTPSOptions = new HTTPSOptions('api.openweathermap.org', '/data/3.0/onecall (test)', {}, 'GET', 443);
  options.path = `/data/3.0/onecall?lat=${CITY_LATITUDE}&lon=${CITY_LONGITUDE}&appid=${PLACEHOLDER_APPID}&units=metric`;
  return options;
}

/**
 * Answers the attempt at the given index: pushes the body, then ends the response.
 * @param index - Which attempt to answer, oldest first
 * @param body - The body the endpoint answers with
 * @param statusCode - The status code it answers with
 */
function answer(index: number, body: string, statusCode: number): void {
  const res: EventEmitter = new EventEmitter();
  (res as unknown as IncomingMessage).statusCode = statusCode;
  responseHandlers[index](res as unknown as IncomingMessage);
  res.emit('data', Buffer.from(body));
  res.emit('end');
}

/**
 * Lets the attempt at the given index fail the way an unreachable endpoint does, and runs the retry delay out
 * so the next attempt - if the service makes one - has been started when this returns.
 * @param index - Which attempt to fail, oldest first
 */
async function failAttempt(index: number): Promise<void> {
  // No path and no key in the message: a real socket error carries neither, and a case that smuggled them in
  // would make the log line assertion below pass for the wrong reason.
  attempts[index].emit('error', new Error('connect ECONNREFUSED'));
  await jest.advanceTimersByTimeAsync(RETRY_DELAY_MS + 1);
}

beforeEach(() => {
  attempts = [];
  responseHandlers = [];
  logged = [];
  timeoutsConfigured = [];
  logSpy = jest.spyOn(ServerLogService, 'writeLog').mockImplementation((_level: LogLevel, message: string): void => {
    logged.push(message);
  });
  httpsSpy = jest.spyOn(HTTPS, 'request').mockImplementation(((
    options: { timeout?: number },
    responseHandler: (res: IncomingMessage) => void,
  ): iFakeRequest => {
    const req: iFakeRequest = new EventEmitter() as iFakeRequest;
    req.write = jest.fn();
    req.end = jest.fn();
    // What `destroy` does in node: with an error it emits it, which is how an aborted request reaches the
    // `error` handler that would otherwise never hear of it.
    req.destroy = jest.fn((error?: Error): void => {
      if (error !== undefined) {
        req.emit('error', error);
      }
    });
    // ... and what the `timeout` option does: node emits `timeout` on the request once its socket has been
    // idle for that long and leaves it entirely to the listener what to become of the request. Modelled
    // here, so a case can let an endpoint accept the connection and then say nothing. Without the option
    // there is no such event - which is exactly the state a silent endpoint hangs the caller in.
    if (options.timeout !== undefined) {
      setTimeout(() => req.emit('timeout'), options.timeout);
    }
    timeoutsConfigured.push(options.timeout);
    attempts.push(req);
    responseHandlers.push(responseHandler);
    return req;
  }) as unknown as typeof HTTPS.request);
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  httpsSpy?.mockRestore();
  logSpy?.mockRestore();
});

/**
 * Every way out of a request ends in the callback, exactly once.
 *
 * A caller wraps this callback in a promise, and a promise that never settles is not a failed request - it is
 * a caller that is gone until the process restarts, with whatever running flag it holds still set.
 */
describe('the callback of HTTPSService.request', () => {
  it('is called once when the retries are used up', async () => {
    // The core case: an endpoint that never answers. Every attempt fails, and after the last one the caller
    // has to hear about it - otherwise it waits forever.
    const callback = jest.fn();

    HTTPSService.request(createOptions(), '', 2, callback);
    await failAttempt(0);
    await failAttempt(1);
    await failAttempt(2);

    // Three attempts: the first one plus the two retries. Without this the case would also pass for a service
    // that gave up immediately.
    expect(attempts).toHaveLength(3);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('is called with something no caller can read as a successful answer', async () => {
    const callback = jest.fn();

    HTTPSService.request(createOptions(), '', 0, callback);
    await failAttempt(0);

    expect(callback).toHaveBeenCalledTimes(1);
    const [body, statusCode] = callback.mock.calls[0] as [string, number];
    // Not 200, and not anywhere in the range a caller checks for success. A failure that arrives as a status
    // code of the successful range is worse than no answer at all: it is believed.
    expect(statusCode).not.toBe(200);
    expect(statusCode >= 200 && statusCode < 300).toBe(false);
    // ... and not an empty body either, which a caller that only looks at the body would take for an answer
    // that simply carried nothing.
    expect(body).not.toBe('');
  });

  it('is called exactly once when the failing answer ends afterwards', async () => {
    // An error on the response ends the request just as much as one on the socket does, and an `end` event
    // may or may not follow it. Without this the caller waits forever for a request that is already over -
    // and when both ways out fire for the same request, two calls would hand the caller a failure and then a
    // torso of an answer, a new fault class in place of the old one.
    const callback = jest.fn();

    HTTPSService.request(createOptions(), '', 2, callback);
    const res: EventEmitter = new EventEmitter();
    (res as unknown as IncomingMessage).statusCode = 200;
    responseHandlers[0](res as unknown as IncomingMessage);
    res.emit('data', Buffer.from('{"partial":'));
    res.emit('error', new Error('aborted'));
    res.emit('end');
    await jest.advanceTimersByTimeAsync(RETRY_DELAY_MS + 1);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][1]).not.toBe(200);
  });

  it('is not called a second time when the socket fails after the answer arrived', async () => {
    // A socket error can still turn up once the response has ended. It must neither reach the caller a second
    // time nor start a retry chain that would call the callback again from its own end.
    const callback = jest.fn();

    HTTPSService.request(createOptions(), '', 2, callback);
    answer(0, '{"ok":true}', 200);
    attempts[0].emit('error', new Error('socket hang up'));
    await jest.advanceTimersByTimeAsync(RETRY_DELAY_MS + 1);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('{"ok":true}', 200);
    expect(attempts).toHaveLength(1);
  });

  it('still answers from a retry rather than from the attempt that failed', async () => {
    // The retry chain keeps working, and the answer of the attempt that carried it is the one the caller
    // gets - once, not once per attempt.
    const callback = jest.fn();

    HTTPSService.request(createOptions(), '', 2, callback);
    await failAttempt(0);
    answer(1, '{"cloud_cover":{"afternoon":8}}', 200);
    await jest.advanceTimersByTimeAsync(1);

    expect(attempts).toHaveLength(2);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('{"cloud_cover":{"afternoon":8}}', 200);
  });

  it('carries the post data of the caller into every attempt', async () => {
    // The retry has to send what the first attempt sent, otherwise a request that only succeeds on the second
    // try arrives empty.
    HTTPSService.request(createOptions(), '{"body":true}', 1, jest.fn());
    await failAttempt(0);

    expect(attempts).toHaveLength(2);
    expect(attempts[0].write).toHaveBeenCalledWith('{"body":true}');
    expect(attempts[1].write).toHaveBeenCalledWith('{"body":true}');
  });

  it('names neither the path nor the key of the request in a log line', async () => {
    // The path carries key and coordinate, and this repository is public. A line about the failure that
    // quoted the request would undo the redaction its callers assemble their options for.
    HTTPSService.request(createOptions(), '', 1, jest.fn());
    await failAttempt(0);
    await failAttempt(1);

    // The request really does carry key and coordinate. Without this half a case whose options were empty
    // would satisfy the assertion below while proving nothing.
    expect(createOptions().path).toContain(PLACEHOLDER_APPID);
    logged.forEach((message: string) => {
      expect(message).not.toContain(PLACEHOLDER_APPID);
      expect(message).not.toContain(CITY_LATITUDE);
      expect(message).not.toContain(CITY_LONGITUDE);
    });
    // ... and the failure is still reported, so the redaction is not achieved by saying nothing at all.
    expect(logged.some((message: string) => message.includes('after retries'))).toBe(true);
  });
});

/**
 * An endpoint that never accepts the connection fails the socket, and the retry chain above hangs off that.
 * An endpoint that accepts it and then says nothing produces no event at all: no error, no response, nothing
 * to retry on and nothing to report. Without a limit of its own the request simply stays open, and with it
 * every caller that waits on the callback.
 */
describe('the time limit of HTTPSService.request', () => {
  /**
   * Longer than any limit the service could sensibly set on a single attempt, times the attempts a chain of
   * one retry makes. A case waits this long so it does not have to know the number the service chose - only
   * that there is one.
   */
  const A_LONG_SILENCE_MS: number = 5 * 60 * 1000;

  it('ends a request the endpoint left unanswered, spending its retries on the silence', async () => {
    const callback = jest.fn();

    HTTPSService.request(createOptions(), '', 1, callback);
    // No error and no response - the connection stands and nothing comes back over it.
    await jest.advanceTimersByTimeAsync(A_LONG_SILENCE_MS);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][1]).toBe(HTTPSService.failureStatusCode);
    // Silence is worth retrying - it is what a momentarily overloaded endpoint does. The chain has to run
    // through, and each attempt has to carry the limit: one that dropped it would hang the whole chain.
    expect(attempts).toHaveLength(2);
    timeoutsConfigured.forEach((timeout: number | undefined) => {
      expect(typeof timeout).toBe('number');
      expect(timeout as number).toBeGreaterThan(0);
    });
  });

  it('keeps a fully silent chain shorter than the cadence of its callers', () => {
    // The limit bounds one attempt, but what a caller waits for is the whole chain. The periodic caller with
    // the tightest cadence is the weather service at ten minutes; the default of five retries makes six
    // attempts. If those ever exceeded the cadence, the next request would start on top of a running one.
    const attemptsOfDefaultChain: number = 6;
    const tightestCallerCadenceMs: number = 10 * 60 * 1000;

    expect(HTTPSService.requestTimeoutMs).toBeGreaterThan(0);
    expect(HTTPSService.requestTimeoutMs * attemptsOfDefaultChain).toBeLessThan(tightestCallerCadenceMs);
  });

  it('leaves the request of an answering endpoint alone', async () => {
    // The successful path keeps its shape: an answer that arrives in time is handed on, and nothing about
    // the request is torn down behind it.
    const callback = jest.fn();

    HTTPSService.request(createOptions(), '', 5, callback);
    answer(0, '{"cloud_cover":{"afternoon":8}}', 200);
    // Past the limit, because the socket of a delivered request goes idle by definition and the limit is
    // still running on it. What was answered stays answered, and it is not the callback alone that has to
    // hold: nothing may be torn down behind it either.
    await jest.advanceTimersByTimeAsync(HTTPSService.requestTimeoutMs + 1);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('{"cloud_cover":{"afternoon":8}}', 200);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].destroy).not.toHaveBeenCalled();
  });
});

/**
 * Stands in for the two streams of a download: the response it is read from and the file it is written to.
 * Both are emitters a case drives, plus the methods the service calls on them.
 */
interface iFakeStream extends EventEmitter {
  destroy: jest.Mock;
  pipe: jest.Mock;
}

/**
 * A download ends in a promise, and every way it can end has to reach that promise. Two of them do not run
 * through the response at all: the disk the file is written to can fail, and the answer can break off once it
 * is already being piped into that file.
 */
describe('the promise of HTTPSService.downloadFile', () => {
  /** Neither is a real one - the cases below assert that both stay out of every line about a failure. */
  const DOWNLOAD_URL: string = 'https://feed.example.org/episodes/latest-episode.mp3';
  const TARGET_PATH: string = '/var/tmp/hoffmation-test/latest-episode.mp3';

  let file: iFakeStream;
  let response: iFakeStream;
  let downloadRequest: iFakeStream;
  /** Every path `fs.unlink` was asked to remove while a case ran. */
  let unlinked: string[] = [];
  let fsSpies: jest.SpyInstance[] = [];
  let getSpy: jest.SpyInstance | undefined;
  let responseHandler: (res: IncomingMessage) => void;

  /**
   * Builds one of the fake streams.
   * @returns - An emitter carrying the methods the service calls on a stream
   */
  function createStream(): iFakeStream {
    const stream: iFakeStream = new EventEmitter() as iFakeStream;
    stream.destroy = jest.fn();
    stream.pipe = jest.fn();
    return stream;
  }

  /**
   * Starts a download and drives it up to the point where the answer is being piped into the file.
   * @returns - The promise of the running download
   */
  function startDownload(): Promise<boolean> {
    const running: Promise<boolean> = HTTPSService.downloadFile(DOWNLOAD_URL, TARGET_PATH);
    const incoming: IncomingMessage = response as unknown as IncomingMessage;
    incoming.statusCode = 200;
    incoming.headers = { 'content-type': 'audio/mpeg', 'content-length': '1024' };
    responseHandler(incoming);
    return running;
  }

  /**
   * Waits for a download to end, whichever way it does.
   * @param running - The promise of the download
   * @returns - What it resolved to, or the error it rejected with
   */
  async function outcomeOf(running: Promise<boolean>): Promise<boolean | Error> {
    return running.catch((reason: Error) => reason);
  }

  beforeEach(() => {
    unlinked = [];
    file = createStream();
    response = createStream();
    downloadRequest = createStream();
    fsSpies = [
      jest.spyOn(fs, 'existsSync').mockReturnValue(true),
      jest.spyOn(fs, 'createWriteStream').mockImplementation((() => file) as unknown as typeof fs.createWriteStream),
      jest.spyOn(fs, 'unlink').mockImplementation(((target: string, callback: () => void): void => {
        unlinked.push(target);
        callback();
      }) as unknown as typeof fs.unlink),
    ];
    getSpy = jest.spyOn(HTTPS, 'get').mockImplementation(((
      _url: string,
      handler: (res: IncomingMessage) => void,
    ): iFakeStream => {
      responseHandler = handler;
      return downloadRequest;
    }) as unknown as typeof HTTPS.get);
  });

  afterEach(() => {
    fsSpies.forEach((spy: jest.SpyInstance) => spy.mockRestore());
    getSpy?.mockRestore();
  });

  it('ends when the file cannot be written', async () => {
    // A full disk fails the write stream and nothing else: the answer is fine, the request is fine. With
    // nobody listening on that stream the event goes unhandled and the promise is never settled either way.
    const running: Promise<boolean> = startDownload();
    const writeFailure: Error = Object.assign(
      // The message of a real one quotes the file it was writing - which is why none of it may be passed on.
      new Error(`ENOSPC: no space left on device, write '${TARGET_PATH}'`),
      { code: 'ENOSPC' },
    );

    file.emit('error', writeFailure);
    const outcome: boolean | Error = await outcomeOf(running);

    expect(outcome).toBeInstanceOf(Error);
    // The torso is cleaned up, exactly as it is when the request fails - a half written file that stays
    // behind is taken for a finished download the next time round.
    expect(unlinked).toEqual([TARGET_PATH]);
  });

  it('names neither the file nor the address when the file cannot be written', async () => {
    const running: Promise<boolean> = startDownload();

    file.emit(
      'error',
      Object.assign(new Error(`EACCES: permission denied, open '${TARGET_PATH}'`), { code: 'EACCES' }),
    );
    const outcome: boolean | Error = await outcomeOf(running);

    // The reason is still recognisable - the failure is reported, not swallowed.
    expect((outcome as Error).message).toContain('EACCES');
    // ... but what it was writing where is not repeated, neither into the reason nor into a log line.
    expect((outcome as Error).message).not.toContain(TARGET_PATH);
    expect((outcome as Error).message).not.toContain(DOWNLOAD_URL);
    logged.forEach((message: string) => {
      expect(message).not.toContain(TARGET_PATH);
      expect(message).not.toContain(DOWNLOAD_URL);
    });
  });

  it('ends when the answer breaks off while it is being written', async () => {
    // The response is already piping into the file at this point, so neither the handler of the request nor
    // the `finish` of the file will fire. Without a listener of its own the promise stays pending forever.
    const running: Promise<boolean> = startDownload();

    response.emit('error', new Error('aborted'));
    const outcome: boolean | Error = await outcomeOf(running);

    expect(outcome).toBe(false);
    expect(unlinked).toEqual([TARGET_PATH]);
  });

  it('keeps the finished file when the request fails afterwards', async () => {
    // The successful path keeps its shape - and a socket error can still turn up once the file is written.
    // The download is over at that point, and the clean up of a failed one must not take the file with it.
    const running: Promise<boolean> = startDownload();
    file.emit('finish');
    await expect(running).resolves.toBe(true);

    downloadRequest.emit('error', new Error('socket hang up'));

    expect(unlinked).toEqual([]);
  });
});
