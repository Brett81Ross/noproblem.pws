/* CactusByte Geo Primitives v1.0
 * Generalized from proven CactusByte implementations in ShadowNex, GhostLane and OrbitGather.
 * Domain-neutral, dependency-free geographic measurement helpers.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.CactusByteGeo=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const R=6371008.8;
  const rad=d=>d*Math.PI/180;
  const valid=p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(+p[0])&&Number.isFinite(+p[1])&&+p[0]>=-90&&+p[0]<=90&&+p[1]>=-180&&+p[1]<=180;
  function haversineMeters(a,b){if(!valid(a)||!valid(b))return NaN;const p1=rad(+a[0]),p2=rad(+b[0]),dp=rad(+b[0]-+a[0]),dl=rad(+b[1]-+a[1]);const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));}
  function polylineMeters(points){if(!Array.isArray(points)||points.length<2)return 0;let n=0;for(let i=1;i<points.length;i++){const d=haversineMeters(points[i-1],points[i]);if(!Number.isFinite(d))return NaN;n+=d;}return n;}
  // Spherical polygon area, adequate for contractor-scale property measurements.
  function polygonSquareMeters(points){if(!Array.isArray(points)||points.length<3||points.some(p=>!valid(p)))return 0;let sum=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];sum+=rad(+b[1]-+a[1])*(2+Math.sin(rad(+a[0]))+Math.sin(rad(+b[0])));}return Math.abs(sum*R*R/2);}
  function pointToSegmentMeters(p,a,b){if(!valid(p)||!valid(a)||!valid(b))return NaN;const lat=+p[0],mLng=111320*Math.cos(rad(lat)),mLat=110540;const ax=(+a[1]-+p[1])*mLng,ay=(+a[0]-lat)*mLat,bx=(+b[1]-+p[1])*mLng,by=(+b[0]-lat)*mLat,vx=bx-ax,vy=by-ay,l2=vx*vx+vy*vy,t=Math.max(0,Math.min(1,l2?-(ax*vx+ay*vy)/l2:0));return Math.hypot(ax+t*vx,ay+t*vy);}
  const metersToFeet=m=>m*3.280839895;
  const squareMetersToSquareFeet=m=>m*10.763910417;
  return {valid,haversineMeters,polylineMeters,polygonSquareMeters,pointToSegmentMeters,metersToFeet,squareMetersToSquareFeet};
});