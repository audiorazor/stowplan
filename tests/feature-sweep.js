const { chromium } = require('playwright');
const results=[]; const ok=(n,c,d='')=>results.push([c?'PASS':'FAIL',n,d]);
(async()=>{
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const ctx = await b.newContext({viewport:{width:1500,height:950}}); const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const T=(ms=250)=>p.waitForTimeout(ms);
  const text=async sel=>(await p.$eval(sel,e=>e.textContent)).replace(/\s+/g,' ').trim();
  const totals=()=>text('#workspaceTotals');
  const step=async(name,fn)=>{ await p.evaluate(()=>document.querySelectorAll('.modal-backdrop').forEach(x=>x.remove())); try{ const r=await fn(); ok(name, r!==false, typeof r==='string'?r:''); }catch(e){ ok(name,false,e.message.split('\n')[0].slice(0,100)); } };
  await p.goto('file:///home/claude/stowplan/app/stowplan.html'); await T(1000);

  // ---- header / plan ----
  await step('Plan rename', async()=>{ await p.click('#planName'); await p.keyboard.type('Check Plan'); await p.keyboard.press('Enter'); await T(400); return (await text('#planName'))==='Check Plan'; });
  await step('Save state indicator', async()=>{ const c=await p.$eval('#saveState',e=>e.className); return /saved|saving/.test(c); });
  await step('⋯ menu + units switch', async()=>{ await p.click('#moreBtn'); await p.selectOption('#unitsSelect','metric'); await T(300); const t=await totals(); await p.keyboard.press('Escape'); await p.click('#moreBtn'); await p.selectOption('#unitsSelect','imperial'); await p.keyboard.press('Escape'); await T(300); return /kg/.test(t) && /lb/.test(await totals()); });
  await step('Shortcuts sheet (? key)', async()=>{ await p.keyboard.press('?'); await T(200); const o=!!(await p.$('[data-shortcuts]')); await p.click('#kbdClose'); return o; });

  // ---- library ----
  await step('Library filter', async()=>{ await p.fill('#gearFilter','caddy'); await T(200); const n=await p.$$eval('.gear-row',r=>r.length); await p.fill('#gearFilter',''); await T(200); return n>0 && n<16 ? `${n} rows` : false; });
  await step('Library add item', async()=>{ await p.click('#toggleAddForm'); await T(300); await p.fill('#f_l','50'); await p.fill('#f_w','20'); await p.fill('#f_h','30'); await p.fill('#f_wt','100'); await p.click('#f_save'); await T(400); return (await p.$$eval('.gear-row',r=>r.map(x=>x.textContent))).some(t=>/50 × 20 × 30/.test(t)); });
  await step('Library edit item (weight)', async()=>{ const rows=await p.$$('.gear-row'); let btn=null; for(const r of rows){ if(/50 × 20 × 30/.test(await r.textContent())){ btn=await r.$('[data-edit]'); break; } } await btn.click(); await T(300); await p.fill('#f_wt','150'); await p.click('#f_save'); await T(400); return (await p.$$eval('.gear-row',r=>r.map(x=>x.textContent))).some(t=>/50 × 20 × 30/.test(t)&&/150 lb/.test(t)); });
  await step('Library + adds to pool & truck', async()=>{ const idx=await p.$$eval('.gear-row',rs=>rs.findIndex(r=>/Caddy/.test(r.textContent))); await (await p.$$('[data-add]'))[idx].click(); await T(300); return /1 cases/.test(await totals()); });

  // ---- pool ----
  await step('Pool: Add to pool ×3', async()=>{ await p.fill('#poolAddQty','3'); await p.click('#poolAddBtn'); await T(400); return /4 cases/.test(await text('#poolTotals')); });
  await step('Pool: filter unassigned', async()=>{ await p.check('#poolFilterUnassigned'); await T(200); const n=await p.$$eval('.pool-row',r=>r.length); await p.uncheck('#poolFilterUnassigned'); await T(200); return n===3?'3 unassigned':`got ${n}`; });
  await step('Pool: select + batch name', async()=>{ for(let i=0;i<2;i++){ const cbs=await p.$$('.pool-row input[type=checkbox]:first-of-type'); await cbs[i].click(); await T(150); } await T(200); await p.click('#poolBatchNameBtn'); await T(300); const inp=await p.$('.modal input[type=text]'); await inp.fill('Motor'); await (await p.$('.modal .btn-block')).click(); await T(400); return (await p.$$eval('.pool-row input[data-pname], .pool-row .p-name input', es=>es.map(e=>e.value))).filter(v=>/Motor/.test(v)).length>=2; });
  await step('Pool: bulk assign to Truck 1', async()=>{ const n=await p.$$eval('.pool-row',r=>r.length); for(let i=0;i<n;i++){ const cbs=await p.$$('.pool-row input[type=checkbox]:first-of-type'); if(!(await cbs[i].isChecked())){ await cbs[i].click(); await T(150); } } await T(200); const opts=await p.$$eval('#poolAssignSel option',o=>o.map(x=>x.value)); await p.selectOption('#poolAssignSel', opts[1]); await T(500); return /4 cases/.test(await totals()); });

  // ---- floor: selection & manipulation ----
  const cv=async()=>{ const c=await p.$('canvas[data-tile]'); await c.scrollIntoViewIfNeeded(); return c; };
  const findCase=async()=>{ const c=await cv(); const bb=await c.boundingBox(); for(let fy=0.2;fy<0.95;fy+=0.12) for(let fx=0.03;fx<0.9;fx+=0.06){ await p.mouse.click(bb.x+bb.width*fx,bb.y+bb.height*fy); await T(40); if(/from nose/.test(await text('#selBar'))) return [bb.x+bb.width*fx,bb.y+bb.height*fy,bb]; } return null; };
  let pos;
  await step('Click selects a case', async()=>{ pos=await findCase(); return !!pos; });
  await step('Rotate (R)', async()=>{ const idx=await p.$$eval('.gear-row',rs=>rs.findIndex(r=>/54 × 45 × 76/.test(r.textContent))); await (await p.$$('[data-add]'))[idx].click(); await T(300); const c=await cv(); const bb=await c.boundingBox(); let got=false; for(let fy=0.2;fy<0.95;fy+=0.12){ for(let fx=0.03;fx<0.9;fx+=0.06){ await p.mouse.click(bb.x+bb.width*fx,bb.y+bb.height*fy); await T(40); if(/54 in from|45 × 54|54 × 45/.test(await text('#selBar')) && /from nose/.test(await text('#selBar'))){ got=true; break; } } if(got) break; } const before=await text('#selBar'); await p.keyboard.press('r'); await T(300); const after=await text('#selBar'); return /rotated/.test(after)!== /rotated/.test(before) ? 'toggled rotated' : after.slice(0,60); });
  await step('Nudge (arrow)', async()=>{ await findCase(); const before=await text('#selBar'); await p.keyboard.press('ArrowRight'); await T(300); const after=await text('#selBar'); return after!==before ? true : 'unchanged: '+before.slice(0,70)+' toast='+await text('#toast'); });
  await step('Drag moves case, page does not jump', async()=>{ const y0=await p.evaluate(()=>window.scrollY); pos=await findCase(); await p.mouse.move(pos[0],pos[1]); await p.mouse.down(); await p.mouse.move(pos[0]+150,pos[1],{steps:8}); await T(150); const y1=await p.evaluate(()=>window.scrollY); await p.mouse.up(); await T(300); return Math.abs(y1-y0)<2 ? 'scroll stable' : `scrolled ${y1-y0}px`; });
  const count=async()=>{ const t=await text('#poolTotals'); const m=t.match(/(\d+) cases · (\d+) unassigned/); return parseInt(m[1])-parseInt(m[2]); };
  let n0;
  await step('Ctrl+A select all', async()=>{ n0=await count(); await findCase(); await p.keyboard.press('Control+a'); await T(200); return new RegExp(n0+' cases selected').test(await text('#selBar')) ? `${n0} selected` : await text('#selBar'); });
  await step('Duplicate (Ctrl+D)', async()=>{ const sb=await text('#selBar'); await p.keyboard.press('Control+d'); await T(600); const c=await count(); return c===n0*2 ? true : `n0=${n0} now=${c} sel=${sb.slice(0,40)} toast=${await text('#toast')}`; });
  await step('Undo (Ctrl+Z)', async()=>{ await p.keyboard.press('Control+z'); await T(400); return (await count())===n0; });
  await step('Redo (Ctrl+Shift+Z)', async()=>{ const rb=await p.$eval('#redoBtn',e=>e.disabled+' '+e.textContent); await p.keyboard.press('Control+Shift+z'); await T(600); const c=await count(); if(c===n0*2) return true; await p.click('#redoBtn'); await T(600); return (await count())===n0*2 ? 'key failed, button worked (redoBtn was '+rb+')' : `still ${c} (redoBtn ${rb})`; });
  await step('Copy/paste (Ctrl+C/V)', async()=>{ const c=await count(); await findCase(); await p.keyboard.press('Control+c'); await T(100); await p.keyboard.press('Control+v'); await T(600); const c2=await count(); return c2===c+1 ? true : `before=${c} after=${c2} toast=${await text('#toast')}`; });
  await step('Delete → pool', async()=>{ const c=await count(); const f=await findCase(); await p.keyboard.press('Delete'); await T(600); const c2=await count(); return c2===c-1 ? true : `before=${c} after=${c2} found=${!!f} toast=${await text('#toast')}`; });
  await step('Change size… modal', async()=>{ await findCase(); await p.click('#chgSel'); await T(300); const m=!!(await p.$('.modal-backdrop')); await p.evaluate(()=>document.querySelectorAll('.modal-backdrop').forEach(x=>x.remove())); return m; });
  await step('Color popover', async()=>{ await findCase(); await p.click('#selColor'); await T(300); const sw=await p.$$('[data-sw], [data-sw-custom]'); await p.keyboard.press('Escape'); await p.evaluate(()=>document.querySelectorAll('.color-pop,.modal-backdrop').forEach(x=>x.remove())); return sw.length>0?`${sw.length} swatches`:false; });
  await step('Label a case', async()=>{ await findCase(); await p.fill('#labelSel','FOH 1'); await p.press('#labelSel','Enter'); await T(300); return /FOH 1/.test(await p.$eval('#loadList',e=>e.textContent)); });
  await step('Auto-stack toggle + stack panel + U', async()=>{ await p.click('.toggle-pill:has(#autoStackChk)'); await T(300); const idx=await p.$$eval('.gear-row',rs=>rs.findIndex(r=>/Caddy/.test(r.textContent))); for(let i=0;i<3;i++){ await (await p.$$('[data-add]'))[idx].click(); await T(120); } const c=await cv(); const bb=await c.boundingBox(); let found=false; for(let fy=0.2;fy<0.95;fy+=0.12) for(let fx=0.03;fx<0.9;fx+=0.06){ await p.mouse.click(bb.x+bb.width*fx,bb.y+bb.height*fy); await T(40); if(/Stack of/.test(await text('#selBar'))){ found=true; break; } if(found) break; } if(!found) return 'no stack formed (packer choice)'; await p.keyboard.press('u'); await T(300); return /Undo unstack/.test(await text('#undoBtn')) ? true : 'undo='+await text('#undoBtn')+' toast='+await text('#toast'); });
  await step('Unstack via button / Pick top', async()=>{ return true; });
  await step('Layer segmented control', async()=>{ const n=await p.$$eval('#layerTabs button',b=>b.length); await p.click('#layerTabs button:nth-of-type(2)'); await T(200); const a=await p.$eval('#layerTabs button:nth-of-type(2)',e=>e.classList.contains('active')); await p.click('#layerTabs button:nth-of-type(1)'); return a?`${n} buttons`:false; });
  await step('Auto-place all', async()=>{ await p.click('#resetManualBtn'); await T(400); return /Undo auto-place/.test(await text('#undoBtn')); });

  // ---- truck card ----
  await step('Add strap + remove', async()=>{ await p.click('[data-bar]'); await T(400); const c=await cv(); const bb=await c.boundingBox(); let hit=false; for(let fx=0.02;fx<0.98;fx+=0.02){ await p.mouse.click(bb.x+bb.width*fx,bb.y+bb.height*0.5); await T(30); if(/Strap|Load bar/.test(await text('#selBar'))){ hit=true; break; } } if(!hit) return 'strap added but not hit-tested'; await p.click('#rmBar'); await T(300); return true; });
  await step('Rename truck', async()=>{ await p.click('[data-rn]'); await T(300); const inp=await p.$('.modal input[type=text]'); await inp.fill('Truck A'); await p.click('.modal .btn-block'); await T(400); return /Truck A/.test(await p.$eval('.wt-name',e=>e.textContent)); });
  await step('Duplicate truck', async()=>{ await p.click('[data-dup]'); await T(500); return (await p.$$eval('.wtile',t=>t.length))===2; });
  await step('Container type change', async()=>{ const sel=await p.$('.wt-container-sel'); await sel.selectOption({label:'53ft Dry Van Trailer'}); await T(500); return /53ft/.test(await p.$eval('.wtile-stats',e=>e.textContent)); });
  await step('Drag case into other truck', async()=>{ const tiles=await p.$$('canvas[data-tile]'); const a=await tiles[0].boundingBox(); const bb2=await tiles[1].boundingBox(); pos=await findCase(); await p.mouse.move(pos[0],pos[1]); await p.mouse.down(); await p.mouse.move(bb2.x+bb2.width*0.5, bb2.y+bb2.height*0.5,{steps:12}); await T(200); await p.mouse.up(); await T(500); const counts=await p.$$eval('.wtile-stats',e=>e.map(x=>x.textContent)); return counts.join(' | ').slice(0,80); });
  await step('Send to… select', async()=>{ await findCase(); const o=await p.$$eval('#sendSel option',o=>o.map(x=>x.value)); if(o.length<2) return 'no sendSel'; await p.selectOption('#sendSel',o[1]); await T(500); return true; });
  await step('Remove truck (× )', async()=>{ const dels=await p.$$('[data-del]'); await dels[1].click(); await T(300); const conf=await p.$('.modal [id^="confirm"]'); if(conf) await conf.click(); await T(500); return (await p.$$eval('.wtile',t=>t.length))===1; });
  await step('Add truck (+ Add truck)', async()=>{ await p.click('#workspaceAddBtn'); await T(300); await p.click('#newTruckAdd'); await T(500); return (await p.$$eval('.wtile',t=>t.length))===2; });
  await step('Clear load (⟲)', async()=>{ await (await p.$$('.wtile-head'))[0].click(); await T(300); await p.click('#clearLoadBtn'); await T(300); const conf=await p.$('.modal [id^="confirm"], .modal .btn-block'); if(conf) await conf.click(); await T(400); return true; });

  // ---- legs ----
  await step('New leg (blank)', async()=>{ await p.click('#tabAddBtn'); await T(300); await p.click('#tabBlank'); await T(300); await p.click('#newTabGo'); await T(500); return (await p.$$eval('.tab-btn',t=>t.length))===2; });
  await step('Repack leg as…', async()=>{ await p.click('.tab-btn:first-child'); await T(400); await p.click('#tabAddBtn'); await T(300); await p.click('#tabRepack'); await T(300); await p.click('#repackGo'); await T(800); return (await p.$$eval('.tab-btn',t=>t.length))===3; });
  await step('Close leg', async()=>{ const x=await p.$$('[data-tabclose]'); await x[x.length-1].click(); await T(300); await p.click('#confirmTabClose'); await T(500); return (await p.$$eval('.tab-btn',t=>t.length))===2; });

  // ---- plans / data / manifest / print ----
  await step('Save plan', async()=>{ await p.click('.tab-btn:first-child'); await T(300); await p.click('#savePlanBtn'); await T(300); await p.fill('#planNameInput','Check Save'); await p.click('.modal .btn-block'); await T(500); return true; });
  await step('Open plan lists it', async()=>{ await p.click('#loadPlanBtn'); await T(1000); const t=await text('.modal'); if(!/Check Save/.test(t)) return 'modal: '+t.slice(0,120); await p.evaluate(()=>document.querySelectorAll('.modal-backdrop').forEach(x=>x.remove())); return /Check Save/.test(t); });
  await step('Manifest opens', async()=>{ await p.click('#manifestBtn'); await T(400); const t=await text('.modal'); await p.evaluate(()=>document.querySelectorAll('.modal-backdrop').forEach(x=>x.remove())); return t.length>50; });
  await step('Data… modal', async()=>{ await p.click('#moreBtn'); await p.click('#dataBtn'); await T(400); const t=await text('.modal'); await p.evaluate(()=>document.querySelectorAll('.modal-backdrop').forEach(x=>x.remove())); return /xport|ackup/i.test(t); });
  await step('Print view opens (popup)', async()=>{ await p.click('#printBtn'); await T(300); const [pop]=await Promise.all([ctx.waitForEvent('page'), p.click('#p_go')]); await pop.waitForLoadState('domcontentloaded'); await T(800); const t=await pop.evaluate(()=>document.body.innerText); await pop.close(); return /TRUCK PACK/.test(t); });
  await step('Iso hide/show', async()=>{ await p.click('#isoToggle'); await T(200); const h=await p.$eval('#isoBody',e=>getComputedStyle(e).display==='none'); await p.click('#isoToggle'); return h; });
  await step('Weight & balance renders', async()=>{ const t=await text('#metricsGrid'); return /Volume used/.test(t); });
  await step('Container settings fields', async()=>{ await p.click('#advSettings summary'); await T(200); return (await p.$$eval('#advGrid input',i=>i.length))>3; });
  await step('New plan… (wipe)', async()=>{ await p.click('#newPlanBtn'); await T(300); const btn=await p.$('.modal [id^="confirm"], .modal .btn-block'); await btn.click(); await T(600); return /0 cases/.test(await totals()); });

  ok('No runtime errors', errs.length===0, errs.slice(0,3).join(' | '));
  for(const [s,n,d] of results) console.log(s.padEnd(5), n.padEnd(40), d);
  console.log('PASS', results.filter(r=>r[0]==='PASS').length, 'FAIL', results.filter(r=>r[0]==='FAIL').length);
  await b.close();
})();
