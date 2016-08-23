/**
 * @copyright 2013 Sonia Keys
 * @copyright 2016 commenthol
 * @license MIT
 */
/**
 * Perihelion: Chapter 38, Planets in Perihelion and Aphelion.
 *
 * Functions Aphelion and Perihelion implement algorithms from the book
 * to return approximate results.
 *
 * For accurate results, Meeus describes the general technique of
 * interpolating from a precise ephemeris but does not give a complete
 * algorithm.  The algorithm implemented here for Aphelion2 and Perihelion2
 * is to start with the approximate result and then crawl along the curve
 * at the specified time resolution until the desired extremum is found.
 * This algorithm slows down as higher accuracy is demanded.  1 day accuracy
 * is generally quick for planets other than Neptune.
 *
 * Meeus doesn't give an algorithm to handle the double extrema of Neptune.
 * The algorithm here is to pick starting points several years either side
 * of the approximate date and follow the slopes inward.  The consequence of
 * starting farther from the extremum is that these functions are particularly
 * slow for Neptune.  They are offered here though as a simple implementation
 * of Meeus's presentation in the book.
 */
const base = require('./base')
const interp = require('./interpolation')

const M = exports

/**
 * Planet constants for first argument of Perihelion and Aphelion functions.
 */
M.mercury = 0
M.venus = 1
M.earth = 2
M.mars = 3
M.jupiter = 4
M.saturn = 5
M.uranus = 6
M.neptune = 7
M.embary = 8

/**
 * Perihelion returns an approximate jde of the perihelion event nearest the given time.
 *
 * @param {perihelion.NAME} p - planet constant from above
 * @param {Number} y - year number indicating a time near the perihelion event.
 * @returns {Number} jde - time of the event
 */
M.perihelion = function (p, year) {
  return ap(p, year, false, pf)
}

/**
 * Aphelion returns an approximate jde of the aphelion event nearest the given time.
 *
 * @param {perihelion.NAME} p - planet constant from above
 * @param {Number} y - year number indicating a time near the aphelion event.
 * @returns {Number} jde - time of the event
 */
M.aphelion = function (p, year) {
  return ap(p, year, true, af)
}

const pf = function (x) { // (x float64)  float64
  return Math.floor(x + 0.5)
}

const af = function (x) { // (x float64)  float64
  return Math.floor(x) + 0.5
}

const ap = function (p, y, a, f) { // (p int, y float64, a bool, f func(float64)  float64) float64
  let i = p
  if (i === M.embary) {
    i = M.earth
  }
  let k = f(ka[i].a * (y - ka[i].b))
  let j = base.horner(k, c[i])
  if (p === M.earth) {
    let c = ep
    if (a) {
      c = ea
    }
    for (i = 0; i < 5; i++) {
      j += c[i] * Math.sin((ec[i].a + ec[i].b * k) * Math.PI / 180)
    }
  }
  return j
}

var ka = [
  {a: 4.15201, b: 2000.12}, // Mercury
  {a: 1.62549, b: 2000.53}, // ...
  {a: 0.99997, b: 2000.01},
  {a: 0.53166, b: 2001.78},
  {a: 0.0843, b: 2011.2},
  {a: 0.03393, b: 2003.52},
  {a: 0.0119, b: 2051.1},   // Neptune
  {a: 0.00607, b: 2047.5}   // EMBary
]

var c = [
  [2451590.257, 87.96934963],
  [2451738.233, 224.7008188, -0.0000000327],
  [2451547.507, 365.2596358, 0.0000000156],
  [2452195.026, 686.9957857, -0.0000001187],
  [2455636.936, 4332.897065, 0.0001367],
  [2452830.12, 10764.21676, 0.000827],
  [2470213.5, 30694.8767, -0.00541],
  [2468895.1, 60190.33, 0.03429]
]

