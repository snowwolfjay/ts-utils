import { getLogger } from "../../log";
import { Readyable } from "../../Readyable";
import { Database, Collection } from "./types";

const log = getLogger("loc db");
function setItem(key: string, val: any) {
  localStorage.setItem(key, JSON.stringify(val));
}
function getItem(key: string) {
  try {
    return JSON.parse(localStorage[key]);
  } catch (error: any) {
    delete localStorage[key];
  }
}
function setTempItem(key: string, val: any) {
  sessionStorage.setItem(key, JSON.stringify(val));
}
function getTempItem(key: string) {
  try {
    return JSON.parse(sessionStorage[key] as string);
  } catch (error: any) {
    delete sessionStorage[key];
  }
}
export class LOCALDB {
  private db: Storage;
  constructor(private long = true) {
    this.db = long ? localStorage : sessionStorage;
  }
  public get keys() {
    const t: string[] = [];
    for (let i = 0; i < this.db.length; i++) {
      if (this.db.key(i) !== null) {
        t.push(this.db.key(i) as string);
      }
    }
    return t;
  }
  public get(key: string) {
    return (this.long ? getItem : getTempItem)(key);
  }
  public set(key: string, value: any) {
    return (this.long ? setItem : setTempItem)(key, value);
  }
  public del(key: string) {
    this.db.removeItem(key);
  }
  public clr() {
    log("clear");
    if (typeof this.db.clear === "function") {
      return this.db.clear();
    }
    for (let i = 0; i < this.db.length; i++) {
      this.db.removeItem(this.db.key(i) as string);
    }
  }
}

export const longDB = new LOCALDB();
export const tempDB = new LOCALDB(false);

// tslint:disable-next-line: max-classes-per-file
class LocalDB extends Readyable implements Database {
  public readonly version = 1;
  public name: string;
  public readonly type = "local";
  public readonly prefix: string;
  public isReady() {
    return Promise.resolve();
  }
  public static readonly DB_KEYS = "__hj_LOCAL_DB_NAMES";
  constructor(n: string) {
    super(n);
    this.name = n;
    this.prefix = "hd_" + n;
    try {
      const dbs = JSON.parse(localStorage[LocalDB.DB_KEYS]) as string[];
      if (!dbs.includes(n)) {
        dbs.push(n);
        localStorage.setItem(LocalDB.DB_KEYS, JSON.stringify(dbs));
      }
    } catch (error) {
      localStorage.setItem(LocalDB.DB_KEYS, JSON.stringify([n]));
    }
  }
  private collections: { [key: string]: LocalDBCollection } = {};
  collection<T = any>(name: string) {
    validateKey(name);
    if (this.collections[name]) return this.collections[name];
    const col = new LocalDBCollection<T>(name, this);
    this.collections[name] = col;
    return col;
  }
  public async close() {
    // empty
  }
  public async dbs() {
    let dbs: string[];
    try {
      dbs = JSON.parse(localStorage[LocalDB.DB_KEYS]) as string[];
    } catch (error) {
      dbs = [];
    }
    return dbs.map((v) => ({ name: v, version: 0 }));
  }
  async drop() {
    let dbs: string[];
    try {
      dbs = JSON.parse(localStorage[LocalDB.DB_KEYS]) as string[];
    } catch (error) {
      dbs = [];
    }
    const dbIndex = dbs.findIndex((el) => el === this.name);
    if (dbIndex > -1) {
      dbs.splice(dbIndex, 1);
      localStorage.setItem(LocalDB.DB_KEYS, JSON.stringify(dbs));
    }
    longDB.keys
      .filter((el) => el.startsWith(this.prefix))
      .forEach((key) => {
        localStorage.removeItem(key);
      });
    this.collections = {};
  }
}
function validateKey(e: string) {
  if (typeof e !== "string" || e.indexOf("_") > -1) {
    throw Error("unvliad name with _");
  }
}
class LocalDBCollection<T = any> extends Readyable implements Collection<T> {
  private readonly prefix: string;
  isReady(): Promise<void> {
    return Promise.resolve();
  }
  constructor(public readonly name: string, private readonly db: LocalDB) {
    super(db.prefix + "-" + name);
    this.prefix = db.prefix + "_" + name;
  }
  async keys(): Promise<string[]> {
    return longDB.keys
      .filter((el) => el.startsWith(this.prefix))
      .map((v) => v.slice(this.prefix.length));
  }
  public async get(key: string, def?: T) {
    return longDB.get(this.genkey(key)) ?? def;
  }
  public async set(key: string, val: any) {
    longDB.set(this.genkey(key), val);
    this.emit("set", { key, val });
    return val;
  }
  private genkey(key: string) {
    validateKey(key);
    return this.prefix + "_" + key;
  }
  public async del(key: string) {
    longDB.del(this.genkey(key));
    this.emit("del", key);
    return true;
  }
  async clear() {
    longDB.keys
      .filter((el) => el.startsWith(this.prefix))
      .forEach((key) => {
        localStorage.removeItem(key);
      });
  }
}

export const connectLocalDB = (name: string) => new LocalDB(name);
