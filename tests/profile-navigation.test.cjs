const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const home=fs.readFileSync(__dirname+'/../frontend/app/(tabs)/home.tsx','utf8');
const body=name=>home.split(`  const ${name} = `)[1].split('\n  };')[0].replace('(id: string)','(id)') + '\n}';
function navigation(showFullMap){
 const busy={current:false},queue={current:null},pushes=[];let closed=false;
 const finish=new Function('queuedProfile','router',`return ${body('finishProfileNavigation')};`)(queue,{push:id=>pushes.push(id)});
 const open=new Function('profileNavigationBusy','queuedProfile','router','showFullMap','setShowFullMap',`return ${body('openContractorProfile')};`)(busy,queue,{push:id=>pushes.push(id)},showFullMap,()=>{closed=true;});
 return {open,finish,pushes,get closed(){return closed;}};
}
test('map navigation waits for dismissal and keeps only the first selected contractor',()=>{
 const nav=navigation(true);nav.open('shon');nav.open('haia');
 assert.equal(nav.closed,true);assert.equal(nav.pushes.length,0);
 nav.finish();nav.finish();assert.deepEqual(nav.pushes,['/contractor/shon']);
});
test('rapid taps outside the map create only one route',()=>{
 const nav=navigation(false);nav.open('shon');nav.open('haia');assert.deepEqual(nav.pushes,['/contractor/shon']);
});
test('late response after profile effect cleanup cannot update the screen',async()=>{
 const source=fs.readFileSync(__dirname+'/../frontend/app/contractor/[id].tsx','utf8');
 const effect=source.split('  useEffect(() => {')[1].split('\n  }, [id]);')[0].replace('catch (e: any)','catch (e)');
 let resolve;const pending=new Promise(r=>resolve=r);const results=[];
 const cleanup=new Function('id','api','setLoading','setContractor','setReviews','setPortfolio','Alert',effect)('shon',{get:()=>pending},()=>{},x=>results.push(x),()=>{},()=>{},{alert(){}});
 cleanup();resolve({contractor:{id:'shon'}});await new Promise(r=>setImmediate(r));
 assert.deepEqual(results,[null]);
});