var ec = [
  {a: 328.41, b: 132.788585},
  {a: 316.13, b: 584.903153},
  {a: 346.2, b: 450.380738},
  {a: 136.95, b: 659.306737},
  {a: 249.52, b: 329.653368}
]

var ep = [1.278, -0.055, -0.091, -0.056, -0.045]
var ea = [-1.352, 0.061, 0.062, 0.029, 0.031]

/**
 * Perihelion2 returns the perihelion event nearest the given time.
 *
 * @param {planetposition.Planet} planet - VSOP87 planet (EMBary is not allowed)
 * @param {Number} year - (float) decimal year number near the perihelion event
 * @param {Number} precision - desired precision of the time result, in days
 * @param {Function} [cb] - callback function for asynchronous processing `cb([jde, r])`
 * @returns {Array} [jde, r]
 *   {Number} jde - time of the event
 *   {Number} r - the distance of the planet from the Sun in AU.
 */
M.perihelion2 = function (planet, year, precision, cb) {
  return ap2(M[planet.name], year, precision, planet, false, pf, cb)
}

/**
 * Aphelion2 returns the aphelion event nearest the given time.
 *
 * @param {planetposition.Planet} planet - VSOP87 planet (EMBary is not allowed)
 * @param {Number} year - (float) decimal year number near the perihelion event
 * @param {Number} precision - desired precision of the time result, in days
 * @param {Function} [cb] - callback function for asynchronous processing `cb([jde, r])`
 * @returns {Array} [jde, r]
 *   {Number} jde - time of the event
 *   {Number} r - the distance of the planet from the Sun in AU.
 */
M.aphelion2 = function (planet, year, precision, cb) {
  return ap2(M[planet.name], year, precision, planet, true, af, cb)
}

if (typeof setImmediate !== 'function') {
  const setImmediate = setTimeout // eslint-disable-line no-unused-vars
}

const ap2 = function (p, y, d, v, a, f, cb) {
  let j1 = ap(p, y, a, f)
  if (p !== M.neptune) {
    return ap2a(j1, d, a, v, cb)
  }
  // handle the double extrema of Neptune
  if (cb) {
    ap2a(j1 - 5000, d, a, v, ([j0, r0]) => {
      ap2a(j1 + 5000, d, a, v, ([j2, r2]) => {
        if ((r0 > r2) === a) {
          cb([j0, r0])
          return
        }
        cb([j2, r2])
        return
      })
    })
  } else {
    let [j0, r0] = ap2a(j1 - 5000, d, a, v)
    let [j2, r2] = ap2a(j1 + 5000, d, a, v)
    if ((r0 > r2) === a) {
      return [j0, r0]
    }
    return [j2, r2]
  }
}

const ap2a = function (j1, d, a, v, cb) {
  var j0 = j1 - d
  var j2 = j1 + d
  var rr = new Array(3)
  rr[1] = v.position2000(j1).range
  rr[0] = v.position2000(j0).range
  rr[2] = v.position2000(j2).range

  function end () {
    let l = new interp.Len3(j0, j2, rr)
    let [jde, r] = l.extremum()
    return [jde, r]
  }

  function run () {
    if (a) {
      if (rr[1] > rr[0] && rr[1] > rr[2]) {
        cb && cb(end())
        return true
      }
    } else {
      if (rr[1] < rr[0] && rr[1] < rr[2]) {
        cb && cb(end())
        return true
      }
    }
    if (rr[0] < rr[2] === a) {
      j0 = j1
      j1 = j2
      j2 += d
      rr[0] = rr[1]
      rr[1] = rr[2]
      rr[2] = v.position2000(j2).range
    } else {
      j2 = j1
      j1 = j0
      j0 -= d
      rr[2] = rr[1]
      rr[1] = rr[0]
      rr[0] = v.position2000(j0).range
    }
    if (cb) {
      setImmediate(run, 0)
    }
  }

  if (cb) {
    run()
  } else {
    for (;;) {
      if (run()) {
        return end()
      }
    }
  }
}
