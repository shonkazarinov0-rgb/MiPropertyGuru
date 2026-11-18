const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../frontend/src/maps/contractorPopups.ts','utf8');
const script=source.split('String.raw`')[1].split('`;')[0];
function setup(markers){
 const bound=[], messages=[];
 const element=tag=>({tag,children:[],appendChild(n){this.children.push(n);},setAttribute(){}});
 const layer={addTo(){return this;},clearLayers(){bound.length=0;}};
 const context={document:{createElement:element},window:{ReactNativeWebView:{postMessage:m=>messages.push(JSON.parse(m))}},ms:markers,
 map:{latLngToContainerPoint:([x,y])=>({x,y,distanceTo(p){return Math.hypot(x-p.x,y-p.y);}}),on(){}},
 L:{layerGroup:()=>layer,divIcon:x=>x,marker:()=>({addTo(){return this;},bindPopup(content,options){bound.push({content,options});}})}};
 vm.createContext(context);vm.runInContext(script,context);
 return {context,bound,messages};
}
const person=(id,lat=0)=>({id,name:'Alex Smith',type:'Plumber',lat,lng:0,rating:4.8,distance:2.1});
test('marker opens preview, with X and automatic panning enabled',()=>{
 const {bound,messages}=setup([person('a')]);
 assert.equal(bound.length,1);assert.equal(bound[0].options.closeButton,true);
 assert.equal(bound[0].options.autoPan,true);assert.equal(bound[0].options.autoClose,true);
 assert.equal(messages.length,0);
});
test('card tap opens exactly the chosen full profile',()=>{
 const {bound,messages}=setup([person('a')]);
 let stopped=false;bound[0].content.children[0].onclick({stopPropagation(){stopped=true;}});
 assert.equal(messages[0].id,'a');assert.equal(messages[0].type,'profile');assert.equal(stopped,true);
});
test('overlapping contractors remain individually selectable',()=>{
 const {bound,messages}=setup([person('a'),person('b')]);
 assert.equal(bound.length,1);assert.equal(bound[0].content.children.length,3);
 bound[0].content.children[2].onclick({stopPropagation(){}});assert.equal(messages[0].id,'b');
});
test('separate markers get separate previews and no 15-person truncation',()=>{
 const {bound}=setup(Array.from({length:20},(_,i)=>person(String(i),i*30)));
 assert.equal(bound.length,20);
});
test('profile text is rendered as text and unsafe photo URLs are ignored',()=>{
 const m=person('a');m.name='<img src=x onerror=alert(1)>';m.photo='javascript:alert(1)';
 const {bound}=setup([m]);const card=bound[0].content.children[0];
 assert.equal(card.children[1].children[0].textContent,m.name);
 assert.equal(card.children[0].children.length,0);
});
