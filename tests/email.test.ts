import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { emailConfig,renderBroadcast,validSchedule } from '../lib/email/policy';
import { createBroadcast,verifySegment,getBroadcast,ResendError } from '../lib/email/resend';
const config={key:'test-only-secret',from:'Foxyavenue <hello@foxyavenue.com>',segmentId:'78261eea-8f8b-4381-83c6-79fa7120f1cf'};
test('the two brands cannot inherit each other’s sender or segment',()=>{
 const env={RESEND_API_KEY:'test',RESEND_FROM_FOXYAVENUE:config.from,RESEND_SEGMENT_ID_FOXYAVENUE:config.segmentId,RESEND_FROM_SHAPES_AND_PIECES:'Shapes and Pieces <hello@shapesandpieces.com>',RESEND_SEGMENT_ID_SHAPES_AND_PIECES:'abcdefab-abcd-abcd-abcd-abcdefabcdef'};
 assert.equal(emailConfig('foxyavenue',env)?.segmentId,config.segmentId);
 assert.notEqual(emailConfig('shapes-and-pieces',env)?.segmentId,config.segmentId);
 assert.equal(emailConfig('shapes-and-pieces',{RESEND_API_KEY:'key'}),null);
 assert.equal(emailConfig('foxyavenue',{...env,RESEND_FROM_FOXYAVENUE:'not-an-email'}),null);
});
test('email text is escaped and an unsubscribe token is appended',()=>{
 const message=renderBroadcast('<img src=x onerror=alert(1)>\nNew pieces & more');
 assert.ok(!message.html.includes('<img'));
 assert.match(message.html,/&lt;img/);
 assert.match(message.html,/New pieces &amp; more/);
 assert.match(message.html,/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/);
 assert.match(message.text,/Unsubscribe:/);
});
test('scheduled submission requires a future date',()=>{
 assert.equal(validSchedule(null),null);
 assert.equal(validSchedule('2026-10-22T12:00:00.000Z',Date.parse('2026-10-22T12:00:00.000Z')),null);
 assert.equal(validSchedule('2026-10-22T12:02:00.000Z',Date.parse('2026-10-22T12:00:00.000Z')),'2026-10-22T12:02:00.000Z');
});
test('Resend gets only fixed paths, the configured segment, escaped body and schedule',async t=>{
 let calls=0;const mock=t.mock.method(globalThis,'fetch',async(url:string,init:RequestInit)=>{
 calls++;assert.ok(String(url).startsWith('https://api.resend.com/'));
 assert.equal((init.headers as Record<string,string>).Authorization,`Bearer ${config.key}`);
 if(calls===1)return Response.json({id:config.segmentId,name:'Subscribed Foxy customers'});
 if(calls===2){const body=JSON.parse(String(init.body));assert.equal(body.segment_id,config.segmentId);assert.equal(body.send,true);assert.equal(body.scheduled_at,'2026-10-25T12:00:00.000Z');assert.ok(!body.html.includes('<script>'));assert.match(body.html,/RESEND_UNSUBSCRIBE_URL/);return Response.json({object:'broadcast',id:'receipt-1'});}
 return Response.json({status:'scheduled'});
 });
 assert.equal(await verifySegment(config),'Subscribed Foxy customers');
 assert.equal(await createBroadcast(config,{subject:'New arrivals',body:'<script>bad()</script>',scheduledAt:'2026-10-25T12:00:00.000Z'}),'receipt-1');
 assert.equal(await getBroadcast(config,'receipt-1'),'scheduled');
 assert.equal(mock.mock.callCount(),3);
});
test('a rejected segment and an uncertain network result are distinct',async t=>{
 const mock=t.mock.method(globalThis,'fetch',async()=>Response.json({message:'sensitive payload'},{status:404}));
 await assert.rejects(()=>verifySegment(config),(e:unknown)=>e instanceof ResendError&&e.rejected&&e.code==='segment'&&!e.message.includes('sensitive'));
 mock.mock.mockImplementation(async()=>{throw new Error('network timeout');});
 await assert.rejects(()=>createBroadcast(config,{subject:'Test',body:'Hello',scheduledAt:null}),(e:unknown)=>e instanceof ResendError&&!e.rejected);
});
test('a saved campaign can be dispatched once and preserves a receipt with website isolation',async()=>{
 const db=new PGlite();try{
 await db.exec(await readFile('db/001_initial.sql','utf8'));
 await db.exec(await readFile('db/004_email_broadcasts.sql','utf8'));
 const id='10000000-0000-4000-8000-000000000010';
 await db.query("INSERT INTO marketing_content(id,workspace,kind,title,body,channel,created_by) VALUES ($1,'foxyavenue','email','A launch','Welcome','Email','admin')",[id]);
 const claim=()=>db.query("INSERT INTO email_dispatches(content_id,workspace,state,subject,sender,segment_id) VALUES ($1,'foxyavenue','submitting','A launch','Foxy <hello@foxyavenue.com>',$2) ON CONFLICT(content_id) DO NOTHING RETURNING content_id",[id,config.segmentId]);
 assert.equal((await claim()).rows.length,1);assert.equal((await claim()).rows.length,0);
 await db.query("UPDATE email_dispatches SET state='queued',resend_id='receipt-1' WHERE content_id=$1",[id]);
 assert.equal((await db.query("SELECT * FROM email_dispatches WHERE workspace='shapes-and-pieces'")).rows.length,0);
 assert.equal((await db.query<{resend_id:string}>("SELECT resend_id FROM email_dispatches WHERE workspace='foxyavenue'")).rows[0].resend_id,'receipt-1');
 }finally{await db.close();}
});
