import { clearObjectProps } from ".";
import { addToArr } from "./base";

export function poemNormalizer(inp: string | string[]) {
    const out = [] as string[];
    let str = "";
    if (Array.isArray(inp)) {
        for (const line of inp) {
            const n = poemNormalizer(line);
            out.push(...n);
        }
    } else {
        for (const char of inp) {
            if (/[\u4e00-\u9fa5]/.test(char)) {
                str += char;
            } else {
                out.push(str);
                str = "";
            }
        }
        if (str.length) out.push(str);
    }
    return out;
}

export function poemMetaGenerator(poem: string | string[]) {
    const plines = [] as string[][];
    const lines = poemNormalizer(poem);
    let cc = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const arr = [] as string[];
        for (let char of line) {
            if (/[\u4e00-\u9fa5]/.test(char)) {
                arr.push(char + " " + cc++);
            }
        }
        plines.push(arr);
    }
    const pairs = {} as { [key: string]: string[][] };
    for (let i = 0; i < lines.length; i++) {
        const line = plines[i];
        if (line.length === 5) {
            genPair(pairs, line.slice(0, 2));
            genPair(pairs, line.slice(3));
            genPair(pairs, line.slice(2));
            genPair(pairs, line.slice(0));
            if (i % 2 === 1 && i > 0) {
                genPair(pairs, plines[i - 1].concat(plines[i]));
            }
        } else if (line.length === 4) {
            genPair(pairs, line.slice(0, 2));
            genPair(pairs, line.slice(2, 4));
            genPair(pairs, line.slice(0));
            if (i % 2 === 1 && i > 0) {
                genPair(pairs, plines[i - 1].concat(plines[i]));
            }
        } else if (line.length === 7) {
            genPair(pairs, line.slice(0, 2));
            genPair(pairs, line.slice(2, 4));
            genPair(pairs, line.slice(0, 4));
            genPair(pairs, line.slice(4, 7));
            genPair(pairs, line.slice(0));
            if (i % 2 === 1 && i > 0) {
                genPair(pairs, plines[i - 1].concat(plines[i]));
            }
        }
    }
    const parr = Object.keys(pairs).sort((a, b) => b.length - a.length);
    const sarr = [] as Array<{ str: string; score: number; combs: string[][] }>;
    parr.forEach((p) => {
        sarr.push({ str: p, score: fab(p.length), combs: pairs[p] });
    });
    return {
        scoreMathers: sarr,
        wordStr: lines.join(""),
        lines
    };
}

export function makeCharToStr(chars: string[]) {
    return chars.map((v) => v[0]).join("");
}

export function genPair(pairs: any, items: string[]) {
    const sub1 = makeCharToStr(items);
    pairs[sub1] = addToArr(pairs[sub1], items);
}

// function getScore(len: number) {
//     if (len <= 4) {
//         return Math.round(2 ** (len - 1))
//     }
//     let score = Math.round(2 ** 3)
//     if (len <= 8) {
//         score += Math.round(3 ** (len - 5))
//         return score
//     }
//     score += Math.round(3 ** 3)
//     return score + Math.round(4 ** (len - 8))
// }
const cacher = {} as { [key: number]: number };
function ifab(n: number): number {
    if (cacher[n]) return cacher[n];
    if (n <= 2) return 1;
    return (cacher[n] = fab(n - 1) + fab(n - 2));
}

export function fab(n: number): number {
    const r = ifab(n);
    clearObjectProps(cacher);
    return r;
}
