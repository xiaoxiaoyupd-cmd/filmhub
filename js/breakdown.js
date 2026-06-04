// ============================================
// 剧本分解 & 顺场表 v4
// ============================================
let AppBreakdown = { scenes: [], days: [], confirmed: false };
let _rawScript = '';

// --- 示例 ---
const SAMPLE_SCRIPT = `1 张三卧室 日内
阳光透过窗帘洒进来，张三躺在床上盯着天花板发呆。手机响了。
张三：喂...
李四（OS）：还没起？今天的会议你忘了？
张三猛地坐起来。

2 公司会议室 日内
十几个人围坐在会议桌前，气氛凝重。
王总：这个方案客户不满意，全部重做。
张三低着头不敢说话。李四推了推他。
李四：别慌，我有备份方案。

3 公司茶水间 日内
张三和李四在冲咖啡。
张三：多亏了你，不然我就完了。
李四：咱们是搭档嘛。
赵五走进来看了看两人。

4 张三卧室 夜内
张三坐在电脑前加班改方案。窗外下着雨。
手机屏幕亮起："生日快乐"——妈妈。
张三眼眶微红，继续低头工作。

5 张三卧室 日内
张三从床上惊醒，原来是一场梦。阳光依旧灿烂。
张三：还好是梦...

6 公司天台 日外
张三站在天台上吹风。李四上来。
李四：就知道你在这儿。
张三：有时候不知道这么拼是为了什么。
两人沉默地看着远处天际线。`;

function loadSampleScript() {
  document.getElementById('script-input').value = SAMPLE_SCRIPT;
  _rawScript = SAMPLE_SCRIPT;
  showToast('示例已加载 📋');
}

// --- 标准化 ---
function normalizeScript() {
  let text = _rawScript || document.getElementById('script-input').value.trim();
  if (!text) { showToast('请先粘贴剧本 📝'); return; }
  text = text.replace(/第\s*(\d+)\s*场\s*/g, '$1 ');
  text = text.replace(/(?:场次?|Scene)\s*(\d+)\s*[：:]\s*/gi, '$1 ');
  text = text.replace(/(?:^|\n)\s*(\d+)[\.\、）\)]\s*/g, '\n$1 ');
  const cn = {'一':'1','二':'2','三':'3','四':'4','五':'5','六':'6','七':'7','八':'8','九':'9','十':'10'};
  for (const [k,v] of Object.entries(cn)) text = text.replace(new RegExp('第'+k+'[场幕]','g'), v+' ');
  document.getElementById('script-input').value = text;
  _rawScript = text;
  const cnt = (text.match(/^\d{1,3}\s/gm)||[]).length;
  document.getElementById('script-status').textContent = cnt + ' 场';
  showToast('已标准化 ✅');
}

// --- AI分析 → 确认面板 ---
function analyzeScript() {
  _rawScript = document.getElementById('script-input').value.trim();
  if (!_rawScript) { showToast('请先粘贴剧本 📝'); return; }
  normalizeScript();
  const text = document.getElementById('script-input').value.trim();
  const scenes = parseScript(text);
  if (!scenes.length) {
    document.getElementById('script-status').textContent = '未识别到场次';
    showToast('未识别到场次，请检查格式');
    return;
  }
  AppBreakdown.scenes = scenes;
  AppBreakdown.confirmed = false;
  AppBreakdown.days = loadStoredDays() || [];
  document.getElementById('script-status').textContent = scenes.length + ' 场，请确认';
  document.getElementById('bd-layout').style.display = 'none';
  showConfirmPanel(scenes);
}

function parseScript(text) {
  const scenes = [];
  const lines = text.split(/\n/);
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const m1 = line.match(/^(\d{1,3})\s*[\.\、\s．。）\)\s]\s*(.+)/);
    const m2 = !m1 ? line.match(/^(\d{1,3})([一-鿿a-zA-Z])/) : null;
    if (m1 || m2) {
      if (cur && cur.bodyLines.length > 0) scenes.push(buildScene(cur));
      const num = m1 ? m1[1] : m2[1];
      const rest = m1 ? m1[2] : line.substring((m2[0]||'').length - 1);
      cur = { num, headerLine: rest, bodyLines: [], rawText: '' };
    } else if (cur) {
      cur.bodyLines.push(line);
    }
  }
  if (cur && cur.bodyLines.length > 0) scenes.push(buildScene(cur));
  return scenes;
}

