import { Readyable } from "../../Readyable";

export interface Database extends Readyable {
  readonly version: number;
  close(): Promise<void>;
  collection<T = any>(name: string): Collection<T>;
  isReady(): Promise<void>;
  dbs(): Promise<Array<{ name: string; version: number }>>;
  type: "local" | "indexdb";
  drop(): Promise<void>;
}

export interface Collection<D = any> extends Readyable {
  get(key: string, def?: D): Promise<D | null>;
  set(key: string, val: D, actionId?: string): Promise<boolean>;
  del(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
  isReady(): Promise<void>;
  findOne?(selector: any, options: any): Promise<D | null>;
  find?(selector: any, options: any): Promise<D[]>;
}
