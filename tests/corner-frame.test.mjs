import test from 'node:test';
import assert from 'node:assert/strict';
import {outsideFrame,frameColor} from '../lib/corner-frame.mjs';
test('corner frame stays seven pixels outside every edge in viewport coordinates',()=>{
 assert.deepEqual(outsideFrame({left:100,top:200,width:300,height:150}),{left:93,top:193,width:314,height:164});
 assert.equal(outsideFrame({left:0,top:-10,width:30,height:20}).top,-17);
});
test('white surfaces get black corners and dark surfaces keep their green or purple accent',()=>{
 assert.equal(frameColor([{backgroundColor:'rgb(255, 255, 255)'}],'#98ff02'),'#000000');
 assert.equal(frameColor([{backgroundColor:'rgb(15, 15, 15)'}],'#b197ef'),'#b197ef');
 assert.equal(frameColor([{backgroundColor:'rgba(0, 0, 0, 0)'},{backgroundColor:'rgb(250, 250, 250)'}],'#98ff02'),'#000000');
 assert.equal(frameColor([{backgroundColor:'rgba(0, 0, 0, 0)',backgroundImage:'linear-gradient(rgb(22, 22, 22), rgb(10, 10, 10))'}],'#98ff02'),'#98ff02');
});
