const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const css=fs.readFileSync('tokens.css','utf8'),md=fs.readFileSync('DESIGN.md','utf8');
const blocks=[...css.matchAll(/(?:^|\n)(:root|\[data-theme="dark"\])\{([\s\S]*?)\}/g)];
function luminance(hex){const c=hex.match(/\w\w/g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
test('25 logical roles, same nine color roles in both modes, all CSS values match the spec',()=>{
 const values=blocks.map(([,name,body])=>Object.fromEntries([...body.matchAll(/--color-([\w-]+):(#\w{6})/g)].map(m=>[m[1],m[2]])));
 assert.equal(Object.keys(values[0]).length,9);assert.deepEqual(Object.keys(values[0]),Object.keys(values[1]));
 const counts=['color','type','space','rounded','shadow'].map(prefix=>[...blocks[0][2].matchAll(new RegExp('--'+prefix+'-[\\w-]+:','g'))].length);assert.deepEqual(counts,[9,5,6,3,2]);
 for(const v of Object.values(values[0]).concat(Object.values(values[1])))assert(md.includes(v),v+' absent in DESIGN.md');
 for(const v of values){assert(contrast(v.secondary,v.surface)>=4.5);assert(contrast(v.secondary,v.neutral)>=4.5)}
 for(const v of values) assert(contrast(v.error,'#FFFFFF')>=4.5,'Urgent badge white text must contrast against its error background');
 assert(!css.includes('Noto'));assert(css.includes('"Pretendard Variable",Pretendard'));
});
