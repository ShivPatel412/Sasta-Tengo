import test from 'node:test';
import assert from 'node:assert/strict';
import {appearanceSchema,defaultAppearance,appearanceVariables,loadAppearance,saveAppearance} from '../lib/dashboard-appearance.mjs';
test('appearance accepts only two hex colors and never arbitrary CSS or account fields',()=>{
  assert.deepEqual(appearanceSchema.parse({primary:'#AABBCC',secondary:'#123456'}),{primary:'#aabbcc',secondary:'#123456'});
  for(const value of [{primary:'red',secondary:'#123456'},{primary:'url(https://bad.test)',secondary:'#123456'},{...defaultAppearance,user_id:2}])assert.equal(appearanceSchema.safeParse(value).success,false);
  assert.equal(appearanceVariables({primary:'bad',secondary:'bad'})['--glass-primary'],defaultAppearance.primary);
  assert.equal(appearanceVariables({primary:'#112233',secondary:'#ffffff'})['--glass-primary-rgb'],'17,34,51');
});
test('account preferences use the authenticated owner id and round-trip through storage',async()=>{
  let stored;
  const run=async(sql,values)=>{
    if(sql.startsWith('INSERT')){assert.equal(values[0],'7');stored={primaryColor:values[1],secondaryColor:values[2]};return {affectedRows:1};}
    assert(sql.includes('WHERE user_id=?'));assert.deepEqual(values,['7']);return stored?[stored]:[];
  };
  assert.deepEqual(await loadAppearance('7',run),defaultAppearance);
  await saveAppearance('7',{primary:'#123456',secondary:'#abcdef'},run);
  assert.deepEqual(await loadAppearance('7',run),{primary:'#123456',secondary:'#abcdef'});
  await assert.rejects(saveAppearance('7',{primary:'bad',secondary:'#abcdef'},()=>{throw Error('Must not write invalid input');}));
});
