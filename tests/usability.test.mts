import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { compareTrainingVolume } from '../src/lib/progression.ts'
import { tempoAnnouncement } from '../src/lib/guided-set.ts'

test('volume comparisons convert mixed units before calculating change', () => {
  const result = compareTrainingVolume([{total_volume:220.46226218,unit:'lbs'}], [{total_volume:80,unit:'kg'}], 'kg')
  assert.ok(Math.abs(result.currentVolume - 100) < 0.0001)
  assert.ok(Math.abs(result.percent! - 25) < 0.0001)
  assert.equal(result.currentBar,100)
  assert.ok(Math.abs(result.previousBar - 80) < 0.0001)
})

test('comparison handles no baseline, zero volume and decreases without invented percentages', () => {
  const empty = compareTrainingVolume([], [], 'lbs')
  assert.equal(empty.hasBaseline,false)
  assert.equal(empty.percent,null)
  assert.equal(empty.currentBar,0)
  const first = compareTrainingVolume([{total_volume:100,unit:'lbs'}], [], 'lbs')
  assert.equal(first.percent,null)
  assert.equal(first.difference,100)
  const lower = compareTrainingVolume([{total_volume:50,unit:'lbs'}], [{total_volume:100,unit:'lbs'}], 'lbs')
  assert.equal(lower.percent,-50)
  assert.equal(lower.currentBar,50)
})

test('tempo live announcements change only at meaningful countdown, phase and rep boundaries', () => {
  assert.equal(tempoAnnouncement('running',10),tempoAnnouncement('running',2900))
  assert.match(tempoAnnouncement('running',3000),/0 completed reps. Lift/)
  assert.match(tempoAnnouncement('running',4000),/1 completed rep. Lower/)
  assert.match(tempoAnnouncement('paused',8100),/paused. 2 completed reps/)
  assert.match(tempoAnnouncement('ready',1000),/Get ready. 2/)
})

test('normal and muted UI text meet WCAG AA contrast on all dark surfaces', () => {
  const css=readFileSync(new URL('../src/app/globals.css',import.meta.url),'utf8')
  function color(name:string) {
    const value=css.match(new RegExp(`--${name}: (#[0-9a-f]{6})`))![1]
    return value
  }
  function luminance(hex:string) {
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4)
    return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722
  }
  function ratio(a:string,b:string) {
    const values=[luminance(a),luminance(b)].sort((a,b)=>b-a)
    return (values[0]+0.05)/(values[1]+0.05)
  }
  for(const fg of ['foreground','muted','accent','danger']) for(const bg of ['background','surface','surface-2']) {
    assert.ok(ratio(color(fg),color(bg))>=4.5,`${fg} on ${bg} must meet 4.5:1`)
  }
  assert.ok(ratio('#08120c',color('accent'))>=4.5)
})
