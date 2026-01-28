import {makeAutoObservable, runInAction} from 'mobx';
import {LocalStorageChunksLoader} from '../loaders/localStorage';
import {currentDay} from '../../../../../packages/types/src/date';
import {
  ChunkId,
  PersistTodo,
  TodoId,
  V1_ROOT_CHUNK,
} from '@-/lazy-planner-types/src/persist';

export class PersistStore {
  #localStorageLoader = new LocalStorageChunksLoader({prefix: 'lazyPlanner'});
  error: unknown = null;
  todos = new Map<TodoId, PersistTodo>();

  constructor() {
    makeAutoObservable(this);

    this.#init().catch((error) => {
      runInAction(() => {
        this.error = error;
      });
    });
  }

  updateTodo(todo: PersistTodo) {
    const prevTodo = this.todos.get(todo.id);

    if (!prevTodo) {
      this.todos.set(todo.id, todo);
      return;
    }

    const pick = <T>(
      changeA: T extends undefined
        ? {counter: number; value?: T}
        : {counter: number; value: T},
      changeB: T extends undefined
        ? {counter: number; value?: T}
        : {counter: number; value: T},
    ) => {
      return changeA.counter >= changeB.counter ? changeA : changeB;
    };

    const newTodo: PersistTodo = {
      version: 1,
      id: todo.id,
      estimateDuration: pick(prevTodo.estimateDuration, todo.estimateDuration),
      isCompleted: pick(prevTodo.isCompleted, todo.isCompleted),
      startFrom: pick(prevTodo.startFrom, todo.startFrom),
      title: pick(prevTodo.title, todo.title),
      nextVersionFields: {},
      history: [],
      tags: {
        add: [],
        remove: [],
      },
    };
  }

  async #init() {
    const meta = await this.#localStorageLoader.loadMetaChunk();
    const currentClient = meta.clients[this.#localStorageLoader.clientId] || {
      id: this.#localStorageLoader.clientId,
      lastActive: currentDay(),
      maxVersion: 1,
      lastChunk: V1_ROOT_CHUNK.metadata.id,
    };

    const {lastChunk} = currentClient;

    const loadedChunks = new Set<ChunkId>();
    const chunksToLoad = new Set<ChunkId>();
    chunksToLoad.add(lastChunk);

    while (chunksToLoad.size) {
      const chunkId = chunksToLoad.keys().next().value;
      if (!chunkId) {
        break;
      }

      chunksToLoad.delete(chunkId);

      if (loadedChunks.has(chunkId)) {
        continue;
      }

      loadedChunks.add(chunkId);

      const chunk = await this.#localStorageLoader.loadChunk(chunkId);
      if (!chunk) {
        continue;
      }

      chunk.metadata.parentIds.forEach((chunkId) => {
        chunksToLoad.add(chunkId);
      });

      for (const todo of Object.values(chunk.data.todos)) {
        if (!todo) {
          continue;
        }

        this.updateTodo(todo);
      }
    }
  }
}
