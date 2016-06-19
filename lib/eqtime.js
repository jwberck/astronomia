'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/**
 * @copyright 2013 Sonia Keys
 * @copyright 2016 commenthol
 * @license MIT
 */
/**
 * Eqtime: Chapter 28, Equation of time.
 */

var base = require('./base');
var coord = require('./coord');
var nutation = require('./nutation');
var solar = require('./solar');

var M = exports;

/**
 * e computes the "equation of time" for the given JDE.
 *
 * Parameter planet must be a planetposition.Planet object for Earth obtained
 * with `new planetposition.Planet('earth')`.
 *
 * @param {Number} jde
 * @param {planetposition.Planet} earth - VSOP87 planet
 * @returns {Number} equation of time as an hour angle in radians.
 */
M.e = function (jde, earth) {
  var τ = base.J2000Century(jde) * 0.1;
  var L0 = l0(τ);
  // code duplicated from solar.ApparentEquatorialVSOP87 so that
  // we can keep Δψ and cε

  var _solar$trueVSOP = solar.trueVSOP87(earth, jde);

  var lon = _solar$trueVSOP.lon;
  var lat = _solar$trueVSOP.lat;
  var range = _solar$trueVSOP.range;

  var _nutation$nutation = nutation.nutation(jde);

  var _nutation$nutation2 = _slicedToArray(_nutation$nutation, 2);

  var Δψ = _nutation$nutation2[0];
  var Δε = _nutation$nutation2[1];

  var a = -20.4898 / 3600 * Math.PI / 180 / range;
  var λ = lon + Δψ + a;
  var ε = nutation.meanObliquity(jde) + Δε;
  var eq = new coord.Ecliptic(λ, lat).toEquatorial(ε);
  // (28.1) p. 183
  var E = L0 - 0.0057183 * Math.PI / 180 - eq.ra + Δψ * Math.cos(ε);
  return base.pmod(E + Math.PI, 2 * Math.PI) - Math.PI;
};

/**
 * (28.2) p. 183
 */
var l0 = function l0(τ) {
  return base.horner(τ, 280.4664567, 360007.6982779, 0.03032028, 1.0 / 49931, -1.0 / 15300, -1.0 / 2000000) * Math.PI / 180;
};

/**
 * eSmart computes the "equation of time" for the given JDE.
 *
 * Result is less accurate that e() but the function has the advantage
 * of not requiring the V87Planet object.
 *
 * @param {Number} jde
 * @returns {Number} equation of time as an hour angle in radians.
 */
M.eSmart = function (jde) {
  var ε = nutation.meanObliquity(jde);
  var t = Math.tan(ε * 0.5);
  var y = t * t;
  var T = base.J2000Century(jde);
  var L0 = l0(T * 0.1);
  var e = solar.eccentricity(T);
  var M = solar.meanAnomaly(T);

  var _base$sincos = base.sincos(2 * L0);

  var _base$sincos2 = _slicedToArray(_base$sincos, 2);

  var s2L0 = _base$sincos2[0];
  var c2L0 = _base$sincos2[1];

  var sM = Math.sin(M);
  // (28.3) p. 185
  return y * s2L0 - 2 * e * sM + 4 * e * y * sM * c2L0 - y * y * s2L0 * c2L0 - 1.25 * e * e * Math.sin(2 * M);
};