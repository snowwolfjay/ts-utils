import { getLogger } from "./log";

interface FutureTask<T, R = any> {
    params: T;
    ttr: number;
    name?: string;
    ctx?: R
}
const logger = getLogger("ftq", 0, { level: -1, timestamp: true })
export class FutureTaskQueue<T = any, R = any> {
    private tasks: FutureTask<T, R>[] = [];
    public state = 0;
    constructor(private execer: (params: T) => void, private scheduler?: {
        run: Function,
        cancel: Function,
    }) {
    }
    add(e: FutureTask<T, R>) {
        logger(`add a task ${e.name} -  ${e.params}@${e.ttr}`)
        console.log(`currents : ${this.tasks.map(v => v.name).join('、')}`)
        if (e.ttr - Date.now() <= 0) {
            this.exec(e)
            return
        }
        const i = this.tasks.findIndex(el => el.ttr >= e.ttr)
        if (i === 0) {
            this.tasks.unshift(e)
            this.cancelWaiting()
        } else if (i > 0) {
            this.tasks.splice(i, 0, e)
        }
        else this.tasks.push(e)
        this.check()
        return () => {
            const i = this.tasks.findIndex(el => el === e)
            i > -1 && this.tasks.splice(i, 1)
        }
    }
    runBy(name: string, e: T, byTime: number, isSecond = true) {
        byTime = isSecond ? byTime * 1000 : byTime
        return this.add({ name, params: e, ttr: Date.now() + byTime })
    }
    cancel(name: string) {
        const i = this.tasks.findIndex(el => el.name === name)

        const t = this.tasks[i]
        if (t) {
            this.tasks.splice(i, 1)
            logger(`cancel a task ${name} for ${t.ttr} `)
        } else {
            console.log(`not find task ${name}`)
        }
        if (i === 0) {
            this.cancelWaiting()
            this.check()
        }
    }
    private delayTimer: any;
    private check() {
        if (this.state === 1 || this.tasks.length === 0) return
        this.state = 1;
        const e = this.tasks[0];
        const left = e.ttr - Date.now();
        if (left <= 0) {
            this.exec(this.tasks.shift()!)
        } else {
            this.delayTimer = (this.scheduler?.run || setTimeout)(() => {
                this.state = 0
                this.delayTimer = null;
                this.check()
            }, left);
        }
    }
    private cancelWaiting() {
        if (this.state === 0) return
        console.log(`cancel waiting`);
        (this.scheduler?.cancel || clearTimeout)(this.delayTimer);
        this.state = 0;
    }
    private exec(e: FutureTask<T, R>) {
        logger(`run a task ${e.name} - ${e.ttr} @ ${Date.now()}`)
        try {
            this.execer.call(e.ctx, e.params)
        } catch (error) {
            console.error(error)
        }
        this.state = 0
        this.check()
    }
}