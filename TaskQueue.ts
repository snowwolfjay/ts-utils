export class TaskQueue {
  private tasks: AsyncTask[] = [];
  private busy = false;
  private paused = false;
  static queues = new Map<string, TaskQueue>();
  static scheduler = (cb: () => void, t = 0) => setTimeout(cb, t);
  static get(name: string, timeout = 30000) {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }
    const nt = new TaskQueue(name, timeout);
    this.queues.set(name, nt);
    return nt;
  }
  constructor(public name: string, public readonly timeout = 30000) {
    if (TaskQueue.queues.has(name)) {
      return TaskQueue.queues.get(name)!;
    }
    TaskQueue.queues.set(name, this);
  }
  public get idle() {
    return this.tasks.length === 0;
  }
  public push<T>(
    fun: (...args: any[]) => any,
    id?: string,
    noRej = false
  ): { done: Promise<T>; cancel: () => void } {
    let item: any;
    return {
      done: new Promise((res, rej) => {
        if (id) {
          let index = -1;
          while ((index = this.tasks.findIndex((el) => el.id === id)) > -1) {
            const ot = this.tasks.splice(index, 1)[0];
            ot?.noRej ? ot.res([true, "过期"]) : ot.rej("过期");
          }
        }
        this.tasks.push(
          (item = { fun, res, rej, date: Date.now(), noRej, id })
        );
        this.scan();
      }),
      cancel: () => {
        const i = this.tasks.indexOf(item);
        i > -1 && this.tasks.splice(i, 1);
      },
    };
  }
  private async scan() {
    if (this.idle || this.busy) {
      // 命名Queue将会被释放
      if (this.name) {
        TaskQueue.queues.delete(this.name);
        this.name = "";
      }
      return;
    }
    this.busy = true;
    await this.handle();
    TaskQueue.scheduler(() => {
      this.busy = false;
      if (this.paused) {
        return;
      }
      this.scan();
    });
  }
  private async handle() {
    const task = this.tasks.shift()!;
    const { fun, rej, res, date, noRej } = task;
    const left = this.timeout + date - Date.now();
    if (left < 10) {
      noRej ? res(["超时"]) : rej("超时");
    } else {
      TaskQueue.scheduler(() => {
        noRej ? res(["超时"]) : rej("超时");
      }, left);
      try {
        task.execing = true;
        res(await fun());
      } catch (error) {
        noRej ? res([error || "unknow error"]) : rej(error);
      }
    }
  }
  public run() {
    this.paused = false;
    this.scan();
  }
  public pause() {
    this.paused = true;
  }
  public stop() {
    this.clear();
  }
  public clear() {
    this.tasks
      .splice(0)
      .forEach((el) => (el.noRej ? el.res(["cancel"]) : el.rej("cancel")));
  }
}

interface AsyncTask {
  fun: () => Promise<any>;
  rej: (e: any) => any;
  res: (e: any) => any;
  date: number;
  noRej: boolean;
  id?: string;
  execing?: boolean;
}
