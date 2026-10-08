// Requires an already running local Chrome --remote-debugging-port=9437 and Astro.
// No packages are installed, no real contact is submitted, and no secrets are read.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const tabs = await (await fetch(`http://localhost:${process.env.PV_CDP_PORT || 9437}/json`)).json();
  const page = tabs.find(tab => tab.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once:true }));
  let id = 0;
  const pending = new Map();
  const exceptions = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const callback = pending.get(message.id); pending.delete(message.id); message.error ? callback.reject(message.error) : callback.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, {resolve,reject}); ws.send(JSON.stringify({ id:n, method, params })); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue:true, awaitPromise:true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  try {
    await send('Runtime.enable');
    await send('Emulation.setEmulatedMedia', { features:[{name:'prefers-reduced-motion',value:'reduce'}] });
    await send('Page.navigate', { url:process.env.PV_TEST_URL || 'http://localhost:4321/' });
    for (let i=0;i<100;i++) { if (await evaluate('!!document.querySelector("[data-contact-form]")?.noValidate')) break; await new Promise(r=>setTimeout(r,100)); }
    await evaluate('document.fonts.ready');
    const result = await evaluate(`(async()=>{
      const form=document.querySelector('[data-contact-form]'),dialog=document.querySelector('[data-contact-dialog]'),list=dialog.querySelector('[data-contact-errors]'),submit=form.querySelector('[data-submit]');
      const fields=['name','email','phone','profile','service','message'];
      const values={name:'Maria de Souza',email:'maria@example.com',phone:'(27) 98765-4321',profile:'Gastronomia',service:'Vídeos institucionais',message:'Solicitação de teste local.'};
      const fill=()=>Object.entries(values).forEach(([k,v])=>form.elements.namedItem(k).value=v);
      const originalFetch=window.fetch;let requests=0;
      window.fetch=async()=>{requests++;throw Error('Unexpected network during validation')};
      let combinations=0;
      for(let mask=1;mask<64;mask++)for(const empty of ['', '   ']){
        fill();let count=0;fields.forEach((field,i)=>{if(mask&(1<<i)){form.elements.namedItem(field).value=empty;count++}});
        form.requestSubmit();
        if(!dialog.open||list.children.length!==count)throw Error('Missing-field combination '+mask);
        fields.forEach((field,i)=>{if(!(mask&(1<<i))&&form.elements.namedItem(field).value!==values[field])throw Error('Input lost')});
        dialog.close();combinations++;
      }
      if(requests!==0)throw Error('Invalid form sent a request');
      fill();form.elements.namedItem('email').value='bad@@email';form.elements.namedItem('phone').value='123';form.requestSubmit();
      if(list.children.length!==2||!dialog.open)throw Error('Malformed fields not aggregated');dialog.close();
      fill();let resolveResponse;let submittedId='';
      window.fetch=(url,options)=>{requests++;submittedId=options.body.get('requestId');return new Promise(r=>resolveResponse=r)};
      form.requestSubmit();form.requestSubmit();
      for(let i=0;i<100&&!resolveResponse;i++)await new Promise(r=>setTimeout(r,10));
      if(requests!==1||!submit.disabled)throw Error('Duplicate click guard');
      resolveResponse(Response.json({success:false,code:'verification_pending'},{status:503}));
      await new Promise(r=>setTimeout(r,30));
      const preserved=fields.every(f=>form.elements.namedItem(f).value===values[f]);
      if(!preserved||submit.disabled||form.querySelector('[data-form-status]').dataset.state!=='error')throw Error('Failure state');
      const originalId=submittedId;
      window.fetch=async(url,options)=>{requests++;if(options.body.get('requestId')!==originalId)throw Error('Retry changed ID');return Response.json({success:true,status:'recorded',requestId:originalId,notification:'pending'})};
      form.requestSubmit();await new Promise(r=>setTimeout(r,60));
      if(form.querySelector('[data-form-status]').dataset.state!=='success'||form.elements.namedItem('name').value!=='')throw Error('Confirmed submission not handled');
      fill();window.fetch=async()=>Response.json({success:true});form.requestSubmit();await new Promise(r=>setTimeout(r,60));
      if(form.elements.namedItem('name').value!==values.name||form.querySelector('[data-form-status]').dataset.state!=='error')throw Error('Unconfirmed 200 accepted');
      window.fetch=originalFetch;form.reset();form.querySelector('[data-form-status]').textContent='';form.requestSubmit();
      return {combinations,requests,fieldsPreserved:preserved,novalidate:form.noValidate,dialogOpen:dialog.open,focusedTitle:document.activeElement.id==='pv-validation-title'};
    })()`);
    assert.equal(result.combinations,126);assert(result.fieldsPreserved&&result.novalidate&&result.dialogOpen&&result.focusedTitle);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',modifiers:8});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',modifiers:8});
    assert(await evaluate('document.querySelector("[data-contact-dialog]").contains(document.activeElement)'));
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
    await new Promise(r=>setTimeout(r,50));
    assert(await evaluate('!document.querySelector("[data-contact-dialog]").open && document.activeElement.id === "pv-contact-name"'));
    const views=[];
    for(const [width,height] of [[320,568],[390,844],[768,1024],[1440,900]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      await evaluate('document.querySelector("[data-contact-form]").reset();document.querySelector("[data-contact-form]").requestSubmit()');
      const geometry=await evaluate(`(()=>{const d=document.querySelector('[data-contact-dialog]'),r=d.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,clientWidth:d.clientWidth,scrollWidth:d.scrollWidth,open:d.open}})()`);
      assert(geometry.open&&geometry.x>=0&&geometry.y>=0&&geometry.x+geometry.w<=width&&geometry.y+geometry.h<=height);
      assert(geometry.scrollWidth<=geometry.clientWidth);
      views.push({width,height,...geometry});
      if(process.env.PV_TEST_OUTPUT){fs.mkdirSync(process.env.PV_TEST_OUTPUT,{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(process.env.PV_TEST_OUTPUT,`dialog-${width}.png`),Buffer.from(shot.data,'base64'));}
      await evaluate('document.querySelector("[data-dialog-close]").click()');
      await new Promise(r=>setTimeout(r,20));
      assert(await evaluate('!document.querySelector("[data-contact-dialog]").open && document.activeElement.id === "pv-contact-name"'));
    }
    assert.deepEqual(exceptions,[]);
    console.log(JSON.stringify({result,keyboard:'passed',closeButton:'passed',views,consoleExceptions:exceptions.length},null,2));
    await send('Page.navigate',{url:process.env.PV_TEST_URL||'http://localhost:4321/'});
  } finally { ws.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
