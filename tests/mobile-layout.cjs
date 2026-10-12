// Run Astro with PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA and an
// isolated Chrome --remote-debugging-port=9437. No contact is submitted.
// Turnstile is mocked at its documented dimensions; this tests layout, not verification.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const tabs = await (await fetch(`http://localhost:${process.env.PV_CDP_PORT || 9437}/json`)).json();
  const ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const callback = pending.get(message.id);
      pending.delete(message.id);
      message.error ? callback.reject(message.error) : callback.resolve(message.result);
    }
    if (message.method === 'Fetch.requestPaused') {
      const script = `const widget=document.querySelector('.cf-turnstile');
        const compact=widget.dataset.size==='compact';
        const frame=document.createElement('iframe');frame.title='Security layout fixture';
        frame.style.cssText='border:0;width:'+(compact?150:300)+'px;height:'+(compact?140:65)+'px';
        widget.append(frame);widget.dataset.layoutReady='true';`;
      send('Fetch.fulfillRequest', {
        requestId: message.params.requestId, responseCode: 200,
        responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }],
        body: Buffer.from(script).toString('base64'),
      }).catch(error => console.error(error));
    }
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  try {
    await send('Fetch.enable', { patterns: [{ urlPattern: '*challenges.cloudflare.com/turnstile/v0/api.js*' }] });
    const results = [];
    for (const width of [320, 360, 390, 400, 401, 430, 600, 767]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
      await send('Page.navigate', { url: process.env.PV_TEST_URL || 'http://localhost:4321/' });
      for (let i = 0; i < 100; i++) {
        if (await evaluate('!!document.querySelector(".cf-turnstile[data-layout-ready]")')) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert(await evaluate('!!document.querySelector(".cf-turnstile[data-layout-ready]")'), 'Start Astro with the public testing site key');
      await evaluate('document.fonts.ready');
      for (const state of ['initial', 'long-status']) {
        if (state === 'long-status') await evaluate(`document.querySelector('[data-form-status]').textContent='Solicitação registrada com sucesso. A PrimeView Filmes recebeu seus dados e entrará em contato.';document.querySelector('textarea').style.height='260px'`);
        const result = await evaluate(`(() => {
          const rect=s=>document.querySelector(s).getBoundingClientRect();
          const form=rect('.contact-form'),front=rect('.virtual-card-front'),back=rect('.virtual-card-back'),footer=rect('.site-footer');
          const fields=[...document.querySelectorAll('.contact-form input:not(.honeypot),.contact-form select,.contact-form textarea,.contact-form button[type=submit],.cf-turnstile iframe')];
          return {
            stacked:front.top>=form.bottom+20&&back.top>=front.bottom+20&&footer.top>=back.bottom,
            contained:fields.every(e=>{const r=e.getBoundingClientRect();return r.left>=form.left&&r.right<=form.right&&r.bottom<=form.bottom}),
            cardsFit:front.left>=0&&back.left>=0&&front.right<=innerWidth&&back.right<=innerWidth,
            overflow:[...document.querySelectorAll('main h2,.social-links a,.social-links small,.footer-inner>a')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.tagName),
            compact:document.querySelector('.cf-turnstile').dataset.size==='compact'
          };
        })()`);
        assert(result.stacked && result.contained && result.cardsFit, `${width}/${state}: ${JSON.stringify(result)}`);
        assert.deepEqual(result.overflow, [], `${width}/${state}: text overflow`);
        assert.equal(result.compact, width <= 400);
        results.push({ width, state, passed: true });
      }
      if (process.env.PV_TEST_OUTPUT && [320, 390, 430].includes(width)) {
        await evaluate('document.querySelector(".virtual-card-composition").scrollIntoView({block:"center",behavior:"instant"})');
        await evaluate('Promise.all([...document.querySelectorAll(".virtual-card img")].map(img=>img.decode()))');
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.mkdirSync(process.env.PV_TEST_OUTPUT, { recursive: true });
        fs.writeFileSync(path.join(process.env.PV_TEST_OUTPUT, `cards-${width}.png`), Buffer.from(shot.data, 'base64'));
      }
    }
    console.log(JSON.stringify(results, null, 2));
  } finally { await send('Fetch.disable'); ws.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
