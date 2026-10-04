const NOMINATIM='https://nominatim.openstreetmap.org/search';
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
  if(req.method!=='GET')return res.status(405).json({error:'GET required.'});
  const q=String(req.query?.q||'').trim().slice(0,220);
  if(q.length<5)return res.status(400).json({error:'Enter a complete property address.'});
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
  try{
    const url=NOMINATIM+'?format=jsonv2&limit=1&addressdetails=1&q='+encodeURIComponent(q);
    const r=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json','User-Agent':'CactusByte-Matrix/1.0 property-geocoder'}});
    if(!r.ok)throw new Error('Geocoder HTTP '+r.status);
    const rows=await r.json(),x=rows?.[0];if(!x)return res.status(404).json({error:'Property address not found.'});
    const lat=Number(x.lat),lon=Number(x.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))throw new Error('Invalid geocoder coordinates.');
    return res.status(200).json({result:{lat,lon,displayName:x.display_name||q,source:'OpenStreetMap Nominatim',osmType:x.osm_type||null,osmId:x.osm_id||null}});
  }catch(e){return res.status(e.name==='AbortError'?504:502).json({error:e.name==='AbortError'?'Property lookup timed out.':'Property lookup is temporarily unavailable.'});}
  finally{clearTimeout(timer);}
};