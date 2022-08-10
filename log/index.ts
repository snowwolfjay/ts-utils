import { shared } from "../base";
let reporter: any | null = null;

const methMap = {
    0: "log",
    1: "info",
    2: "warn",
    3: "error",
};

export function setReporter(f: any) {
    if (typeof f === "function") reporter = f;
}
const log = (data: any, namespace: string, level: number, options?: any) => {
    const canLog =
        level > options.level ||
        shared[
            `_log-${namespace}` ||
                (shared.localStorage &&
                    shared.localStorage[`_log-${namespace}`])
        ];
    if (canLog) {
        console.info(
            `${
                options?.timestamp ? new Date().toTimeString() + ":" : ""
            }[${namespace}]`
        );
        // @ts-ignore
        console[methMap[level] || "log"](data);
    }
    if (level > 10 && reporter) {
        reporter(data, namespace);
    }
};

export const getLogger = (
    name: string,
    lev = 0,
    options?: { level?: number; timestamp?: boolean }
) => {
    const op = {
        level: 1,
        ...options,
    };
    return (msg: any, level = lev) => {
        log(msg, name, level, op);
    };
};
