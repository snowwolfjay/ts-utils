export const safeChar =
  "0123456789QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm";

export function mapIntigerToSafeString(v: number): string {
  if (typeof v !== "number" || isNaN(v)) {
    return "";
  }
  const t = safeChar.length;
  if (v < t) {
    return safeChar[v];
  }
  const left = v % t;
  return safeChar[left] + mapIntigerToSafeString((v - left) / t);
}

export function hashString(str: string, hash = 5333) {
  if (typeof str !== "string") {
    return "";
  }
  let i = str.length;

  const i1 = str.charCodeAt(1);
  const i2 = str.charCodeAt(i);
  const i3 = str.charCodeAt(Math.floor(i / 2));
  let fs =
    mapIntigerToSafeString(i1) +
    mapIntigerToSafeString(i2) +
    mapIntigerToSafeString(i3);

  while (i) {
    // tslint:disable-next-line: no-bitwise
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }

  /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
   * integers. Since we want the results to be always positive, convert the
   * signed int to an unsigned by doing an unsigned bitshift. */
  // tslint:disable-next-line: no-bitwise
  fs += "-" + mapIntigerToSafeString(hash >>> 0);
  return fs + "-" + mapIntigerToSafeString(str.length);
}
export const randomString = (n: number) => {
  let t = "";
  if (n > 0) {
    for (var i = 0; i < n; i++) {
      t += safeChar[Math.floor(36 * Math.random())];
    }
  }
  return t;
};

export const randomNumber = (n: number, paddingLeft = true) => {
  n = n > 0 ? n : 1;
  let t = String(Math.floor(Math.random() * 10 ** n));
  while (t.length < n) {
    t = paddingLeft ? "0" + t : t + 0;
  }
  return t;
};