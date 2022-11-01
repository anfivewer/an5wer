import {LogLevel} from '@-/types/src/logging/logging';
import {parseLogLine} from './parser';

describe('parseLogLine', () => {
  it('should parse log without props', () => {
    const {
      logLevel,
      logLevelLetter,
      timestampString,
      timestampMilliseconds,
      timestampMicroseconds,
      loggerKey,
      logKey,
      extra,
      props,
    } = parseLogLine('T 2022-03-19T22:35:54.190Z.042 test:key someLogKey');

    expect(logLevel).toBe(LogLevel.TRACE);
    expect(logLevelLetter).toBe('T');
    expect(timestampString).toBe('2022-03-19T22:35:54.190Z.042');
    expect(new Date(timestampMilliseconds).toISOString()).toBe(
      '2022-03-19T22:35:54.190Z',
    );
    expect(timestampMicroseconds).toBe(42);
    expect(loggerKey).toBe('test:key');
    expect(logKey).toBe('someLogKey');
    expect(Array.from(Object.keys(props)).length).toBe(0);
    expect(extra.length).toBe(0);
  });

  it('should parse log with escapes', () => {
    const {logLevel, loggerKey, logKey} = parseLogLine(
      'I 2022-03-19T22:35:54.190Z.042 logger\\ key log\\ key',
    );

    expect(logLevel).toBe(LogLevel.INFO);
    expect(loggerKey).toBe('logger key');
    expect(logKey).toBe('log key');
  });

  it('should parse props', () => {
    const {logLevel, props} = parseLogLine(
      'W 2022-03-19T22:35:54.190Z.042 key key a:1 b:escaped\\ prop c:escaped:prop answer:42',
    );

    expect(logLevel).toBe(LogLevel.WARNING);
    expect(Array.from(Object.entries(props)).sort()).toStrictEqual([
      ['a', '1'],
      ['answer', '42'],
      ['b', 'escaped prop'],
      ['c', 'escaped:prop'],
    ]);
  });

  it('should parse props with extra', () => {
    const {logLevel, props, extra} = parseLogLine(
      'E 2022-03-19T22:35:54.190Z.042 key key a:1 b:2 |extra|space extra|new\\nline\\r\\nextra|escaped\\|extra|final extra',
    );

    expect(logLevel).toBe(LogLevel.ERROR);
    expect(Array.from(Object.entries(props)).sort()).toStrictEqual([
      ['a', '1'],
      ['b', '2'],
    ]);
    expect(extra).toStrictEqual([
      'extra',
      'space extra',
      'new\nline\r\nextra',
      'escaped|extra',
      'final extra',
    ]);
  });

  it('should parse normalized logs', () => {
    const {
      logLevel,
      timestampMilliseconds,
      timestampMicroseconds,
      loggerKey,
      logKey,
      extra,
      props,
    } = parseLogLine('2022-03-19T22:35:54.190Z.042 T test:key someLogKey');

    expect(logLevel).toBe(LogLevel.TRACE);
    expect(new Date(timestampMilliseconds).toISOString()).toBe(
      '2022-03-19T22:35:54.190Z',
    );
    expect(timestampMicroseconds).toBe(42);
    expect(loggerKey).toBe('test:key');
    expect(logKey).toBe('someLogKey');
    expect(Array.from(Object.keys(props)).length).toBe(0);
    expect(extra.length).toBe(0);
  });
});
