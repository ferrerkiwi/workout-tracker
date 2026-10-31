import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NextResponse } from 'next/server.js'
import { withResponseCookies } from '../src/lib/auth-response.ts'
import { dateKeyInTimeZone, validTimeZone } from '../src/lib/time-zone.ts'
import { convertWeight, isValidWeight } from '../src/lib/weight.ts'
import { addDays, fromDateKey, toDateKey } from '../src/lib/week.ts'
import { computeStreak, buildRecurringPlanLookup } from '../src/lib/streak.ts'
import { routineInputSchema } from '../src/lib/routine-schema.ts'
import { boundedCoachHistory, coachRequestSchema } from '../src/lib/coach-request.ts'
import { runCoach } from '../src/lib/coach-runner.ts'

test('user calendar dates respect midnight, DST and invalid timezone input', () => {
  const instant = new Date('2026-11-01T01:00:00Z')
  assert.equal(dateKeyInTimeZone(instant, 'America/New_York'), '2026-10-31')
  assert.equal(dateKeyInTimeZone(instant, 'UTC'), '2026-11-01')
  assert.equal(dateKeyInTimeZone(new Date('2026-11-01T06:30:00Z'), 'America/New_York'), '2026-11-01')
  assert.equal(validTimeZone('not/a/zone'), 'UTC')
})

test('volume conversion preserves meaning and weights reject nonfinite and oversized input', () => {
  assert.ok(Math.abs(convertWeight(135,'lbs','kg') - 61.23497) < 0.001)
  assert.ok(Math.abs(convertWeight(convertWeight(135,'lbs','kg'),'kg','lbs') - 135) < 0.001)
  for (const value of [NaN,Infinity,-1,5001,'100',undefined]) assert.equal(isValidWeight(value),false)
  for (const value of [null,0,135,5000]) assert.equal(isValidWeight(value),true)
})

test('long coach replies can be submitted as bounded history without blocking later messages', () => {
  const messages = Array.from({length:12},() => ({role:'assistant' as const,content:'x'.repeat(5000)}))
  const history = boundedCoachHistory(messages)
  assert.equal(history.length,8)
  assert.equal(history[0].content.length,1200)
  assert.equal(coachRequestSchema.safeParse({requestId:crypto.randomUUID(),message:'Continue',history}).success,true)
  const parsed = coachRequestSchema.parse({requestId:crypto.randomUUID(),message:'Continue',history:messages.slice(-8)})
  assert.equal(parsed.history[0].content.length,1200)
})

test('proxy redirects retain refreshed cookie attributes and deletions', () => {
  const source = NextResponse.next()
  source.cookies.set('auth-token','refreshed',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:120})
  source.cookies.set('old-chunk','',{path:'/',maxAge:0})
  const target = withResponseCookies(source,NextResponse.redirect('https://example.test/dashboard'))
  for (const original of source.cookies.getAll()) {
    const copied = target.cookies.get(original.name)!
    const { expires: originalExpiry, ...originalAttributes } = original
    const { expires: copiedExpiry, ...copiedAttributes } = copied
    assert.deepEqual(copiedAttributes, originalAttributes)
    if (originalExpiry) assert.ok(Math.abs(new Date(copiedExpiry!).getTime()-new Date(originalExpiry).getTime()) < 1000)
  }
})

test('streaks longer than 200 days remain valid using a consistent lookback', () => {
  const date=fromDateKey('2026-10-31')
  const completedDates=new Set(Array.from({length:400},(_,i)=>toDateKey(addDays(date,-i))))
  assert.equal(computeStreak({completedDates,plan:new Map(),date}),400)
  const plan=buildRecurringPlanLookup({created_at:'2026-11-01T01:00:00Z',routine_days:[{day_of_week:5,is_rest_day:true}]},'America/New_York')
  assert.equal(plan.get(5)?.planCreatedOn,'2026-10-31')
})

test('routine input rejects weights outside the same range enforced in workouts', () => {
  const exercise={name:'Bench press',metric:'reps',sets:3,reps:8,duration_seconds:null,suggested_weight:6000,rest_seconds:60,notes:''}
  const routine={days:[{day_of_week:0,name:'Upper',is_rest_day:false,exercises:[exercise]}],summary:''}
  assert.equal(routineInputSchema.safeParse(routine).success,false)
  exercise.suggested_weight=135
  assert.equal(routineInputSchema.safeParse(routine).success,true)
})

test('coach preserves saved edits after upstream failure and checkpoints before the next call', async () => {
  const events:string[]=[]
  let calls=0
  const result=await runCoach({messages:[],maxSteps:6,
    respond:async()=>{events.push('model');if(calls++) throw new Error('timeout');return [{type:'tool_use',id:'tool1',name:'add_exercise',input:{},caller:{type:'direct'}}]},
    execute:async()=>{events.push('edit');return {ok:true,message:'Added a row.',routineChanged:true}},
    checkpoint:async()=>{events.push('checkpoint')},refreshContext:async()=> 'current plan',
  })
  assert.equal(result.routineChanged,true)
  assert.match(result.error!,/Added a row/)
  assert.deepEqual(events,['model','edit','checkpoint','model'])
})

test('coach reports edits on step exhaustion and does not invent changes on initial failure', async () => {
  const common={messages:[],checkpoint:async()=>{},refreshContext:async()=>'',execute:async()=>({ok:true,message:'Updated exercise.',routineChanged:true})}
  const limited=await runCoach({...common,maxSteps:1,respond:async()=>[{type:'tool_use',id:'tool1',name:'update_exercise',input:{},caller:{type:'direct'}}]})
  assert.equal(limited.routineChanged,true)
  assert.match(limited.error!,/edit limit/)
  const failed=await runCoach({...common,maxSteps:6,respond:async()=>{throw new Error('offline')}})
  assert.equal(failed.routineChanged,false)
})
