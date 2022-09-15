import {dirname} from 'path';
import {BaseComponent} from '@-/types/src/app/component';
import {SessionDumpItem, SessionsDump} from '@-/types/src/sessions/sessions';
import {SingletonAsyncTask} from '@-/util/src/async/singleton';
import {IOError} from '@-/types/src/errors/io';
import {mkdir, readFile, writeFile} from 'fs/promises';
import {Context} from '../types/context';

type SessionInfo = {
  sessionId: string;
  // unixtime seconds
  expirationDate: number;
  bucketId: string;
};

export class Sessions extends BaseComponent {
  private getUnixTimeSeconds!: () => number;
  private sessionsPath!: string;
  private sessions = new Map<string, SessionInfo>();
  private singleton = new SingletonAsyncTask();

  async init({context}: {context: Context}) {
    const {
      config: {sessionsPath},
      getUnixTimeSeconds,
    } = context;

    this.sessionsPath = sessionsPath;
    this.getUnixTimeSeconds = getUnixTimeSeconds;

    const sessionsDirPath = dirname(sessionsPath);
    await mkdir(sessionsDirPath, {recursive: true});

    const data = await (async () => {
      let content: string;

      try {
        content = await readFile(sessionsPath, {encoding: 'utf8'});
      } catch (error) {
        const ioError = IOError.safeParse(error);
        if (!ioError.success) {
          throw error;
        }

        return {
          version: 1,
          buckets: {},
        };
      }

      const json = JSON.parse(content);
      return SessionsDump.parse(json);
    })();

    const now = getUnixTimeSeconds();

    for (const [bucketId, sessionsList] of Object.entries(data.buckets)) {
      sessionsList.forEach(({sessionId, expirationDate}) => {
        if (expirationDate <= now) {
          return;
        }

        this.sessions.set(sessionId, {
          sessionId,
          expirationDate,
          bucketId,
        });
      });
    }
  }

  checkSession({
    bucketId,
    sessionId,
  }: {
    bucketId: string;
    sessionId: string;
  }): boolean {
    const info = this.sessions.get(sessionId);
    if (!info) {
      return false;
    }

    const {bucketId: sessionBucketId, expirationDate} = info;

    const now = this.getUnixTimeSeconds();
    if (expirationDate <= now) {
      this.removeSession(sessionId);
      return false;
    }

    return bucketId === sessionBucketId;
  }

  addSession(session: SessionInfo) {
    this.sessions.set(session.sessionId, session);
  }

  removeSession(sessionId: string) {
    const removed = this.sessions.delete(sessionId);

    if (removed) {
      this.dump();
    }
  }

  private getDump(): SessionsDump {
    const now = this.getUnixTimeSeconds();

    const buckets: SessionsDump['buckets'] = {};

    this.sessions.forEach(({sessionId, bucketId, expirationDate}) => {
      if (expirationDate <= now) {
        return;
      }

      const item: SessionDumpItem = {
        sessionId,
        expirationDate,
      };

      let list = buckets[bucketId];
      if (!list) {
        list = [];
        buckets[bucketId] = list;
      }

      list.push(item);
    });

    return {version: 1, buckets};
  }

  private dump() {
    this.singleton
      .schedule(async () => {
        const dump = this.getDump();

        await writeFile(this.sessionsPath, JSON.stringify(dump), {
          encoding: 'utf8',
        });
      })
      .catch((error) => {
        this.logger.error('dump', undefined, {error});
      });
  }
}
