import test from 'node:test';
import assert from 'node:assert/strict';
import {appearanceSchema,defaultAppearance,appearanceVariables} from '../lib/dashboard-appearance.mjs';
import {loadAppearance,saveAppearance} from '../lib/dashboard-preferences.mjs';
test('appearance accepts validated colors and never arbitrary CSS or account fields',()=>{
  assert.deepEqual(appearanceSchema.parse({primary:'#AABBCC',secondary:'#123456'}),{...defaultAppearance,primary:'#aabbcc',secondary:'#123456'});
  for(const value of [{primary:'red',secondary:'#123456'},{primary:'url(https://bad.test)',secondary:'#123456'},{...defaultAppearance,user_id:2}])assert.equal(appearanceSchema.safeParse(value).success,false);
  assert.equal(appearanceVariables({primary:'bad',secondary:'bad'})['--glass-primary'],defaultAppearance.primary);
  assert.equal(appearanceVariables({primary:'#112233',secondary:'#ffffff'})['--glass-primary-rgb'],'17,34,51');
  const partial=appearanceVariables({...defaultAppearance,primary:'#',secondary:'#0033ff',fontStyle:'serif',textSize:18});
  assert.equal(partial['--glass-secondary'],'#0033ff');assert(partial['--dashboard-font'].includes('Georgia'));assert.equal(partial['--dashboard-text-size'],'18px');
});
test('account preferences use the authenticated owner id and round-trip through storage',async()=>{
  let stored;
  const run=async(sql,values)=>{
    if(sql.startsWith('INSERT')){assert.equal(values[0],'7');stored={primaryColor:values[1],secondaryColor:values[2],fontStyle:values[3],textSize:values[4],headingSize:values[5]};return {affectedRows:1};}
    assert(sql.includes('WHERE user_id=?'));assert.deepEqual(values,['7']);return stored?[stored]:[];
  };
  assert.deepEqual(await loadAppearance('7',run),defaultAppearance);
  await saveAppearance('7',{primary:'#123456',secondary:'#abcdef',fontStyle:'serif',textSize:18,headingSize:40},run);
  assert.deepEqual(await loadAppearance('7',run),{primary:'#123456',secondary:'#abcdef',fontStyle:'serif',textSize:18,headingSize:40});
  await saveAppearance('7',{primary:'#654321',secondary:'#fedcba'},run);
  assert.deepEqual(await loadAppearance('7',run),{primary:'#654321',secondary:'#fedcba',fontStyle:'serif',textSize:18,headingSize:40});
  await assert.rejects(saveAppearance('7',{primary:'bad',secondary:'#abcdef'},()=>{throw Error('Must not write invalid input');}));
});
test('typography uses allowlisted fonts and bounded integer sizes',()=>{
  for(const settings of [{fontStyle:'url(https://bad.test)'},{textSize:8},{textSize:21},{textSize:14.5},{headingSize:100},{headingSize:23}])assert.equal(appearanceSchema.safeParse({...defaultAppearance,...settings}).success,false);
  const vars=appearanceVariables({...defaultAppearance,fontStyle:'mono',textSize:20,headingSize:44});
  assert(vars['--dashboard-font'].includes('monospace'));assert.equal(vars['--dashboard-text-size'],'20px');assert.equal(vars['--dashboard-heading-size'],'44px');
});
