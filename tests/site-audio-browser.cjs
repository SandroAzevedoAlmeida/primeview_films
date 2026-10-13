// Requires local Astro and an isolated Chrome on port 9437. Plays only the local MP3.
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const tabs = await (await fetch('http://localhost:9437/json')).json();
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once:true }));
  let id=0; const pending=new Map();
  ws.addEventListener('message', e => { const m=JSON.parse(e.data); if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);} });
  const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  try {
    await send('Page.navigate',{url:process.env.PV_TEST_URL || 'http://localhost:4321/'});
    for(let i=0;i<100;i++){if(await evaluate('!!document.querySelector("[data-site-audio]:not([hidden])")'))break;await new Promise(r=>setTimeout(r,100));}
    assert(await evaluate(`(()=>{const a=document.querySelector('[data-music]');return a.paused&&a.loop&&a.preload==='none'&&a.readyState===0&&!a.autoplay})()`),'Silent, no audio download before interaction');
    await evaluate(`document.querySelector('[data-sound-toggle]').click()`);
    for(let i=0;i<100;i++){if(await evaluate(`document.querySelector('[data-music]').readyState>=3`))break;await new Promise(r=>setTimeout(r,100));}
    assert(await evaluate(`!document.querySelector('[data-music]').paused&&document.querySelector('[data-sound-toggle]').getAttribute('aria-pressed')==='true'`));
    for(const value of [0,70,100]){
      assert(await evaluate(`(()=>{const v=document.querySelector('[data-volume]');v.value='${value}';v.dispatchEvent(new Event('input'));return Math.abs(document.querySelector('[data-music]').volume-${value/100})<.001&&v.getAttribute('aria-valuetext')==='${value}%'})()`));
    }
    await evaluate(`document.querySelector('[data-music]').currentTime=document.querySelector('[data-music]').duration-.2`);
    await new Promise(r=>setTimeout(r,1200));
    assert(await evaluate(`!document.querySelector('[data-music]').paused&&document.querySelector('[data-music]').currentTime<5`),'Loop restarts at end');
    await evaluate(`document.querySelector('[data-sound-toggle]').click()`);
    assert(await evaluate(`document.querySelector('[data-music]').paused&&document.querySelector('[data-sound-toggle]').getAttribute('aria-pressed')==='false'`));
    await evaluate(`window.savedPlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=()=>Promise.reject(new Error('Test'));document.querySelector('[data-sound-toggle]').click()`);
    await new Promise(r=>setTimeout(r,50));
    assert(await evaluate(`!!document.querySelector('[data-sound-status]').textContent&&!document.querySelector('[data-sound-toggle]').hasAttribute('aria-busy')`),'Playback failure offers retry');
    await evaluate(`HTMLMediaElement.prototype.play=window.savedPlay;document.querySelector('[data-sound-toggle]').click()`);
    await new Promise(r=>setTimeout(r,100));
    assert(await evaluate(`!document.querySelector('[data-music]').paused`));
    await evaluate(`document.querySelector('[data-sound-toggle]').click()`);
    for(const width of [320,390,768,1440]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
      assert(await evaluate(`(()=>{const a=document.querySelector('[data-site-audio]').getBoundingClientRect(),w=document.querySelector('.whatsapp-float').getBoundingClientRect();return a.left>=0&&a.bottom<=innerHeight&&a.right<w.left&&a.width>=180})()`),'Control fits and does not overlap WhatsApp at '+width);
      if(width===390&&process.env.PV_TEST_OUTPUT){const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(process.env.PV_TEST_OUTPUT,Buffer.from(shot.data,'base64'));}
    }
    console.log('PASS: silent start, real MP3 playback, volume 0/70/100%, looping, pause, error recovery, 4 viewport widths.');
  } finally {ws.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
