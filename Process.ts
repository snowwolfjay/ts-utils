import { voidFun } from "./base";
import { Endable, teardown } from "./Endable";

type NodeRunner = (
  ctx: ProcessNode,
  data: any,
  go: (name: string) => void
) => teardown | void;

interface ProcessNode {
  name: string;
  runner: NodeRunner;
  active: boolean;
  session: Process;
}

export class Process extends Endable {
  private static rootProcesses: { [key: string]: Process } = {};
  public running = false;
  public static start(
    name = "root",
    p?: Process,
    restart?: boolean,
    opts?: { standalone?: boolean }
  ) {
    let n: Process = undefined as any;
    if (p) {
      if ((n = p.subs[name])) {
        restart && n.end();
      }
    } else {
      n = Process.rootProcesses[name];
    }
    n = n || new Process(name, p);
    if (!p && !opts?.standalone) {
      Process.rootProcesses[name] = n;
    }
    if (p) {
      p.subs[name] = n;
    }
    return n;
  }
  private nodes = new Map<string | Symbol, ProcessNode>();
  private subs: { [key: string]: Process } = {};
  private constructor(public name: string, public parent?: Process) {
    super();
  }
  public end() {
    for (const key in this.subs) {
      this.subs[key].end();
    }
    super.end();
    this.debug && console.log(`End ${this.name}`);
  }
  public child(name: string, restart = false) {
    return Process.start(name, this, restart);
  }
  public sep() {
    if (this.parent) {
      delete this.parent.subs[this.name];
      this.parent = undefined;
    } else {
      delete Process.rootProcesses[this.name];
    }
  }
  public drop(name: string) {
    delete this.subs[name];
  }
  public addNode(cb: NodeRunner, name: string): ProcessNode {
    if (this.debug && name) {
      this.debug && console.log(`add node ${name}`);
    }
    if (this.findNode(name)) throw Error(`dup node ${name}`);
    const node = {
      runner: cb,
      name,
      active: false,
      session: this.child(name),
    };
    this.nodes.set(name, node);
    return node;
  }
  public runNodes(data?: any) {
    if (this.running) throw new Error(`node is running - or restart it`);
    this.running = true;
    this.nodes.forEach((node) => {
      this.execNode(node, data);
    });
    return this.endNodes;
  }
  private findNode(name: string) {
    return this.nodes.get(name);
  }
  private execNode(node: ProcessNode, data?: any, options?: any) {
    if (node.active) {
      if (!options?.restart)
        throw new Error(`node ${node.name} is running active- or restart it`);
    }
    const sess = this.child("_node_run").child(node.name, !!options?.restart);
    node.active = true;
    const teardown = node.runner(node, data, (name: string) => {
      sess.end();
      this.runNode(name);
    });
    teardown && sess.addEnder(teardown);
    sess.addEnder(() => (node.active = false));
    return () => {
      sess.end();
      sess.sep();
    };
  }
  public runNode(name: string, data?: any, options?: { restart?: boolean }) {
    const node = this.findNode(name);
    if (node) {
      return this.execNode(node, data, options);
    }
    return voidFun;
  }
  public endNodes() {
    const sess = this.child(`_node_run`);
    this.nodes.forEach((el) => (el.active = false));
    this.running = false;
    sess.end();
    return this;
  }
  public delNodes() {
    this.endNodes();
    this.nodes.clear();
    return this;
  }
  public delNode(name: string) {
    this.nodes.delete(name);
    return this;
  }
  public destroy() {
    delete Process.rootProcesses[this.name];
    this.end();
    for (const key in this.subs) {
      this.subs[key].sep();
    }
    this.delNodes();
  }
}

// const test = Process.start("test");
// test.debug = true;

// test.addNode((sess, go) => {
//   console.error("run1");
//   setTimeout(() => {
//     go("run2");
//   }, 3000);
// }, "run1");

// test.addNode((sess, go) => {
//   console.error("run2");
//   setTimeout(() => {
//     go("run3");
//   }, 3000);
// }, "run2");

// test.addNode(() => {
//   console.error("run3");
// }, "run3");

// test.runNode("run1");
