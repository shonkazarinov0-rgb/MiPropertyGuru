const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../frontend/src/photos/pickWorkPhoto.ts','utf8')
 .replace(/import .*;\n/,'').replace('export function photoDataUri(asset: { base64?: string | null; mimeType?: string | null })','function photoDataUri(asset)')
 .replace('export async function','async function');
function setup(result,granted=true){
 const calls=[];const context={ImagePicker:{requestMediaLibraryPermissionsAsync:async()=>({granted}),
 UIImagePickerPreferredAssetRepresentationMode:{Compatible:'compatible'},
 launchImageLibraryAsync:async options=>{calls.push(options);return result;}}};
 vm.createContext(context);vm.runInContext(source,context);return {context,calls};
}
test('selected JPEG is returned with a complete data URI',async()=>{
 const {context,calls}=setup({assets:[{base64:'/9j/test',mimeType:'image/heic'}]});
 assert.equal(await context.pickWorkPhoto(),'data:image/jpeg;base64,/9j/test');
 assert.equal(calls[0].allowsEditing,false);assert.equal(calls[0].preferredAssetRepresentationMode,'compatible');
});
test('PNG data is not incorrectly labelled JPEG',()=>{
 const {context}=setup({});assert.equal(context.photoDataUri({base64:'iVBORw0KGgotest',mimeType:'image/jpeg'}),'data:image/png;base64,iVBORw0KGgotest');
});
test('cancel returns no selection',async()=>{
 const {context}=setup({canceled:true});assert.equal(await context.pickWorkPhoto(),null);
});
test('missing asset and missing base64 produce explicit errors',async()=>{
 for(const result of [{assets:[]},{assets:[{uri:'file:///photo.jpg'}]}]){
 const {context}=setup(result);await assert.rejects(()=>context.pickWorkPhoto(),/photo/i);
 }
});
test('denied photo permission does not launch the picker',async()=>{
 const {context,calls}=setup({},false);await assert.rejects(()=>context.pickWorkPhoto(),/Settings/);assert.equal(calls.length,0);
});
