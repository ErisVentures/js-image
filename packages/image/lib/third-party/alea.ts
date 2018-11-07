// A port of an algorithm by Johannes Baagøe <baagoe@baagoe.com>, 2010
// http://baagoe.com/en/RandomMusings/javascript/
// https://github.com/nquinlan/better-random-numbers-for-javascript-mirror
// Original work is under MIT license -

// Copyright (C) 2010 by Johannes Baagøe <baagoe@baagoe.org>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
export interface INumberGenerator {
  s0: number
  s1: number
  s2: number
  c: number
  next(): number
}

export function createPRNG(seed: string): INumberGenerator {
  const mash = Mash()
  const generator: INumberGenerator = {
    // Apply the seeding algorithm from Baagoe.
    c: 1,
    s0: mash(' '),
    s1: mash(' '),
    s2: mash(' '),
    next(): number {
      const t = 2091639 * generator.s0 + generator.c * 2.3283064365386963e-10 // 2^-32
      generator.s0 = generator.s1
      generator.s1 = generator.s2
      return (generator.s2 = t - (generator.c = t | 0))
    },
  }

  generator.s0 -= mash(seed)
  if (generator.s0 < 0) {
    generator.s0 += 1
  }
  generator.s1 -= mash(seed)
  if (generator.s1 < 0) {
    generator.s1 += 1
  }
  generator.s2 -= mash(seed)
  if (generator.s2 < 0) {
    generator.s2 += 1
  }

  return generator
}

function Mash(): (s: string) => number {
  let n = 0xefc8249d

  const mash = function(data: string): number {
    data = data.toString()
    for (let i = 0; i < data.length; i++) {
      n += data.charCodeAt(i)
      let h = 0.02519603282416938 * n
      n = h >>> 0
      h -= n
      h *= n
      n = h >>> 0
      h -= n
      n += h * 0x100000000 // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10 // 2^-32
  }

  return mash
}
