const logger = (msg: string) => {}; // console.log(`[EE] ${msg}`);
const es = Symbol("");
const ep = Symbol("");

type ValidKey = string | number;
export class EventEmiter<D = any, T = any> {
  protected [es]: { [key: string]: Set<T> } = Object.create(null);
  protected static [ep]: { [key: string]: EventEmiter<any, any> } =
    Object.create(null);
  protected static find<D = any, T = (data: D) => any>(
    name: string
  ): EventEmiter<D, T> {
    return this[ep][name] || new EventEmiter<D, T>(name);
  }
  constructor(public name: string) {
    if (EventEmiter[ep][name]) {
      return EventEmiter[ep][name];
    }
    EventEmiter[ep][name] = this;
  }
  reflect(obj: any) {
    const t: any = Object.create(null);
    ["on", "emit", "off", "once"].forEach((key) => {
      t[key] = {
        get: () => (this as any)[key].bind(obj),
      };
    });
    Object.defineProperties(obj, t);
  }
  on(ev: ValidKey, cb: T) {
    if (this[es][ev]) {
      this[es][ev].add(cb);
    } else {
      this[es][ev] = new Set([cb]);
    }
  }
  off(ev?: ValidKey, cb?: T) {
    if ((ev && !this[es][ev]) || !ev) {
      return;
    }
    if (!cb) {
      logger(`rm items for ev ${ev}`);
      delete this[es][ev];
    } else if (!ev) {
      this[es] = Object.create(null);
    } else {
      this[es][ev].delete(cb);
    }
  }
  async emit(ev: ValidKey, data?: D) {
    if (this[es][ev]) {
      for (const hand of this[es][ev]) {
        if (typeof hand === "function") {
          logger(`call ${ev} cb`);
          try {
            hand(data);
          } catch (error) {
            console.error(error);
          }
        }
      }
    }
    if (!String(ev).endsWith("@@post")) {
      this.emit(ev + "@@post", data);
    }
  }
  once(ev: ValidKey, cb: any) {
    const ncb: any = (v: any) => {
      cb(v);
      this[es][ev]?.delete(cb);
    };
    return this.on(ev, ncb);
  }
}

export const globalEvents = new EventEmiter("global");
