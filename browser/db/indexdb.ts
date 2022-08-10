import { toClonableValue } from "../../base";
import { getLogger } from "../../log";
import { Readyable } from "../../Readyable";
import { TaskQueue } from "../../TaskQueue";
import { Collection, Database } from "./types";

type DBOpenHandlers = {
  error?: (err: any) => void;
  open?: (db: IDBDatabase) => void;
  upgrade?: (db: IDBDatabase, transaction: IDBTransaction) => void;
};
function openDatabase(name: string, version = 1, handlers: DBOpenHandlers) {
  const DBOpenRequest = window.indexedDB.open(name, version);
  DBOpenRequest.onerror = (e) => {
    console.error("error", e);
    handlers?.error?.(e);
  };
  DBOpenRequest.onsuccess = (e) => {
    console.error("success", e);
    handlers?.open?.(DBOpenRequest.result);
  };
  DBOpenRequest.onupgradeneeded = (e) => {
    console.error("upgrade", e);
    handlers?.upgrade?.(DBOpenRequest.result, DBOpenRequest.transaction!);
  };
  DBOpenRequest.onblocked = (e) => {
    console.error("blocked", e);
    handlers?.error?.(e);
  };
}
function setVal(store: IDBObjectStore, key: string, val: any) {
  return new Promise<[true, DOMException] | [false, any]>((res, rej) => {
    const req = store.put(val, key);
    req.onerror = () => {
      res([true, req.error!]);
    };
    req.onsuccess = () => {
      res([false, req.result]);
    };
  });
}
function get(store: IDBObjectStore, key: string) {
  return new Promise<[boolean, any]>((res) => {
    const req = store.get(key);
    req.onerror = (e) => {
      res([true, e]);
    };
    req.onsuccess = (e) => {
      res([false, req.result]);
    };
  });
}
function delKey(store: IDBObjectStore, key: string) {
  return new Promise<[boolean, any]>((res) => {
    const req = store.delete(key);
    req.onerror = (e) => {
      res([true, e]);
    };
    req.onsuccess = (e) => {
      res([false, req.result]);
    };
  });
}
function keys(store: IDBObjectStore) {
  return new Promise<string[]>((res) => {
    const req = store.getAllKeys();
    req.onerror = (e) => {
      res([]);
    };
    req.onsuccess = (e) => {
      res(req.result as any);
    };
  });
}
function reset(name: string) {
  if (isUndef(name)) throw Error(`need collection name`);
  return new Promise<[boolean, any]>((res) => {
    const req = indexedDB.deleteDatabase(name);
    req.onerror = (e) => {
      res([true, e]);
    };
    req.onsuccess = (e) => {
      res([false, req.result]);
    };
  });
}
class IndexDB extends Readyable implements Database {
  private _version!: number;
  public db!: IDBDatabase;
  public readonly type = "indexdb";
  public get version() {
    return this._version;
  }
  constructor(public readonly name: string) {
    super(name);
    if (isUndef(name)) throw Error(`need db name`);
    this._version = Math.max(
      Number(localStorage.getItem(`idbv_${name}`) ?? 1),
      1
    );
    this.init();
  }
  public async close() {
    await this.isReady();
    return this.db.close();
  }
  private collections: { [key: string]: IndexDBCollection } = {};
  public collection(name: string) {
    if (isUndef(name)) throw Error(`need collection name`);
    if (this.collections[name]) return this.collections[name];
    const col = new IndexDBCollection(this, name);
    this.collections[name] = col;
    return col;
  }
  public async dbs() {
    const list = await indexedDB.databases();
    return list.map((v) => ({ name: v.name ?? "", version: v.version ?? 1 }));
  }
  async drop() {
    await reset(this.name);
    this.collections = {};
  }
  public async init(retryCount = 1) {
    openDatabase(this.name, this.version, {
      open: (db) => {
        this.db = db;
        this.ready = true;
        localStorage["idbv_" + this.name] = this.version;
      },
      error: () => {
        this._version += 1;
        retryCount++ < 10 &&
          setTimeout(() => {
            this.init();
          }, 2000);
      },
      upgrade: (db) => {
        db.close();
        this.init();
      },
    });
  }
  public async upgrade(store: string) {
    if (!this.ready) {
      return;
    }
    this.ready = false;
    this._version += 1;
    this.db.close();
    Object.keys(this.collections).forEach((key) => {
      this.collections[key].ready = false;
    });
    return new Promise((res) => {
      openDatabase(this.name, this._version, {
        upgrade: (db) => {
          db.createObjectStore(store);
          this._version = db.version;
          db.close();
          openDatabase(this.name, this.version, {
            open: (db) => {
              this.db = db;
              localStorage["idbv_" + this.name] = this.version;
              this.ready = true;
              res(this);
            },
          });
        },
      });
    });
  }
}
class IndexDBCollection<T = any> extends Readyable implements Collection<T> {
  constructor(
    private db: IndexDB,
    public readonly name: string,
    public readonly keyPath?: string[] | string
  ) {
    super(`${db.name}+${name}`);
    this.init();
  }
  private init() {
    console.error(`init collection ${this.name}`);
    this.db.isReady().then(async () => {
      const idb = this.db.db;
      console.log(`db ready---------------------------`);
      if (idb.objectStoreNames.contains(this.name)) {
        this.ready = true;
        return;
      }
      console.log(`start create at upgrade`);
      this.db.upgrade(this.name);
      this.init();
    });
  }
  private async getTrans(kind: IDBTransactionMode) {
    console.error(`get transe`);
    await this.isReady();
    this.ready = false;
    console.error(`geted transe`);
    const trans = this.db.db.transaction(this.name, kind);
    return trans;
  }
  public async get(key: string, def?: T) {
    if (isUndef(key)) return def;
    const trans = await this.getTrans("readonly");
    const store = trans.objectStore(this.name);
    const [err, res] = await get(store, key);
    trans.commit();
    return err ? def : res;
  }
  public async set(key: string, val: T, id?: string) {
    val = ((window as any).structuredClone || toClonableValue)(val);
    if (isUndef(key) || isUndef(val)) return false;
    if (!id) {
      return this.runSet(key, val);
    }
    console.error(`add a set to queue ${id}`);
    const prom = TaskQueue.get(`db-set-${this.name}`).push<boolean>(
      async () => {
        console.log(`run in queue ${id}`);
        const ok = await this.runSet(key, val);
        console.error(`set key ${ok}`);
        return ok;
      },
      id
    ).done;
    console.error(prom);
    return await prom;
  }
  private async runSet(key: string, val: T) {
    console.error(`run a set val`);
    const trans = await this.getTrans("readwrite");
    if (typeof val === "object" && val) {
      val = Object.assign(Object.create(null), val);
    }
    const store = trans.objectStore(this.name);
    const [err] = await setVal(store, key, val);
    console.error(`run a set val @@@@@@@@@@@@@@@@@@@@@@@@@@@`);
    trans.commit();
    this.ready = true;
    this.emit("set", { key, val });
    return !err;
  }
  public async keys() {
    const trans = await this.getTrans("readonly");
    const store = trans.objectStore(this.name);
    let list: string[];
    try {
      list = await keys(store);
    } catch (error) {
      list = [];
    }
    trans.commit();
    return list;
  }
  public async del(key: string) {
    if (isUndef(key)) throw Error(`need del key`);
    const trans = await this.getTrans("readwrite");
    const store = trans.objectStore(this.name);
    const e = await delKey(store, key);
    trans.commit();
    this.ready = true;
    this.emit("del", key);
    return e[0];
  }
  async clear(): Promise<void> {
    const trans = await this.getTrans("readwrite");
    const store = trans.objectStore(this.name);
    const list = await keys(store);
    const req = store.delete(list);
    const ok = await new Promise((res) => {
      req.onsuccess = () => res(1);
      req.onerror = () => res(0);
    });
    ok ? trans.commit() : trans.abort();
    this.ready = true;
  }
}
const isUndef = (v: any) => v === null || v === undefined;

export const connectIndexDB = (name: string) => new IndexDB(name);