function buildScene(sc) {
  const body = sc.bodyLines.join('\n');
  sc.rawText = (sc.headerLine + '\n' + body).trim();
  let header = sc.headerLine;
  let io = '内', dn = '日';

  // 内外日夜 — 支持两种顺序
  const m1 = header.match(/([内外])\s*([日夜])/);
  const m2 = header.match(/([日夜])\s*([内外])/);
  if (m1) { io = m1[1]; dn = m1[2]; header = header.replace(m1[0], '').trim(); }
  else if (m2) { dn = m2[1]; io = m2[2]; header = header.replace(m2[0], '').trim(); }
  const location = header.replace(/[\s　]+/g, ' ').trim() || ('场景' + sc.num);

  // 内容梗概：找第一句非对白描述
  const bodyLines = sc.bodyLines.filter(l => l.length > 3);
  let summary = '';
  for (const l of bodyLines) { if (!/：|:/.test(l) && l.length > 5) { summary = l.substring(0, 55); break; } }
  if (!summary && bodyLines.length) summary = bodyLines[0].substring(0, 55);

  // 角色
  const chars = new Set(), minors = new Set(), props = new Set();
  for (const l of bodyLines) {
    const dm = l.match(/^([^\s：:（）()\d]{1,8})[：:]/);
    if (dm && !/^(INT|EXT|DAY|NIGHT|第|场|内|外|日|夜|OS|VO)$/i.test(dm[1])) chars.add(dm[1]);
    const am = l.match(/^([^\s：:（）()\d]{1,8})[（(]/);
    if (am && am[1].length < 6) chars.add(am[1]);
    ['拿着','递给','掏出','放在','取出','端起','放下','打开'].forEach(v => {
      const pm = l.match(new RegExp(v+'([一-鿥a-zA-Z0-9]{1,8})'));
      if (pm) props.add(pm[1]);
    });
  }
  // 次要角色：描述中第三人
  const nmMatch = body.match(/(?:走进|进来|出去|推门|突然|看见)[^。！？\n]{1,15}([一-鿿]{2,4})(?:站|说|看|走|拿)/g);
  if (nmMatch) nmMatch.forEach(n => {
    const nm = n.replace(/走进|进来|出去|推门|突然|看见/g,'').match(/([一-鿿]{2,4})/);
    if (nm && !chars.has(nm[1])) minors.add(nm[1]);
  });

  // 页数
  const cc = sc.rawText.replace(/[\s\n]/g, '').length;
  const pages = Math.max(0.5, Math.round(cc / 180 * 2) / 2);

  return {
    id: Date.now() + parseInt(sc.num) + Math.random() * 100,
    num: sc.num, location, io, dn, pages,
    summary: summary || body.substring(0, 55),
    mainChars: Array.from(chars).join(' '),
    minorChars: Array.from(minors).join(' '),
    props: Array.from(props).join(' '),
    costumes: '', rawText: sc.rawText, remark: '', assignedDay: null
  };
}

// --- 确认面板 ---
function showConfirmPanel(scenes) {
  const panel = document.getElementById('confirm-panel');
  const container = document.getElementById('confirm-scenes');
  container.innerHTML = scenes.map((sc, i) => `
    <div class="confirm-scene">
      <div class="confirm-scene-header">
        <span class="confirm-num">场 ${sc.num}</span>
        <span class="confirm-loc">${esc(sc.location)}</span>
        <span class="tag-io ${sc.io==='外'?'out':'in'}">${sc.io}</span>
        <span class="tag-dn ${sc.dn==='夜'?'night':'day'}">${sc.dn}</span>
        <span class="confirm-pages">${sc.pages}页</span>
      </div>
      <div class="confirm-row">
        <label>场景</label><input value="${esc(sc.location)}" data-idx="${i}" data-field="location">
        <label>内/外</label><select data-idx="${i}" data-field="io"><option ${sc.io==='内'?'selected':''}>内</option><option ${sc.io==='外'?'selected':''}>外</option></select>
        <label>日/夜</label><select data-idx="${i}" data-field="dn"><option ${sc.dn==='日'?'selected':''}>日</option><option ${sc.dn==='夜'?'selected':''}>夜</option></select>
        <label>页数</label><input value="${sc.pages}" data-idx="${i}" data-field="pages" style="width:50px;">
      </div>
      <div class="confirm-row">
        <label>内容梗概</label><input value="${esc(sc.summary)}" data-idx="${i}" data-field="summary" style="flex:1;">
      </div>
      <div class="confirm-row">
        <label>主要角色</label><input value="${esc(sc.mainChars)}" data-idx="${i}" data-field="mainChars">
        <label>次要角色</label><input value="${esc(sc.minorChars)}" data-idx="${i}" data-field="minorChars">
      </div>
      <div class="confirm-row">
        <label>道具</label><input value="${esc(sc.props)}" data-idx="${i}" data-field="props">
        <label>备注</label><input value="${esc(sc.remark)}" data-idx="${i}" data-field="remark">
      </div>
      <details class="confirm-raw"><summary>剧本原文</summary><pre>${esc(sc.rawText)}</pre></details>
    </div>
  `).join('');
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth' });
}

function confirmAllScenes() {
  document.querySelectorAll('#confirm-scenes input, #confirm-scenes select').forEach(el => {
    const idx = parseInt(el.dataset.idx), field = el.dataset.field;
    if (!isNaN(idx) && field && AppBreakdown.scenes[idx]) {
      AppBreakdown.scenes[idx][field] = el.tagName === 'SELECT' ? el.value : el.value;
      if (field === 'pages') AppBreakdown.scenes[idx].pages = parseFloat(el.value) || 1;
    }
  });
  AppBreakdown.confirmed = true;
  document.getElementById('confirm-panel').style.display = 'none';
  document.getElementById('bd-layout').style.display = 'block';
  document.getElementById('ai-suggest').style.display = 'flex';
  updateSuggestCard(); renderSceneTable(); renderSameLocationTable(); renderDayPanels(); saveBreakdownData();
  document.getElementById('bd-layout').scrollIntoView({ behavior: 'smooth' });
  showToast('已确认 ✅ 顺场表已生成');
}

function cancelAnalysis() {
  document.getElementById('confirm-panel').style.display = 'none';
  AppBreakdown.scenes = [];
}

// --- 顺场表 ---
function renderSceneTable() {
  document.getElementById('scene-count').textContent = AppBreakdown.scenes.length + '场';
  document.getElementById('bd-scene-tbody').innerHTML = AppBreakdown.scenes.map(sc => `
    <tr onclick="toggleSceneToToday(${sc.id})" class="${sc.assignedDay ? 'assigned' : ''}">
      <td><span class="scene-num">${sc.num}</span></td>
      <td><strong>${esc(sc.location)}</strong></td>
      <td><span class="tag-io ${sc.io==='外'?'out':'in'}">${sc.io}</span></td>
      <td><span class="tag-dn ${sc.dn==='夜'?'night':'day'}">${sc.dn}</span></td>
      <td>${sc.pages}页</td>
      <td class="td-summary" title="${esc(sc.summary)}">${esc(sc.summary)}</td>
      <td>${esc(sc.mainChars||'-')}</td>
      <td>${esc(sc.minorChars||'-')}</td>
      <td>${esc(sc.props||'-')}</td>
      <td>${esc(sc.costumes||'-')}</td>
    </tr>
  `).join('');
}

// --- 同场次分析 ---
function renderSameLocationTable() {
  const groups = {};
  AppBreakdown.scenes.forEach(sc => {
    const k = sc.location;
    if (!groups[k]) groups[k] = [];
    groups[k].push(sc);
  });
  const entries = Object.entries(groups).filter(([k,v]) => v.length >= 2);
  document.getElementById('same-loc-count').textContent = entries.length + '组';
  const container = document.getElementById('same-loc-table');
  if (!entries.length) { container.innerHTML = '<div class="bd-empty"><p>无同场景场次</p></div>'; return; }
  container.innerHTML = entries.map(([loc, scenes]) => `
    <div class="loc-group">
      <div class="loc-group-header">${esc(loc)} <span>${scenes.length}场</span></div>
      <div class="loc-group-scenes">
        ${scenes.map(sc => `<span class="loc-scene-tag">场${sc.num} ${sc.io}${sc.dn} <small>${sc.pages}页 ${esc(sc.mainChars||'')}</small></span>`).join('')}
      </div>
    </div>
  `).join('');
}

// --- 拍摄日 ---
function toggleSceneToToday(sceneId) {
  if (!AppBreakdown.days.length) { assignToday(); return; }
  const sc = AppBreakdown.scenes.find(s => s.id === sceneId);
  if (!sc) return;
  const td = AppBreakdown.days[0];
  if (sc.assignedDay === td.id) { sc.assignedDay = null; td.sceneIds = td.sceneIds.filter(s => s !== sceneId); }
  else {
    if (sc.assignedDay) { const old = AppBreakdown.days.find(d => d.id === sc.assignedDay); if (old) old.sceneIds = old.sceneIds.filter(s => s !== sceneId); }
    sc.assignedDay = td.id; if (!td.sceneIds.includes(sceneId)) td.sceneIds.push(sceneId);
  }
  renderSceneTable(); renderDayPanels(); saveBreakdownData();
}

function autoAssignDays() {
  const n = AppBreakdown.scenes.length; if (!n) return;
  const tp = AppBreakdown.scenes.reduce((s, sc) => s + sc.pages, 0);
  const perDay = Math.max(3, Math.min(8, Math.round(n / Math.max(1, Math.ceil(tp / 15)))));
  AppBreakdown.scenes.forEach(sc => sc.assignedDay = null);
  let di = 1, cnt = 0;
  const days = []; let curDay = { id: Date.now(), label: '第1天', date: '', sceneIds: [] };
  AppBreakdown.scenes.forEach(sc => {
    if (cnt >= perDay) { days.push(curDay); di++; curDay = { id: Date.now()+di, label: '第'+di+'天', date: '', sceneIds: [] }; cnt = 0; }
    sc.assignedDay = curDay.id; curDay.sceneIds.push(sc.id); cnt++;
  });
  days.push(curDay);
  AppBreakdown.days = days;
  renderSceneTable(); renderDayPanels(); saveBreakdownData();
  showToast('已自动分配 ' + days.length + ' 天 ✅');
}

function assignToday() {
  const today = new Date().toISOString().split('T')[0];
  if (AppBreakdown.days.find(d => d.date === today)) { showToast('今日已有拍摄日'); return; }
  AppBreakdown.days.unshift({ id: Date.now(), label: '今日 (' + today + ')', date: today, sceneIds: [] });
  renderDayPanels(); saveBreakdownData();
}

function updateSuggestCard() {
  const n = AppBreakdown.scenes.length; if (!n) return;
  const tp = AppBreakdown.scenes.reduce((s,sc)=>s+sc.pages,0);
  const perDay = Math.max(3, Math.min(8, Math.round(n/Math.max(1,Math.ceil(tp/15)))));
  document.getElementById('suggest-content').innerHTML = '共 <b>'+n+'</b> 场 · 约 <b>'+tp.toFixed(1)+'</b> 页 · 建议 <b>'+perDay+'±1</b> 场/天 · 约 <b>'+Math.ceil(n/perDay)+'</b> 天';
}

function renderDayPanels() {
  const container = document.getElementById('bd-days-list');
  if (!AppBreakdown.days.length) {
    container.innerHTML = '<div class="bd-empty" id="bd-days-empty"><p>点击上方顺场表中场次分配到拍摄日</p></div>';
    document.getElementById('bd-days-actions').style.display = 'none'; return;
  }
  document.getElementById('bd-days-actions').style.display = 'flex';
  container.innerHTML = AppBreakdown.days.map(day => {
    const scenes = day.sceneIds.map(sid => AppBreakdown.scenes.find(s => s.id === sid)).filter(Boolean);
    return `<div class="day-panel"><div class="day-header"><span class="day-label">${day.label}</span><span class="day-stats">${scenes.length}场 ${scenes.reduce((s,sc)=>s+sc.pages,0).toFixed(1)}页</span><button class="btn-icon btn-del" onclick="removeDay(${day.id})">✕</button></div><div class="day-scenes">${scenes.length===0?'<span class="day-empty-hint">点击上方顺场表加入此日</span>':''}${scenes.map(sc => `<div class="day-scene-chip" onclick="unassignScene(${sc.id},${day.id})"><span class="chip-num">${sc.num}</span><span class="chip-loc">${esc(sc.location)}</span><span class="chip-io ${sc.io==='外'?'out':'in'}">${sc.io}${sc.dn}</span><span class="chip-pages">${sc.pages}页</span></div>`).join('')}</div></div>`;
  }).join('');
}

function addShootingDay() {
  const n = AppBreakdown.days.length+1;
  AppBreakdown.days.push({ id: Date.now(), label: '第'+n+'天', date: '', sceneIds: [] });
  renderDayPanels(); saveBreakdownData();
}
function removeDay(id) {
  AppBreakdown.days = AppBreakdown.days.filter(d => d.id !== id);
  AppBreakdown.scenes.forEach(sc => { if (sc.assignedDay === id) sc.assignedDay = null; });
  renderSceneTable(); renderDayPanels(); saveBreakdownData();
}
function unassignScene(sid, did) {
  const sc = AppBreakdown.scenes.find(s => s.id === sid); if (sc) sc.assignedDay = null;
  const day = AppBreakdown.days.find(d => d.id === did); if (day) day.sceneIds = day.sceneIds.filter(s => s !== sid);
  renderSceneTable(); renderDayPanels(); saveBreakdownData();
}

// --- 导出 ---
function exportBreakdown() {
  const win = window.open('', '_blank', 'width=1000,height=700');
  const rows = AppBreakdown.days.map((day,di) => {
    const scenes = day.sceneIds.map(sid => AppBreakdown.scenes.find(s => s.id === sid)).filter(Boolean);
    return scenes.map(sc => '<tr><td>'+ (di+1) +'</td><td>'+ day.label +'</td><td>'+ esc(sc.num) +'</td><td>'+ esc(sc.location) +'</td><td>'+ sc.io +'</td><td>'+ sc.dn +'</td><td>'+ sc.pages +'页</td><td>'+ esc(sc.summary) +'</td><td>'+ esc(sc.mainChars) +'</td><td>'+ esc(sc.props) +'</td></tr>').join('');
  }).join('');
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>顺场表</title><style>body{font-family:sans-serif;padding:20px}h2{text-align:center}table{width:100%;border-collapse:collapse;font-size:.7rem}th{background:#eee;padding:5px;border:1px solid #ccc}td{padding:4px;border:1px solid #ddd}@page{size:A4 landscape;margin:8mm}</style></head><body><h2>顺场表</h2><table><thead><tr><th>天</th><th>拍摄日</th><th>场号</th><th>场景</th><th>内/外</th><th>日/夜</th><th>页数</th><th>内容</th><th>角色</th><th>道具</th></tr></thead><tbody>'+rows+'</tbody></table><script>window.onload=function(){window.print()}<\/script></body></html>');
  win.document.close();
}

// --- 存储 ---
function saveBreakdownData() { localStorage.setItem('fh_breakdown', JSON.stringify({ scenes: AppBreakdown.scenes, days: AppBreakdown.days })); }
function loadStoredDays() { try { const d = JSON.parse(localStorage.getItem('fh_breakdown')); return d ? (d.days || []) : []; } catch(e) { return []; } }
function loadBreakdownData() {
  try {
    const d = JSON.parse(localStorage.getItem('fh_breakdown'));
    if (!d || !d.scenes) return;
    AppBreakdown.scenes = d.scenes; AppBreakdown.days = d.days || []; AppBreakdown.confirmed = true;
    document.getElementById('bd-layout').style.display = 'block'; document.getElementById('ai-suggest').style.display = 'flex';
    updateSuggestCard(); renderSceneTable(); renderSameLocationTable(); renderDayPanels();
  } catch(e) {}
}
function saveBreakdown() { saveBreakdownData(); showToast('已保存 💾'); }

// ============================================
// LINK小助手
// ============================================
let assistantMsgs = [];

function openAssistant() {
  document.getElementById('assistant-overlay').style.display = 'flex';
  if (!assistantMsgs.length) initAssistant();
  renderAssistantMsgs();
  setTimeout(() => document.getElementById('as-input').focus(), 200);
}

function closeAssistant() { document.getElementById('assistant-overlay').style.display = 'none'; }

function initAssistant() {
  assistantMsgs = [];
  const sc = AppBreakdown.scenes;
  if (!sc.length) return;

  // 汇总信息
  const allChars = new Set(); const allProps = new Set(); const allLocs = new Set();
  sc.forEach(s => {
    (s.mainChars||'').split(/[\s、,]+/).filter(Boolean).forEach(c => allChars.add(c));
    (s.props||'').split(/[\s、,]+/).filter(Boolean).forEach(p => allProps.add(p));
    allLocs.add(s.location);
  });

  addAsMsg('assistant', `你好！我是 <b>LINK小助手</b> 🤖

我已经分析了你的剧本，共识别 <b>${sc.length}</b> 场戏：
${sc.map(s => `· 场${s.num} — ${s.location} | ${s.io}${s.dn} | ${s.pages}页 | 角色:${s.mainChars||'无'}`).join('<br>')}

📋 <b>汇总：</b>
· 主要角色：${Array.from(allChars).join('、') || '未检测到'}
· 道具清单：${Array.from(allProps).join('、') || '未检测到'}
· 场景地点：${Array.from(allLocs).join('、')}

你可以用自然语言让我修改，例如：
· "第3场改成夜外"
· "第1场加角色赵六"
· "所有张三改成张总"
· "确认无误" 生成顺场表`);
}

function addAsMsg(role, text) {
  assistantMsgs.push({ role, text, time: Date.now() });
}

function renderAssistantMsgs() {
  const container = document.getElementById('as-messages');
  container.innerHTML = assistantMsgs.map(m =>
    `<div class="as-msg ${m.role}"><div class="as-bubble">${m.text}</div></div>`
  ).join('');
  container.scrollTop = container.scrollHeight;
}

function sendAssistantMsg() {
  const input = document.getElementById('as-input');
  const cmd = input.value.trim();
  if (!cmd) return;
  addAsMsg('user', cmd);
  input.value = '';
  processAssistantCmd(cmd);
  renderAssistantMsgs();
}

function quickCmd(cmd) {
  addAsMsg('user', cmd);
  processAssistantCmd(cmd);
  renderAssistantMsgs();
}

function processAssistantCmd(cmd) {
  const sc = AppBreakdown.scenes;

  // 确认
  if (/^(确认|没问题|好了|OK|ok|可以|行)$/.test(cmd) || cmd.includes('确认无误') || cmd.includes('没问题')) {
    AppBreakdown.confirmed = true;
    document.getElementById('confirm-panel').style.display = 'none';
    document.getElementById('bd-layout').style.display = 'block';
    document.getElementById('ai-suggest').style.display = 'flex';
    document.getElementById('assistant-bar').style.display = 'none';
    updateSuggestCard(); renderSceneTable(); renderSameLocationTable(); renderDayPanels(); saveBreakdownData();
    closeAssistant();
    addAsMsg('assistant', '✅ 已确认！顺场表和同场次分析表已生成。<br>你可以在下方分配拍摄日，或随时再打开小助手修改。');
    return;
  }

  // 重新分析
  if (cmd.includes('重新分析')) {
    assistantMsgs = [];
    closeAssistant();
    analyzeScript();
    return;
  }

  // 列出角色
  if (cmd.includes('角色')) {
    const all = new Set();
    sc.forEach(s => (s.mainChars||'').split(/[\s、,]+/).filter(Boolean).forEach(c => all.add(c)));
    addAsMsg('assistant', '👥 <b>全部角色：</b>' + (Array.from(all).join('、') || '未检测到'));
    return;
  }

  // 列出道具
  if (cmd.includes('道具')) {
    const all = new Set();
    sc.forEach(s => (s.props||'').split(/[\s、,]+/).filter(Boolean).forEach(p => all.add(p)));
    addAsMsg('assistant', '🎒 <b>全部道具：</b>' + (Array.from(all).join('、') || '未检测到'));
    return;
  }

  // "第X场 改成/改为 XXX"
  const changeMatch = cmd.match(/第\s*(\d+)\s*场?\s*[改换变]\s*(?:成|为)?\s*(.+)/);
  if (changeMatch) {
    const num = changeMatch[1];
    const rest = changeMatch[2];
    const scene = sc.find(s => s.num === num);
    if (!scene) { addAsMsg('assistant', '❌ 没找到场' + num); return; }

    // 尝试匹配各种属性
    if (rest.includes('夜')) { scene.dn = '夜'; addAsMsg('assistant', '✅ 场' + num + ' 已改为夜戏'); }
    if (rest.includes('日')) { scene.dn = '日'; }
    if (rest.includes('外')) { scene.io = '外'; addAsMsg('assistant', '✅ 场' + num + ' 已改为外景'); }
    if (rest.includes('内')) { scene.io = '内'; }

    const locMatch = rest.match(/(?:场景|地点|位置)?[改换变为]?\s*"?([一-鿿a-zA-Z0-9\s]{2,10})"?\s*(?:$|[内外国日夜])/);
    if (locMatch) { scene.location = locMatch[1].trim(); addAsMsg('assistant', '✅ 场' + num + ' 场景已更新'); }

    const charMatch = rest.match(/角色[加增添]\s*([^\s，。]+)/);
    if (charMatch) {
      scene.mainChars = scene.mainChars ? scene.mainChars + ' ' + charMatch[1] : charMatch[1];
      addAsMsg('assistant', '✅ 场' + num + ' 已添加角色：' + charMatch[1]);
    }

    const propMatch = rest.match(/道具[加增添]\s*([^\s，。]+)/);
    if (propMatch) {
      scene.props = scene.props ? scene.props + ' ' + propMatch[1] : propMatch[1];
      addAsMsg('assistant', '✅ 场' + num + ' 已添加道具：' + propMatch[1]);
    }

    saveBreakdownData();
    return;
  }

  // "所有 XXX 改成 YYY"
  const allChangeMatch = cmd.match(/所有\s*"?([^\s"]+)"?\s*[改换变]\s*(?:成|为)?\s*"?([^\s"]+)"?/);
  if (allChangeMatch) {
    const from = allChangeMatch[1], to = allChangeMatch[2];
    let cnt = 0;
    sc.forEach(s => {
      if (s.mainChars && s.mainChars.includes(from)) { s.mainChars = s.mainChars.replace(new RegExp(from, 'g'), to); cnt++; }
      if (s.location && s.location.includes(from)) { s.location = s.location.replace(new RegExp(from, 'g'), to); cnt++; }
      if (s.summary && s.summary.includes(from)) { s.summary = s.summary.replace(new RegExp(from, 'g'), to); cnt++; }
    });
    saveBreakdownData();
    addAsMsg('assistant', '✅ 已将 ' + cnt + ' 处 "' + from + '" 改为 "' + to + '"');
    return;
  }

  // "加角色 XXX"
  const addCharMatch = cmd.match(/[加增添]\s*角色\s*([^\s，。]+)/);
  if (addCharMatch) {
    sc.forEach(s => { s.mainChars = s.mainChars ? s.mainChars + ' ' + addCharMatch[1] : addCharMatch[1]; });
    saveBreakdownData();
    addAsMsg('assistant', '✅ 已为所有场次添加角色：' + addCharMatch[1]);
    return;
  }

  // "加道具 XXX"
  const addPropMatch = cmd.match(/[加增添]\s*道具\s*([^\s，。]+)/);
  if (addPropMatch) {
    sc.forEach(s => { s.props = s.props ? s.props + ' ' + addPropMatch[1] : addPropMatch[1]; });
    saveBreakdownData();
    addAsMsg('assistant', '✅ 已为所有场次添加道具：' + addPropMatch[1]);
    return;
  }

  // 看不懂
  addAsMsg('assistant', '抱歉，我没理解你的意思 😅<br>试试这样说：<br>· "第3场改成夜外"<br>· "第1场加角色赵六"<br>· "所有张三改成张总"<br>· "加道具手机"<br>· "确认无误"');
}

// ============================================
// 手动天数
// ============================================
function onPlanDaysChange() {
  const days = parseInt(document.getElementById('plan-days').value);
  if (!days || days < 1) { updateSuggestCard(); return; }
  const n = AppBreakdown.scenes.length;
  const tp = AppBreakdown.scenes.reduce((s,sc) => s + sc.pages, 0);
  const perDay = Math.round((n / days) * 10) / 10;
  document.getElementById('suggest-content').innerHTML =
    '共 <b>' + n + '</b> 场 · <b>' + tp.toFixed(1) + '</b> 页 · 计划 <b>' + days + '</b> 天 · 建议 <b>' + perDay + '</b> 场/天';
}

// override updateSuggestCard to show days input
const _origUpdateSuggest = updateSuggestCard;
updateSuggestCard = function() {
  _origUpdateSuggest();
  document.getElementById('assistant-bar').style.display = 'block';
  document.getElementById('plan-days').value = '';
};
