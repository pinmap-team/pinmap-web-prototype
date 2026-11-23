// The home coachmark highlights a home-screen card (.mainpick, coach.js step 1).
// It must start only while the home screen is still open: finishOnboarding fires
// it on a 350ms timer, and a user who navigates away immediately must not see
// the home tutorial over another page.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=file=>fs.readFileSync(file,'utf8');

// 2026-11-23: 코치마크는 쓰지 않아요. 온보딩이 끝나도, 이용 가이드에서도 시작하지 않아요.
test('the home coach is no longer started after onboarding or from the guide',()=>{
  assert(!/startCoach\(/.test(read('pinmap.js')),'finishOnboarding does not start the coach');
  assert(!read('mypages.js').includes("myRow('coachagain'"),'the guide has no coach replay row');
});

test('coach step 1 points at a home screen element, not a global overlay',()=>{
  const step=read('coach.js').match(/\{sel:'([^']+)'[^}]*최근 저장한 콘텐츠/);
  assert(step,'first coach step selector');
  assert(step[1].includes('.mainpick'),'coach step 1 targets the home pick card');
});
