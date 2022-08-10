export function sleep(s: number) {
  return new Promise((res) => {
    setTimeout(res, s * 1000);
  });
}
export function randInt(max: number) {
  return Math.round(Math.random() * max);
}
export function randItem(arr: any[]) {
  const max = arr.length;
  return arr[Math.round(Math.random() * max)];
}
export function num2str(num: number, c = 2) {
  let t = String(num);
  while (t.length < c) {
    t = "0" + t;
  }
  return t;
}
export function deepCopy(e: any) {
  if (typeof e !== "object") {
    return e;
  }
  return JSON.parse(JSON.stringify(e));
}
export function assert(v: any, msg = "unknow") {
  if (typeof v === "function") {
    v = v();
  }
  if (!v && v !== 0) {
    throw Error(msg);
  }
}
export function isPlainObject(obj: any) {
  return Object.prototype.toString.call(obj) === "[object Object]";
}
export function clearObject(obj: any) {
  if (typeof obj !== "object" || !obj || Object.keys(obj).length === 0) {
    return;
  }
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const t = obj[key];
      switch (typeof t) {
        case "object":
          if (obj instanceof Date) {
            // 不递归处理日期对象
          } else if ((Array.isArray(t) && t.length === 0) || !t) {
            delete obj[key];
          } else if (t && typeof t === "object") {
            clearObject(t);
          }
          break;
        case "number":
          if (isNaN(t) || !isFinite(t)) {
            delete obj[key];
          }
          break;
        case "string":
        case "boolean":
          break;
        default:
          delete obj[key];
          break;
      }
    }
  }
}
export function makeArr(a: any) {
  return Array.isArray(a) ? a : [a];
}
export function isDef(v: any) {
  return v !== null && v !== undefined;
}
// @ts-ignore
export const shared: any =
  // @ts-ignore
  (typeof window === "undefined" ? global : window) || {};

export function assign(sourc: any, obj: any, remove: string[] = []) {
  for (const key of Object.keys(obj)) {
    sourc[key] = obj[key];
  }
  remove?.forEach((key) => delete sourc[key]);
  return sourc;
}

export function looksEqual(v1: any, v2: any) {
  if (typeof v1 !== "object" || typeof v2 !== "object" || !v1 || !v2) {
    return v1 === v2;
  }
  if (!isPlainObject(v1)) {
    if (v1 instanceof Date) {
      return v1.getTime() === v2.getTime();
    }
    return false;
  }
  const k1 = Object.keys(v1);
  const k2 = Object.keys(v2);
  if (k1.length !== k2.length || !k1.every((k) => k2.includes(k))) {
    return false;
  }
  for (const key of Object.keys(v1)) {
    if (!looksEqual(v1[key], v2[key])) {
      return false;
    }
  }
  return true;
}

export function clearObjectProps(v: any) {
  if (!v || !isPlainObject(v)) return;
  for (const key of Object.keys(v)) {
    delete v[key];
  }
}

export function diffArr<T = any>(na: T[], oa: T[], key?: keyof T) {
  const needRemove = oa.slice(0);
  const needAdd = [] as T[];
  for (const el of na) {
    const oi = needRemove.findIndex((e) =>
      key ? e[key] === el[key] : e === el
    );
    if (oi > -1) {
      needRemove.splice(0, oi);
    } else {
      needAdd.push(el);
    }
  }
  return {
    needAdd,
    needRemove,
  };
}

export function almostEqual(v1: number, v2: number) {
  return Math.abs(v1 - v2) < Number.EPSILON;
}

export function findUsualItem(arr: string[]) {
  const rec = new Map<string, number>();
  for (const poemId of arr) {
    if (!rec.has(poemId)) rec.set(poemId, 1);
    else rec.set(poemId, rec.get(poemId)! + 1);
  }
  const farr = Array.from(rec).sort((c, p) => p[1] - c[1]);
  return farr[0][0];
}
export function addToArr(arr: any[] = [], item: any) {
  if (!Array.isArray(arr)) {
    return [arr, item];
  }
  arr.push(item);
  return arr;
}

export const voidFun = () => {
  // void ,dismiss eslint
};

export const toClonableValue = (obj: any) => {
  let root = null;
  switch (typeof obj) {
    case "object":
      if (obj) {
        if (!isPlainObject(obj)) {
          return obj;
        }
        root = Object.create(null);
        for (const key in obj) {
          root[key] = toClonableValue(obj[key]);
          if (!isDef(root[key])) delete root[key];
        }
      }
      break;
    case "number":
    case "boolean":
    case "string":
      root = obj;
  }
  return root;
};
