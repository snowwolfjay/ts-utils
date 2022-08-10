import { EventEmiter } from "./event";

export class Readyable extends EventEmiter {
  private ReadySymbol = "__ready@";
  private _ready = false;
  public get ready() {
    return this._ready;
  }
  public set ready(v) {
    if (v) {
      this.emit(this.ReadySymbol);
    }
    this._ready = v;
  }
  public isReady() {
    return new Promise<void>((resolve) => {
      if (this._ready) resolve();
      else
        this.once(this.ReadySymbol, () => {
          resolve();
        });
    });
  }
  public pipeReady(v: { ready: boolean }) {
    this.isReady().then(() => (v.ready = true));
  }
}
