export type teardown =
  | Function
  | DestroyableTearDown
  | StopableTearDown
  | UnsubaleTearDown;

interface DestroyableTearDown {
  destroy(): void;
}
interface StopableTearDown {
  stop(): void;
}
interface UnsubaleTearDown {
  unsubscribe(): void;
}
const voidFun = () => {};
export class Endable {
  protected clears = new Set<Teardown>();
  public debug = false;
  constructor() {}
  public track(fun: () => teardown | void, name = "") {
    let t: any;
    if (typeof fun === "function") {
      t = fun();
    } else {
      t = fun;
    }
    return this.addEnder(t, name);
  }
  public addEnder(ender: teardown, name = "") {
    if (!ender) return voidFun;
    const teardown = new Teardown(ender, name);
    this.clears.add(teardown);
    return () => {
      this.exeEnder(teardown);
    };
  }
  public end() {
    this.clears.forEach((el: any) => {
      this.exeEnder(el);
    });
  }
  protected exeEnder(el: Teardown) {
    if (el.name && this.debug) {
      console.info(`exec end ${el.name}`);
    }
    this.safeExec(el.exec);
    this.clears.delete(el);
  }
  public safeExec(c: any) {
    if (typeof c === "function") {
      try {
        return c();
      } catch (error) {
        // error ignore
      }
    }
  }
}

class Teardown {
  public exec: any;
  constructor(el: any, public name = "") {
    if (!el) this.exec = voidFun;
    else if (typeof el === "function") this.exec = el;
    else if (typeof el.stop === "function") this.exec = el.stop.bind(el);
    else if (typeof el.destroy === "function") this.exec = el.destroy.bind(el);
    else if (typeof el.unsubscribe === "function")
      this.exec = el.unsubscribe.bind(el);
    else this.exec = voidFun;
  }
}
