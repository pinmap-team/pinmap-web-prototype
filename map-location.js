/* Accept GPS fixes independently of map center, pan and zoom. No location is persisted. */
(function(root){
  function distanceMeters(a,b){
    const radians=Math.PI/180;
    const latitude=(b.latitude-a.latitude)*radians,longitude=(b.longitude-a.longitude)*radians;
    const value=Math.sin(latitude/2)**2+Math.cos(a.latitude*radians)*Math.cos(b.latitude*radians)*Math.sin(longitude/2)**2;
    return 6371000*2*Math.asin(Math.min(1,Math.sqrt(value)));
  }
  function createTracker(){
    let current=null,latestTimestamp=-Infinity;
    return {
      get current(){return current;},
      accept(position){
        const coords=position?.coords;
        if(!coords||!Number.isFinite(coords.latitude)||!Number.isFinite(coords.longitude)||Math.abs(coords.latitude)>90||Math.abs(coords.longitude)>180)return null;
        const timestamp=Number.isFinite(position.timestamp)?position.timestamp:Date.now();
        if(timestamp<=latestTimestamp)return null;
        latestTimestamp=timestamp;
        const next={latitude:coords.latitude,longitude:coords.longitude,accuracy:Number.isFinite(coords.accuracy)&&coords.accuracy>=0?coords.accuracy:0,timestamp};
        if(current){
          const better=next.accuracy>0&&(current.accuracy===0||next.accuracy<current.accuracy*.7);
          // Overlapping uncertainty is not reliable evidence that the person moved.
          const uncertainty=Math.max(8,Math.hypot(current.accuracy,next.accuracy));
          if(!better&&distanceMeters(current,next)<=uncertainty)return null;
        }
        current=Object.freeze(next);
        return current;
      }
    };
  }
  root.PinmapLocation={createTracker};
  if(typeof module!=='undefined'&&module.exports)module.exports={createTracker};
})(typeof window!=='undefined'?window:globalThis);
