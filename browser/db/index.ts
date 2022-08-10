import { getLogger } from "../../log";
import { connectIndexDB } from "./indexdb";
import { connectLocalDB } from "./localstorage";
const log = getLogger("db");
let _open: (name: string) => Database;
if (typeof indexedDB !== undefined) {
  log("support indexedDB");
  _open = connectIndexDB;
} else {
  _open = connectLocalDB;
}
import { SIMDB } from "./SIMDB";
import { Database } from "./types";
export * from "./types";
const dbs = {} as { [key: string]: Database };
export const connectAsyndb = (name: string) => {
  if (dbs[name]) return dbs[name];
  const db = _open(name);
  dbs[name] = db;
  return db;
};
export const connectMinidb = (name?: string, long = true) =>
  SIMDB.connect(name, long);
