const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('theme-mode.js','utf8');
function setup(saved=null,systemDark=false,storageFails=false){
  const events={},docEvents={},mediaEvents={},stored=new Map(saved?[['pinmap-appearance',saved]]:[]);
  const root={dataset:{},style:{}};
  const media={matches:systemDark,addEventListener:(name,fn)=>mediaEvents[name]=fn};
  const window={addEventListener:(name,fn)=>events[name]=fn,dispatchEvent:()=>{}};
  const document={documentElement:root,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(name,fn)=>docEvents[name]=fn};
  vm.runInNewContext(source,{window,document,matchMedia:()=>media,CustomEvent:class{},localStorage:{getItem:key=>{if(storageFails)throw Error();return stored.get(key)},setItem:(key,value)=>{if(storageFails)throw Error();stored.set(key,value)}}});
  return {root,theme:window.PinmapTheme,stored,events,system(value){media.matches=value;mediaEvents.change()}};
}
test('default follows system and responds to OS changes',()=>{const s=setup(null,true);assert.equal(s.root.dataset.theme,'dark');s.system(false);assert.equal(s.root.dataset.theme,'light')});
test('explicit choice persists, ignores OS, restores on load',()=>{const s=setup();s.theme.set('dark');s.system(false);assert.equal(s.root.dataset.theme,'dark');assert.equal(s.stored.get('pinmap-appearance'),'dark');assert.equal(setup('dark').root.dataset.theme,'dark');s.theme.set('system');assert.equal(s.root.dataset.theme,'light')});
test('other frame changes and storage clearing update appearance',()=>{const s=setup();s.events.storage({key:'pinmap-appearance',newValue:'dark'});assert.equal(s.root.dataset.theme,'dark');s.events.storage({key:null,newValue:null});assert.equal(s.theme.mode,'system');assert.equal(s.root.dataset.theme,'light')});
test('unavailable storage and invalid preferences do not break rendering',()=>{const s=setup(null,true,true);s.theme.set('light');assert.equal(s.root.dataset.theme,'light');s.theme.set('constructor');assert.equal(s.theme.mode,'light');assert.equal(setup('toString').theme.mode,'system')});
