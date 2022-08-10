interface TreePluginRecord<T = any, C = any> {
  path: string;
  plugin: T;
  conf?: C;
}
let confs = {} as any;
export class TreeConf<P, E extends Array<any>, R = any, C = any> {
  constructor(
    private executor: (
      paths: string[],
      runArgs: E,
      plugins: TreePluginRecord<P, C>[]
    ) => R,
    private paths: string[] = [],
    private plugins: TreePluginRecord<P, C>[] = [],
    public options?: { debug?: string; sep?: "." | " " | "/" | "-" | ":" }
  ) {}
  get currentPath() {
    return this.getPath(this.paths);
  }
  private getPath(p: string[]) {
    return p.join(this.options?.sep || "/");
  }
  way(...paths: string[]) {
    this.paths.push(...paths);
    return this;
  }
  log() {
    console.log(
      this.paths,
      this.plugins.map((v) => v.path)
    );
    return this;
  }
  pre(i = 1 as string | number) {
    let precount = 1;
    let prefix = "";
    if (typeof i === "string") {
      precount = 1;
      prefix = i;
    } else if (typeof i === "number") {
      precount = i;
    }
    if (this.paths.length === 0) return this;
    const p = this.paths.slice();
    while (precount-- > 0) {
      p.pop();
    }
    if (prefix) {
      p.push(prefix.slice(prefix.startsWith("/") ? 1 : 0));
    }
    const np = this.getPath(p);
    return new TreeConf(
      this.executor,
      p,
      this.plugins.filter((e) => np.startsWith(e.path)),
      this.options
    );
  }
  run(...runArgs: E) {
    this.options?.debug &&
      (confs[this.currentPath] = {
        plugins: this.plugins
          .map(
            (v) =>
              `${(v.plugin as any).name}:${
                v.conf ? JSON.stringify(v.conf) : ""
              }:${v.path}`
          )
          .join("|"),
        tag: this.options.debug,
      });
    return {
      result: this.executor(this.paths, runArgs, this.plugins),
      pre: this.pre.bind(this),
      ctx: this,
    };
  }
  use(plugin: P, conf?: C) {
    this.plugins.push(
      Object.freeze({
        plugin,
        path: this.currentPath,
        conf,
      })
    );
    return this;
  }
  del(plugin: P) {
    const i = this.plugins.findIndex((el) => el.plugin === plugin);
    i > -1 && this.plugins.splice(i, 1);
    return this;
  }
  set(plugin: P, conf?: any) {
    const p = this.plugins.findIndex((el) => el.plugin === plugin);
    p > -1
      ? this.plugins.splice(p, 1, Object.freeze({ ...this.plugins[p], conf }))
      : this.use(plugin, conf);
    return this;
  }
}

setTimeout(() => {
  console.table(confs);
  confs = null;
}, 0);
