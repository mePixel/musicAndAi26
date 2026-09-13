import test from 'node:test';
import assert from 'node:assert/strict';
import { createPoseRecognizer } from './pose-recognition.js';
import { createRound, createCameraPoseGrace } from './game.js';

const classes = { leftHip:'Right Hip', rightHip:'Left Hip', leftHand:'Right Hand', rightHand:'Left Hand' };
function joints() {
  const points = Array.from({length:17},()=>({score:.95,position:{x:320,y:200}}));
  for (const [index,x,y] of [[5,410,150],[6,230,150],[7,450,225],[8,190,225],[9,380,285],[10,260,285],[11,380,300],[12,260,300]]) {
    points[index].position={x,y};
  }
  return points;
}
const predictions = pose => [{className:classes[pose],probability:.96},{className:'Default',probability:.04}];

for (const pose of Object.keys(classes)) {
  test(`${pose}: a visible release and return scores consecutive notes with the same model label`, () => {
    const recognizer=createPoseRecognizer(), points=joints();
    const round=createRound([{time:3,pose},{time:3.5,pose},{time:4,pose}]);
    const grace=createCameraPoseGrace(round);
    const events=[];
    function frame(now) {
      const result=recognizer.update(predictions(pose),points,now);
      if(result.event) events.push(result.event);
      const time=2.88+now/1000;
      grace.update(result,time); grace.judge(time);
      return result;
    }
    frame(0);frame(60);frame(120);
    assert.equal(round.hits,1);
    const wrist=points[pose.startsWith('left')?10:9];
    wrist.position.y-=90;
    assert.equal(frame(180).fresh,false);
    assert.equal(frame(240).fresh,false);
    wrist.position.y+=90;
    assert.equal(frame(300).event,null);
    assert.equal(frame(360).event,null);
    assert.equal(frame(420).event,pose);
    frame(620);
    assert.equal(round.hits,2);
    for(const time of [680,740,800,860,920,980,1040,1100,1120]) frame(time);
    assert.equal(round.hits,2,'continuing to hold must not claim the third note');
    assert.deepEqual(events,[pose,pose]);
  });
}

test('jitter, one-frame movement, and tracking loss never rearm a held pose', () => {
  for(const kind of ['small movement','one frame','lost joints']) {
    const recognizer=createPoseRecognizer(), points=joints();
    for(const now of [0,60,120]) recognizer.update(predictions('rightHip'),points,now);
    const wrist=points[9];
    if(kind==='small movement') wrist.position.y-=15;
    if(kind==='one frame') wrist.position.y-=90;
    if(kind==='lost joints') wrist.score=0;
    recognizer.update(predictions('rightHip'),points,180);
    if(kind==='one frame') wrist.position.y+=90;
    recognizer.update(predictions('rightHip'),points,240);
    if(kind==='small movement') wrist.position.y+=15;
    wrist.score=.95;
    for(const now of [300,360,420,480,540]) {
      assert.equal(recognizer.update(predictions('rightHip'),points,now).event,null,kind);
    }
  }
});

test('body translation or scale changes do not count as releasing a pose', () => {
  const recognizer=createPoseRecognizer(), points=joints();
  for(const now of [0,60,120]) recognizer.update(predictions('leftHip'),points,now);
  for(const point of points) point.position={x:point.position.x*.7+100,y:point.position.y*.7+40};
  for(const now of [180,240,300,360]) {
    const result=recognizer.update(predictions('leftHip'),points,now);
    assert.equal(result.pose,'leftHip'); assert.equal(result.event,null);
  }
});

test('reset clears an unfinished release gesture', () => {
  const recognizer=createPoseRecognizer(), points=joints();
  for(const now of [0,60,120]) recognizer.update(predictions('rightHip'),points,now);
  points[9].position.y-=90;
  for(const now of [180,240]) recognizer.update(predictions('rightHip'),points,now);
  recognizer.reset();
  points[9].position.y+=90;
  const events=[300,360,420,480].map(now=>recognizer.update(predictions('rightHip'),points,now).event).filter(Boolean);
  assert.deepEqual(events,['rightHip']);
});

test('a visible release and return also works with slower inference', () => {
  const recognizer=createPoseRecognizer(), points=joints();
  recognizer.update(predictions('rightHip'),points,0);
  assert.equal(recognizer.update(predictions('rightHip'),points,200).event,'rightHip');
  points[9].position.y-=90;
  recognizer.update(predictions('rightHip'),points,400);
  recognizer.update(predictions('rightHip'),points,600);
  points[9].position.y+=90;
  assert.equal(recognizer.update(predictions('rightHip'),points,800).event,null);
  assert.equal(recognizer.update(predictions('rightHip'),points,1000).event,'rightHip');
});
