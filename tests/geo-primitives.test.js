const assert=require('assert');const g=require('../cactusbyte-geo.js');
assert(g.valid([35.4676,-97.5164]));
assert(!g.valid([95,0]));
const d=g.haversineMeters([0,0],[0,0.001]);assert(d>110&&d<112);
const line=g.polylineMeters([[0,0],[0,0.001],[0,0.002]]);assert(line>221&&line<224);
const square=[[35,-97],[35,-96.999],[35.001,-96.999],[35.001,-97]];const area=g.polygonSquareMeters(square);assert(area>9000&&area<11000);
assert(Math.abs(g.metersToFeet(1)-3.28084)<0.0001);
assert(Math.abs(g.squareMetersToSquareFeet(1)-10.76391)<0.0001);
console.log('geo primitives: PASS');