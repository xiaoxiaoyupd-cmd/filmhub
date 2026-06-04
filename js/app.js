/* ============================================
   Prodlink — 应用逻辑
   ============================================ */

// ============================================
// 工具切换
// ============================================
let currentTool = 'callsheet';

function switchTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.sb-item[data-tool]').forEach(el => {
    el.classList.toggle('active', el.dataset.tool === tool);
  });
  document.querySelectorAll('.tool').forEach(el => el.classList.remove('active'));
  document.getElementById('tool-' + tool).classList.add('active');

  if (tool === 'schedule') loadBreakdownData();
  if (tool === 'callsheet') loadCallSheetDraft();
}

// ============================================
// 侧边栏
// ============================================
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ============================================
// Toast
// ============================================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 2000);
}

// ============================================
// 通告单 v2 — 8板块完整版
// ============================================

// --- 场次表格 ---
function addSceneRow() {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" class="cs-scene-num" placeholder="1"></td>
    <td><select class="cs-scene-io"><option>内</option><option>外</option><option>内外</option></select></td>
    <td><select class="cs-scene-dn"><option>日</option><option>夜</option><option>日夜</option></select></td>
    <td><input type="text" class="cs-scene-pages" placeholder="2页"></td>
    <td><input type="text" class="cs-scene-desc" placeholder="拍摄内容简述"></td>
    <td><input type="text" class="cs-scene-lead" placeholder="主演名"></td>
    <td><input type="text" class="cs-scene-extras" placeholder="数量" style="width:50px;"></td>
    <td><input type="text" class="cs-scene-loc" placeholder="拍摄地点"></td>
    <td><button class="btn-icon btn-del" onclick="removeSceneRow(this)" title="删除">✕</button></td>
  `;
  document.getElementById('cs-scene-tbody').appendChild(tr);
}

function removeSceneRow(btn) {
  const tbody = document.getElementById('cs-scene-tbody');
  if (tbody.querySelectorAll('tr').length <= 1) {
    tbody.querySelectorAll('input').forEach(inp => inp.value = '');
    return;
  }
  btn.closest('tr').remove();
}

function getSceneData() {
  const rows = document.querySelectorAll('#cs-scene-tbody tr');
  const data = [];
  rows.forEach(row => {
    const d = {
      num: row.querySelector('.cs-scene-num')?.value?.trim() || '',
      io: row.querySelector('.cs-scene-io')?.value || '',
      dn: row.querySelector('.cs-scene-dn')?.value || '',
      pages: row.querySelector('.cs-scene-pages')?.value?.trim() || '',
      desc: row.querySelector('.cs-scene-desc')?.value?.trim() || '',
      lead: row.querySelector('.cs-scene-lead')?.value?.trim() || '',
      extras: row.querySelector('.cs-scene-extras')?.value?.trim() || '',
      loc: row.querySelector('.cs-scene-loc')?.value?.trim() || ''
    };
    if (d.num || d.desc) data.push(d);
  });
  return data;
}

// --- 演员表格 ---
function addCastRow() {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" class="cast-role" placeholder="角色名"></td>
    <td><input type="text" class="cast-actor" placeholder="演员名"></td>
    <td><input type="time" class="cast-makeup" value="05:30"></td>
    <td><input type="time" class="cast-arrive" value="06:30"></td>
    <td><input type="text" class="cast-scenes" placeholder="场1,场3"></td>
    <td><input type="text" class="cast-note" placeholder="备注"></td>
    <td><button class="btn-icon btn-del" onclick="removeCastRow(this)" title="删除">✕</button></td>
  `;
  document.getElementById('cs-cast-tbody').appendChild(tr);
}

function removeCastRow(btn) {
  const tbody = document.getElementById('cs-cast-tbody');
  if (tbody.querySelectorAll('tr').length <= 1) {
    tbody.querySelectorAll('input').forEach(inp => inp.value = '');
    return;
  }
  btn.closest('tr').remove();
}

function getCastData() {
  const rows = document.querySelectorAll('#cs-cast-tbody tr');
  const data = [];
  rows.forEach(row => {
    const d = {
      role: row.querySelector('.cast-role')?.value?.trim() || '',
      actor: row.querySelector('.cast-actor')?.value?.trim() || '',
      makeup: row.querySelector('.cast-makeup')?.value || '',
      arrive: row.querySelector('.cast-arrive')?.value || '',
      scenes: row.querySelector('.cast-scenes')?.value?.trim() || '',
      note: row.querySelector('.cast-note')?.value?.trim() || ''
    };
    if (d.role || d.actor) data.push(d);
  });
  return data;
}

// --- 车辆表格 ---
function addVehicleRow() {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" class="v-plate" placeholder="京A12345"></td>
    <td><input type="text" class="v-driver" placeholder="司机名"></td>
    <td><input type="text" class="v-phone" placeholder="138xxxx"></td>
    <td><input type="text" class="v-riders" placeholder="张三、李四"></td>
    <td><button class="btn-icon btn-del" onclick="removeVehicleRow(this)" title="删除">✕</button></td>
  `;
  document.getElementById('cs-vehicle-tbody').appendChild(tr);
}

function removeVehicleRow(btn) {
  const tbody = document.getElementById('cs-vehicle-tbody');
  if (tbody.querySelectorAll('tr').length <= 1) {
    tbody.querySelectorAll('input').forEach(inp => inp.value = '');
    return;
  }
  btn.closest('tr').remove();
}

function getVehicleData() {
  const rows = document.querySelectorAll('#cs-vehicle-tbody tr');
  const data = [];
  rows.forEach(row => {
    const d = {
      plate: row.querySelector('.v-plate')?.value?.trim() || '',
      driver: row.querySelector('.v-driver')?.value?.trim() || '',
      phone: row.querySelector('.v-phone')?.value?.trim() || '',
      riders: row.querySelector('.v-riders')?.value?.trim() || ''
    };
    if (d.plate || d.driver) data.push(d);
  });
  return data;
}

// --- 部门工作人员 ---
function getDept(name) {
  return document.getElementById('cs-dept-' + name)?.value?.trim() || '';
}
function getDeptData() {
  return ['director','producer','camera','art','light','sound','makeup','grip']
    .map(k => ({ key: k, val: getDept(k) }))
    .filter(d => d.val);
}

// --- 时间轴 ---
function getTimeline() {
  return {
    call: document.getElementById('cs-t-call')?.value || '',
    breakfast: document.getElementById('cs-t-breakfast')?.value || '',
    depart: document.getElementById('cs-t-depart')?.value || '',
    start: document.getElementById('cs-t-start')?.value || '',
    lunch: document.getElementById('cs-t-lunch')?.value || '',
    transfer: document.getElementById('cs-t-transfer')?.value || '',
    wrap: document.getElementById('cs-t-wrap')?.value || ''
  };
}

// --- 生成预览 ---
function generateCallSheet() {
  const project = val('cs-project') || '未命名项目';
  const date = val('cs-date') || '____年__月__日';
  const day = val('cs-day') || '';
  const producer = val('cs-producer') || '';
  const assistant = val('cs-assistant') || '';
  const weather = val('cs-weather') || '';
  const sun = val('cs-sun') || '';
  const location = val('cs-location') || '';
  const parking = val('cs-parking') || '';
  const tl = getTimeline();
  const scenes = getSceneData();
  const cast = getCastData();
  const depts = getDeptData();
  const vehicles = getVehicleData();
  const noteSafety = val('cs-note-safety') || '';
  const noteWeather = val('cs-note-weather') || '';
  const noteSpecial = val('cs-note-special') || '';

  let html = `
    <h2>🎬 拍 摄 通 告 单</h2>
    <div class="cs-subtitle">${project} ${day ? '('+day+')' : ''}</div>
    <!-- 项目信息 -->
    <table>
      <tr><td class="td-label">项目名称</td><td><strong>${project}</strong></td><td class="td-label">通告日期</td><td>${date}</td></tr>
      <tr><td class="td-label">制片主任</td><td>${producer||'-'}</td><td class="td-label">副导演</td><td>${assistant||'-'}</td></tr>
      <tr><td class="td-label">天气</td><td>${weather||'-'}</td><td class="td-label">日出/日落</td><td>${sun||'-'}</td></tr>
      <tr><td class="td-label">拍摄地点</td><td colspan="3">${location||'-'}${parking ? '（'+parking+'）' : ''}</td></tr>
    </table>`;

  // 时间轴
  const tlItems = [
    ['集合', tl.call], ['早餐', tl.breakfast], ['出发', tl.depart], ['开机', tl.start],
    ['午餐', tl.lunch], ['转场', tl.transfer], ['收工', tl.wrap]
  ].filter(i => i[1]);
  if (tlItems.length) {
    html += `<div class="cs-sec-title">⏱️ 时间轴</div><table><tr>`;
    tlItems.forEach(i => { html += `<td class="td-label" style="width:auto;">${i[0]}</td><td>${i[1]}</td>`; });
    html += `</tr></table>`;
  }

  // 场次安排
  if (scenes.length) {
    html += `<div class="cs-sec-title">🎬 场次安排</div>
    <table class="cs-sub-table">
      <tr><th>场号</th><th>内外</th><th>日夜</th><th>页数</th><th>拍摄内容</th><th>主演</th><th>群演</th><th>地点</th></tr>
      ${scenes.map(s => `<tr><td>${esc(s.num)}</td><td>${s.io}</td><td>${s.dn}</td><td>${esc(s.pages)}</td><td>${esc(s.desc)}</td><td>${esc(s.lead)}</td><td>${esc(s.extras)}</td><td>${esc(s.loc)}</td></tr>`).join('')}
    </table>`;
  }

  // 演员通告
  if (cast.length) {
    html += `<div class="cs-sec-title">🎭 演员通告</div>
    <table class="cs-sub-table">
      <tr><th>角色</th><th>演员</th><th>化妆时间</th><th>到场时间</th><th>拍摄场次</th><th>备注</th></tr>
      ${cast.map(c => `<tr><td>${esc(c.role)}</td><td><strong>${esc(c.actor)}</strong></td><td>${c.makeup||'-'}</td><td>${c.arrive||'-'}</td><td>${esc(c.scenes)}</td><td>${esc(c.note)}</td></tr>`).join('')}
    </table>`;
  }

  // 工作人员
  if (depts.length) {
    html += `<div class="cs-sec-title">👥 工作人员</div><table>`;
    depts.forEach(d => {
      const names = { director:'导演组', producer:'制片组', camera:'摄影组', art:'美术组', light:'灯光组', sound:'录音组', makeup:'化妆组', grip:'场务组' };
      html += `<tr><td class="td-label">${names[d.key]||d.key}</td><td style="white-space:pre-wrap;">${esc(d.val)}</td></tr>`;
    });
    html += `</table>`;
  }

  // 车辆安排
  if (vehicles.length) {
    html += `<div class="cs-sec-title">🚗 车辆安排</div>
    <table class="cs-sub-table">
      <tr><th>车牌号</th><th>司机</th><th>联系电话</th><th>乘车人员</th></tr>
      ${vehicles.map(v => `<tr><td>${esc(v.plate)}</td><td>${esc(v.driver)}</td><td>${esc(v.phone)}</td><td>${esc(v.riders)}</td></tr>`).join('')}
    </table>`;
  }

  // 注意事项
  if (noteSafety || noteWeather || noteSpecial) {
    html += `<div class="cs-sec-title">📝 注意事项</div><table>`;
    if (noteSafety) html += `<tr><td class="td-label">安全提示</td><td style="white-space:pre-wrap;">${esc(noteSafety)}</td></tr>`;
    if (noteWeather) html += `<tr><td class="td-label">天气提示</td><td style="white-space:pre-wrap;">${esc(noteWeather)}</td></tr>`;
    if (noteSpecial) html += `<tr><td class="td-label">特殊通知</td><td style="white-space:pre-wrap;">${esc(noteSpecial)}</td></tr>`;
    html += `</table>`;
  }

  document.getElementById('cs-preview-content').innerHTML = html;
  document.getElementById('cs-preview-empty').style.display = 'none';
  document.getElementById('cs-preview-content').style.display = 'block';
  document.getElementById('cs-preview-container').scrollIntoView({ behavior: 'smooth' });
}

// --- 导出PDF ---
function exportPDF() {
  if (document.getElementById('cs-preview-content').style.display === 'none') {
    showToast('请先生成通告单'); return;
  }
  const content = document.getElementById('cs-preview-content').innerHTML;
  const win = window.open('', '_blank', 'width=800,height=900');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>拍摄通告单</title>
<style>
body{font-family:'PingFang SC','Microsoft YaHei',sans-serif;padding:20px 28px;color:#1D1D1F;max-width:700px;margin:auto;}
h2{text-align:center;font-size:1.2rem;letter-spacing:3px;margin-bottom:2px;}
.cs-subtitle{text-align:center;font-size:0.82rem;color:#6E6E73;margin-bottom:14px;}
.cs-sec-title{font-size:0.78rem;font-weight:700;margin:12px 0 5px;padding:3px 8px;background:#F5F5F7;border-left:3px solid #3370FF;}
table{width:100%;border-collapse:collapse;font-size:0.75rem;margin-bottom:6px;}
td{padding:3px 7px;border:1px solid #DDD;vertical-align:top;}
.td-label{font-weight:700;background:#FAFAFC;color:#6E6E73;}
.cs-sub-table th{font-weight:700;background:#F0F0F2;font-size:0.66rem;padding:3px 5px;border:1px solid #DDD;text-align:left;}
.cs-sub-table td{padding:3px 5px;border:1px solid #DDD;font-size:0.7rem;}
@page{size:A4;margin:12mm;}
@media print{body{padding:0;}}
</style></head><body>${content}<script>window.onload=function(){window.print();}<\/script></body></html>`);
  win.document.close();
}

// --- A4打印 ---
function exportCallSheet() {
  if (document.getElementById('cs-preview-content').style.display === 'none') {
    showToast('请先生成通告单'); return;
  }
  const content = document.getElementById('cs-preview-content').innerHTML;
  const win = window.open('', '_blank', 'width=800,height=900');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>拍摄通告单</title>
<style>
body{font-family:'PingFang SC','Microsoft YaHei',sans-serif;padding:16mm 12mm;color:#1D1D1F;max-width:190mm;margin:auto;}
h2{text-align:center;font-size:14pt;letter-spacing:3px;margin-bottom:2px;}
.cs-subtitle{text-align:center;font-size:9pt;color:#6E6E73;margin-bottom:14px;}
.cs-sec-title{font-size:8pt;font-weight:700;margin:12px 0 5px;padding:3px 8px;background:#F0F0F2;border-left:3px solid #333;}
table{width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:5px;}
td{padding:3px 6px;border:1px solid #CCC;vertical-align:top;}
.td-label{font-weight:700;background:#F8F8FA;color:#555;}
.cs-sub-table th{font-weight:700;background:#F0F0F2;font-size:6.5pt;padding:2px 4px;border:1px solid #CCC;text-align:left;}
.cs-sub-table td{padding:2px 4px;border:1px solid #CCC;font-size:7pt;}
@page{size:A4;margin:10mm;}
@media print{body{padding:0;margin:0;}}
</style></head><body>${content}<script>window.onload=function(){window.print();}<\/script></body></html>`);
  win.document.close();
}

// --- 微信分享 ---
function shareCallSheet() {
  if (document.getElementById('cs-preview-content').style.display === 'none') {
    showToast('请先生成通告单'); return;
  }
  const project = val('cs-project') || '拍摄通告单';
  const shareTitle = '📋 ' + project + ' - 拍摄通告单';
  const shareText = '来自 Prodlink 的通告单';

  // 优先使用 Web Share API（支持微信等）
  if (navigator.share) {
    navigator.share({
      title: shareTitle,
      text: shareText,
    }).catch(() => {});
  } else {
    // 降级：复制链接提示
    const url = window.location.href;
    navigator.clipboard.writeText(shareTitle + '\n' + shareText + '\n' + url).then(() => {
      showToast('已复制分享内容，可粘贴到微信 📋');
    }).catch(() => {
      showToast('请截图后分享到微信 📸');
    });
  }
}

// --- 保存/加载 ---
function saveCallSheet() {
  const data = {
    project:val('cs-project'), date:val('cs-date'), day:val('cs-day'),
    producer:val('cs-producer'), assistant:val('cs-assistant'),
    weather:val('cs-weather'), sun:val('cs-sun'),
    location:val('cs-location'), parking:val('cs-parking'),
    timeline: getTimeline(),
    scenes: getSceneData(),
    cast: getCastData(),
    depts: getDeptData(),
    vehicles: getVehicleData(),
    notes: { safety: val('cs-note-safety'), weather: val('cs-note-weather'), special: val('cs-note-special') }
  };
  localStorage.setItem('fh_callsheet_draft', JSON.stringify(data));
  showToast('草稿已保存 💾');
}

function loadCallSheetDraft() {
  try {
    const raw = localStorage.getItem('fh_callsheet_draft');
    if (!raw) return;
    const d = JSON.parse(raw);
    // 基础字段
    setVal('cs-project',d.project); setVal('cs-date',d.date); setVal('cs-day',d.day);
    setVal('cs-producer',d.producer); setVal('cs-assistant',d.assistant);
    setVal('cs-weather',d.weather); setVal('cs-sun',d.sun);
    setVal('cs-location',d.location); setVal('cs-parking',d.parking);
    // 时间轴
    if (d.timeline) {
      setVal('cs-t-call',d.timeline.call); setVal('cs-t-breakfast',d.timeline.breakfast);
      setVal('cs-t-depart',d.timeline.depart); setVal('cs-t-start',d.timeline.start);
      setVal('cs-t-lunch',d.timeline.lunch); setVal('cs-t-transfer',d.timeline.transfer);
      setVal('cs-t-wrap',d.timeline.wrap);
    }
    // 场次
    if (d.scenes && d.scenes.length) restoreTable('cs-scene-tbody', d.scenes, r => `
      <td><input type="text" class="cs-scene-num" value="${esc(r.num||'')}"></td>
      <td><select class="cs-scene-io">${opt('内',r.io)}${opt('外',r.io)}${opt('内外',r.io)}</select></td>
      <td><select class="cs-scene-dn">${opt('日',r.dn)}${opt('夜',r.dn)}${opt('日夜',r.dn)}</select></td>
      <td><input type="text" class="cs-scene-pages" value="${esc(r.pages||'')}"></td>
      <td><input type="text" class="cs-scene-desc" value="${esc(r.desc||'')}"></td>
      <td><input type="text" class="cs-scene-lead" value="${esc(r.lead||'')}"></td>
      <td><input type="text" class="cs-scene-extras" value="${esc(r.extras||'')}" style="width:50px;"></td>
      <td><input type="text" class="cs-scene-loc" value="${esc(r.loc||'')}"></td>
      <td><button class="btn-icon btn-del" onclick="removeSceneRow(this)">✕</button></td>`);
    // 演员
    if (d.cast && d.cast.length) restoreTable('cs-cast-tbody', d.cast, c => `
      <td><input type="text" class="cast-role" value="${esc(c.role||'')}"></td>
      <td><input type="text" class="cast-actor" value="${esc(c.actor||'')}"></td>
      <td><input type="time" class="cast-makeup" value="${c.makeup||'05:30'}"></td>
      <td><input type="time" class="cast-arrive" value="${c.arrive||'06:30'}"></td>
      <td><input type="text" class="cast-scenes" value="${esc(c.scenes||'')}"></td>
      <td><input type="text" class="cast-note" value="${esc(c.note||'')}"></td>
      <td><button class="btn-icon btn-del" onclick="removeCastRow(this)">✕</button></td>`);
    // 车辆
    if (d.vehicles && d.vehicles.length) restoreTable('cs-vehicle-tbody', d.vehicles, v => `
      <td><input type="text" class="v-plate" value="${esc(v.plate||'')}"></td>
      <td><input type="text" class="v-driver" value="${esc(v.driver||'')}"></td>
      <td><input type="text" class="v-phone" value="${esc(v.phone||'')}"></td>
      <td><input type="text" class="v-riders" value="${esc(v.riders||'')}"></td>
      <td><button class="btn-icon btn-del" onclick="removeVehicleRow(this)">✕</button></td>`);
    // 工作人员
    if (d.depts) d.depts.forEach(dd => setVal('cs-dept-'+dd.key, dd.val));
    // 注意事项
    if (d.notes) {
      setVal('cs-note-safety',d.notes.safety);
      setVal('cs-note-weather',d.notes.weather);
      setVal('cs-note-special',d.notes.special);
    }
  } catch(e) {}
}

// --- 辅助函数 ---
function val(id) { return document.getElementById(id)?.value || ''; }
function setVal(id, v) { const el = document.getElementById(id); if (el && v) el.value = v; }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function opt(val, cur) { return `<option value="${val}" ${val===cur?'selected':''}>${val}</option>`; }
function restoreTable(tbodyId, data, rowFn) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = data.map(r => `<tr>${rowFn(r)}</tr>`).join('');
}

// ============================================
// 剧本分解 & 顺场表
// ============================================
let AppBreakdown = { scenes: [], days: [] };

// --- 示例剧本 ---
const SAMPLE_SCRIPT = `第1场  张三的卧室  日内
阳光透过窗帘洒进来，张三躺在床上盯着天花板发呆。手机响了。
张三（接电话）：喂...
李四（电话里）：还没起？今天的会议你忘了？
张三猛地坐起来。
张三：几点了？！我马上到！

第2场  公司会议室  日内
十几个人围坐在会议桌前，气氛凝重。
王总：这个方案客户不满意，全部重做。
张三低着头不敢说话。李四在旁边悄悄推了推他。
李四（小声）：别慌，我有备份方案。

第3场  公司茶水间  日内
张三和李四在冲咖啡。
张三：多亏了你，不然我就完了。
李四：咱们是搭档嘛。
赵五走进来，看了看两人。
赵五：听说你们那个项目要延期？

第4场  张三的卧室  夜内
张三坐在电脑前加班改方案。窗外下起了雨。
手机屏幕亮起，是妈妈发来的消息："生日快乐"
张三看了一眼，眼眶微红，继续低头工作。

第5场  公司天台  日外
张三站在天台上吹风。李四上来找他。
李四：就知道你在这儿。
张三：有时候不知道这么拼是为了什么。
李四：为了有一天能不这么拼吧。
两人沉默地看着远处的城市天际线。`;

function loadSampleScript() {
  document.getElementById('script-input').value = SAMPLE_SCRIPT;
  showToast('示例剧本已加载 📋');
}

// --- AI剧本解析 ---
function analyzeScript() {
  const text = document.getElementById('script-input').value.trim();
  if (!text) { showToast('请先粘贴剧本内容 📝'); return; }

  document.getElementById('script-status').textContent = '🤖 分析中...';

  setTimeout(() => {
    const scenes = parseScript(text);
    AppBreakdown.scenes = scenes;
    AppBreakdown.days = loadStoredDays() || [];
    document.getElementById('script-status').textContent = '✅ 共识别 ' + scenes.length + ' 场';
    document.getElementById('bd-layout').style.display = 'grid';
    document.getElementById('ai-suggest').style.display = 'block';

    updateSuggestCard();
    renderSceneTable();
    renderDayPanels();
    saveBreakdownData();
  }, 300);
}

// --- 格式标准化 ---
function normalizeScript() {
  const text = document.getElementById('script-input').value.trim();
  if (!text) { showToast('请先粘贴剧本内容 📝'); return; }

  const normalized = convertToStandard(text);
  document.getElementById('script-input').value = normalized;
  document.getElementById('script-status').textContent = '✅ 已标准化为 ' + (normalized.match(/第\d+场/g)||[]).length + ' 场';
  showToast('剧本已标准化 ✅ 可以点 AI分析 了');
}

function convertToStandard(text) {
  // 先尝试检测格式
  let result = '';

  // 格式1: "第X场" 或 "第 X 场" — 已是标准格式
  if (/第\s*\d+\s*场/.test(text)) {
    // 已经基本标准，微调空格
    return text.replace(/第\s*(\d+)\s*场/g, '第$1场');
  }

  // 格式2: "场X：" "场次X：" "Scene X:"
  if (/场\s*\d+\s*[：:]/i.test(text) || /Scene\s*\d+/i.test(text)) {
    return text.replace(/(?:场次?|Scene)\s*(\d+)\s*[：:]/gi, '第$1场');
  }

  // 格式3: 数字编号 "1." "1、" "1）" "（1）" + 场景描述
  if (/(?:^|\n)\s*\d+[\.、）\)]\s*\S/.test(text)) {
    return text.replace(/(?:^|\n)\s*(\d+)[\.、）\)]\s*/g, '\n第$1场 ');
  }

  // 格式4: "第一场" "第一幕" — 中文数字
  const cnNums = { '一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,
    '十一':11,'十二':12,'十三':13,'十四':14,'十五':15,'十六':16,'十七':17,'十八':18,'十九':19,'二十':20,
    '二十一':21,'二十二':22,'二十三':23,'二十四':24,'二十五':25,'二十六':26,'二十七':27,'二十八':28,'二十九':29,'三十':30 };
  if (/第[一二三四五六七八九十]+[场幕]/.test(text)) {
    for (const [cn, num] of Object.entries(cnNums)) {
      text = text.replace(new RegExp('第'+cn+'[场幕]', 'g'), '第'+num+'场');
    }
    return text;
  }

  // 格式5: INT./EXT. DAY/NIGHT 好莱坞格式
  if (/\b(INT|EXT|INT\.\/EXT)\.?\s/i.test(text)) {
    let sceneNum = 0;
    return text.replace(/^((?:INT|EXT|INT\.\/EXT)\.?\s+.+)$/gm, (match) => {
      sceneNum++;
      const cleaned = match.replace(/^(INT|EXT|INT\.\/EXT)\.?\s*/i, '')
        .replace(/\bDAY\b/gi, '日').replace(/\bNIGHT\b/gi, '夜')
        .replace(/\bINT\b/i, '内').replace(/\bEXT\b/i, '外');
      return '第' + sceneNum + '场 ' + cleaned;
    });
  }

  // 格式6: 按空行分隔的块，每块第一行是场景头（含△▲●等标记）
  if (text.includes('△') || text.includes('▲') || text.includes('●') || text.includes('■')) {
    const blocks = text.split(/\n\s*\n/).filter(b => b.trim());
    return blocks.map((block, i) => {
      return '第' + (i+1) + '场 ' + block.trim().replace(/^[△▲●■]\s*/, '');
    }).join('\n\n');
  }

  // 格式7: 纯文本块 — 按空行分割，每块作为一场
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  if (paragraphs.length > 1) {
    return paragraphs.map((p, i) => '第' + (i+1) + '场 ' + p.trim()).join('\n\n');
  }

  // 兜底：尝试按"场景切换标记"分割
  const markers = text.split(/(?:^|\n)(?=场景|地点|时间[：:])/);
  if (markers.length > 1) {
    return markers.filter(m => m.trim()).map((m, i) => '第' + (i+1) + '场 ' + m.trim()).join('\n\n');
  }

  // 实在无法解析，返回原文
  return text;
}

function parseScript(text) {
  const scenes = [];

  // 先标准化
  text = convertToStandard(text);

  // 多种分割模式
  let parts = [];
  let useChineseFormat = false;

  // 模式A: "第X场" 中文标准
  const cnMatch = text.match(/第\s*(\d+)\s*场/g);
  if (cnMatch && cnMatch.length > 0) {
    parts = text.split(/第\s*(\d+)\s*场/);
    useChineseFormat = true;
  }

  // 模式B: 数字编号行（fallback）
  if (!useChineseFormat) {
    const numLines = text.split(/\n/).filter(l => /^\s*\d+[\.\、\s]/.test(l));
    if (numLines.length > 1) {
      // 按数字行分割
      const blocks = text.split(/\n(?=\s*\d+[\.\、\s])/);
      parts = [''];
      blocks.forEach((block, i) => {
        parts.push(String(i+1));
        parts.push(block.replace(/^\s*\d+[\.\、\s]+/, ''));
      });
    }
  }

  // 模式C: 纯按空行分割（最后兜底）
  if (parts.length < 3) {
    const paras = text.split(/\n\s*\n/).filter(p => p.trim());
    if (paras.length > 1) {
      parts = [''];
      paras.forEach((p, i) => {
        parts.push(String(i+1));
        parts.push(p.trim());
      });
    }
  }

  for (let i = 1; i < parts.length; i += 2) {
    const num = parts[i];
    const content = (parts[i+1] || '').trim();
    if (!content || content.length < 5) continue;

    const lines = content.split(/\n/).map(l => l.trim()).filter(Boolean);
    const headerLine = lines[0] || '';

    // 解析场景头
    let mainLocation = '';
    let subLocation = '';
    let io = '内';
    let dn = '日';

    // 提取内/外 + 日/夜
    const ioDnCombo = headerLine.match(/([内外])\s*([日夜])(?!景|戏)/);
    if (ioDnCombo) {
      io = ioDnCombo[1]; dn = ioDnCombo[2];
    } else {
      if (/外景|室外|户外|EXT|外拍/i.test(headerLine)) io = '外';
      if (/夜|晚|NIGHT|傍晚|凌晨/i.test(headerLine)) dn = '夜';
    }

    // 提取场景名
    let cleanedHeader = headerLine
      .replace(/[内外][日夜](?!景|戏)/g, '')
      .replace(/外景|室内|室外|INT|EXT|DAY|NIGHT/gi, '')
      .replace(/^[△▲●■▽▼○◆◇]\s*/, '')
      .trim();

    const headerWords = cleanedHeader.split(/[\s\s]+/).filter(Boolean);
    mainLocation = headerWords[0] || '未知场景';
    subLocation = headerWords[1] || '';

    // 内容分析
    const summaryLines = [];
    const characters = new Set();
    const minorChars = new Set();
    const props = new Set();

    for (let j = 1; j < Math.min(lines.length, 15); j++) {
      const line = lines[j];
      if (!line || line.length < 2) continue;

      // 对白检测（更宽松）
      const dialogMatch = line.match(/^([^\s：:（）()]{1,6})[：:]\s*(.+)/);
      const actionMatch = line.match(/^([^\s：:（）()]{1,6})[（(]([^）)]+)[）)]/);

      if (dialogMatch) {
        const charName = dialogMatch[1];
        if (!/^(第|场|场景|时间|地点|内|外|日|夜|INT|EXT|DAY|NIGHT)$/i.test(charName)) {
          characters.add(charName);
          if (summaryLines.length < 3) summaryLines.push('💬 ' + charName + '：' + dialogMatch[2].substring(0, 25));
        }
      } else if (actionMatch) {
        const charName = actionMatch[1];
        if (!/^(第|场|场景|时间|地点)$/.test(charName)) {
          characters.add(charName);
          if (summaryLines.length < 2) summaryLines.push(line.substring(0, 35));
        }
      } else if (line.length > 5 && summaryLines.length < 3) {
        // 描述性文字
        const cleanLine = line.replace(/^[△▲●■▽▼○◆◇]\s*/, '');
        if (!/^[\(（\[【]/.test(cleanLine)) {
          summaryLines.push(cleanLine.substring(0, 45));
        }
      }

      // 道具检测（扩展）
      const propPatterns = ['拿着','递给','掏出','打开','放在','取出','端起','放下','握着','背上','拖出','举起'];
      propPatterns.forEach(verb => {
        const m = line.match(new RegExp(verb + '([一-龥a-zA-Z0-9]{1,8})'));
        if (m && m[1].length < 8) props.add(m[1]);
      });
    }

    // 页数
    const charCount = content.replace(/[\s\n]/g, '').length;
    const pages = Math.max(0.5, Math.round(charCount / 200 * 2) / 2);

    // 次要角色
    const allText = content;
    const titlePattern = /(?:走进|路过|出现|进来|出去|推门|推门进来|正好|突然|这时)[^。！？\n]{2,20}(?:[A-Z一-鿿]{2,4})(?:站|说|看|笑|走|坐|拿|递|打|开|关|来到)/g;
    const foundNames = new Set();
    let m;
    while ((m = titlePattern.exec(allText)) !== null) {
      const nameMatch = m[0].match(/([一-鿿]{2,4})(?:站|说|看|笑|走|坐|拿|递|打|开|关|来到|：|:)/);
      if (nameMatch && !characters.has(nameMatch[1])) foundNames.add(nameMatch[1]);
    }
    minorChars.forEach(c => foundNames.add(c)); // 保留之前的检测结果

    // 服装检测
    const costumePattern = /穿[着上]|披[着上]|戴[着上]|身[着穿]/g;
    const foundCostumes = new Set();
    while ((m = costumePattern.exec(allText)) !== null) {
      const rest = allText.substring(m.index + m[0].length).substring(0, 15).match(/^([^，。！？\n]{1,10})/);
      if (rest) foundCostumes.add(rest[1].replace(/[了的]/, ''));
    }

    if (!summaryLines.length) summaryLines.push(content.substring(0, 45));

    scenes.push({
      id: Date.now() + parseInt(num) + Math.random() * 100,
      num: num,
      mainLocation: mainLocation,
      subLocation: subLocation,
      io: io,
      dn: dn,
      summary: summaryLines.join('；'),
      pages: pages,
      mainChars: Array.from(characters).join('、'),
      minorChars: Array.from(foundNames).join('、'),
      props: Array.from(props).join('、'),
      costumes: Array.from(foundCostumes).join('、'),
      remark: '',
      assignedDay: null
    });
  }

  return scenes;
}

// --- AI建议 ---
function updateSuggestCard() {
  const n = AppBreakdown.scenes.length;
  if (n === 0) return;
  const totalPages = AppBreakdown.scenes.reduce((s, sc) => s + sc.pages, 0);
  const perDay = Math.max(3, Math.min(8, Math.round(n / Math.max(1, Math.ceil(totalPages / 15)))));
  const estDays = Math.ceil(n / perDay);
  document.getElementById('suggest-content').innerHTML = `
    <span class="suggest-icon">🤖</span>
    <strong>AI 分析建议：</strong> 共 <b>${n}</b> 场戏，约 <b>${totalPages.toFixed(1)}</b> 页。
    建议每天拍摄 <b>${perDay}±1</b> 场，约 <b>${estDays}</b> 天可完成拍摄。
  `;
}

function autoAssignDays() {
  const n = AppBreakdown.scenes.length;
  if (n === 0) return;
  const totalPages = AppBreakdown.scenes.reduce((s, sc) => s + sc.pages, 0);
  const perDay = Math.max(3, Math.min(8, Math.round(n / Math.max(1, Math.ceil(totalPages / 15)))));

  // 按场景地点分组（同地点尽量同一天）
  const byLocation = {};
  AppBreakdown.scenes.forEach(sc => {
    const key = sc.mainLocation;
    if (!byLocation[key]) byLocation[key] = [];
    byLocation[key].push(sc);
  });

  // 分配场景到天
  const dayScenes = [];
  let currentDay = [];
  let currentCount = 0;
  let dayIndex = 1;

  AppBreakdown.scenes.forEach(sc => {
    sc.assignedDay = null;
  });

  // 简单轮询分配
  AppBreakdown.scenes.forEach((sc, i) => {
    if (currentCount >= perDay) {
      dayScenes.push({ id: dayIndex, label: '第' + dayIndex + '天', sceneIds: currentDay.map(s => s.id) });
      dayIndex++;
      currentDay = [];
      currentCount = 0;
    }
    sc.assignedDay = dayIndex;
    currentDay.push(sc);
    currentCount++;
  });

  // 最后一天
  if (currentDay.length > 0) {
    dayScenes.push({ id: dayIndex, label: '第' + dayIndex + '天', sceneIds: currentDay.map(s => s.id) });
  }

  AppBreakdown.days = dayScenes;
  renderSceneTable();
  renderDayPanels();
  saveBreakdownData();
  showToast('已自动分配 ' + AppBreakdown.days.length + ' 个拍摄日 ✅');
}

function assignToday() {
  const today = new Date().toISOString().split('T')[0];
  const dayLabel = '今日拍摄 (' + today + ')';
  const existing = AppBreakdown.days.find(d => d.date === today);
  if (existing) {
    showToast('今日已有拍摄日：' + existing.label);
    return;
  }
  const todayId = Date.now();
  const newDay = { id: todayId, label: dayLabel, date: today, sceneIds: [] };
  AppBreakdown.days.unshift(newDay);
  renderDayPanels();
  saveBreakdownData();
  showToast('已添加今日拍摄 📅，点击左侧场次加入');
}

// --- 场次表格渲染 ---
function renderSceneTable() {
  const tbody = document.getElementById('bd-scene-tbody');
  document.getElementById('scene-count').textContent = AppBreakdown.scenes.length + '场';

  tbody.innerHTML = AppBreakdown.scenes.map(sc => {
    const dayLabel = sc.assignedDay ? 'Day' + sc.assignedDay : '-';
    return `<tr class="${sc.assignedDay ? 'assigned' : ''}" onclick="toggleSceneToToday(${sc.id})" title="点击分配/取消">
      <td><span class="scene-num">${sc.num}</span></td>
      <td>${esc(sc.mainLocation)}${sc.subLocation ? ' · '+esc(sc.subLocation) : ''}</td>
      <td><span class="tag-io ${sc.io==='外'?'out':'in'}">${sc.io}</span></td>
      <td><span class="tag-dn ${sc.dn==='夜'?'night':'day'}">${sc.dn}</span></td>
      <td class="td-summary" title="${esc(sc.summary)}">${esc(sc.summary).substring(0,30)}</td>
      <td>${sc.pages}页</td>
      <td>${esc(sc.mainChars||'-')}</td>
      <td><button class="btn-icon btn-del" onclick="event.stopPropagation();removeScene(${sc.id})">✕</button></td>
    </tr>`;
  }).join('');
}

function toggleSceneToToday(sceneId) {
  if (AppBreakdown.days.length === 0) {
    assignToday();
    return;
  }
  const scene = AppBreakdown.scenes.find(s => s.id === sceneId);
  if (!scene) return;

  const todayDay = AppBreakdown.days[0]; // 第一个拍摄日 = 今天
  if (scene.assignedDay === todayDay.id) {
    // 取消分配
    scene.assignedDay = null;
    todayDay.sceneIds = todayDay.sceneIds.filter(sid => sid !== sceneId);
  } else {
    // 从旧天移除
    if (scene.assignedDay) {
      const oldDay = AppBreakdown.days.find(d => d.id === scene.assignedDay);
      if (oldDay) oldDay.sceneIds = oldDay.sceneIds.filter(sid => sid !== sceneId);
    }
    scene.assignedDay = todayDay.id;
    if (!todayDay.sceneIds.includes(sceneId)) todayDay.sceneIds.push(sceneId);
  }
  renderSceneTable();
  renderDayPanels();
  saveBreakdownData();
}

function addManualScene() {
  const scene = {
    id: Date.now(),
    num: AppBreakdown.scenes.length + 1,
    mainLocation: '新场景', subLocation: '', io: '内', dn: '日',
    summary: '手动添加', pages: 1,
    mainChars: '', minorChars: '', props: '', costumes: '', remark: '',
    assignedDay: null
  };
  AppBreakdown.scenes.push(scene);
  renderSceneTable();
  updateSuggestCard();
  saveBreakdownData();
}

function removeScene(id) {
  AppBreakdown.scenes = AppBreakdown.scenes.filter(s => s.id !== id);
  AppBreakdown.days.forEach(d => { d.sceneIds = d.sceneIds.filter(sid => sid !== id); });
  renderSceneTable();
  renderDayPanels();
  updateSuggestCard();
  saveBreakdownData();
}

// --- 拍摄日面板 ---
function renderDayPanels() {
  const container = document.getElementById('bd-days-list');
  const empty = document.getElementById('bd-days-empty');
  const actions = document.getElementById('bd-days-actions');

  if (AppBreakdown.days.length === 0) {
    container.innerHTML = '';
    container.appendChild(empty);
    empty.style.display = '';
    actions.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  actions.style.display = 'flex';

  container.innerHTML = AppBreakdown.days.map((day, di) => {
    const scenes = day.sceneIds.map(sid => AppBreakdown.scenes.find(s => s.id === sid)).filter(Boolean);
    return `<div class="day-panel">
      <div class="day-header">
        <span class="day-label">📅 ${day.label}</span>
        <span class="day-stats">${scenes.length}场 · ${scenes.reduce((s,sc) => s + sc.pages, 0).toFixed(1)}页</span>
        <button class="btn-icon btn-del" onclick="removeDay(${day.id})">✕</button>
      </div>
      <div class="day-scenes">
        ${scenes.length === 0 ? '<span class="day-empty-hint">点击左侧场次加入此日</span>' : ''}
        ${scenes.map(sc => `
          <div class="day-scene-chip" onclick="unassignScene(${sc.id}, ${day.id})" title="点击移除">
            <span class="chip-num">${sc.num}</span>
            <span class="chip-loc">${esc(sc.mainLocation)}</span>
            <span class="chip-io ${sc.io==='外'?'out':'in'}">${sc.io}${sc.dn}</span>
            <span class="chip-pages">${sc.pages}页</span>
          </div>
        `).join('')}
      </div>
    </div>`;
  }).join('');
}

function addShootingDay() {
  const dayNum = AppBreakdown.days.length + 1;
  AppBreakdown.days.push({ id: Date.now(), label: '第' + dayNum + '天', date: '', sceneIds: [] });
  renderDayPanels();
  saveBreakdownData();
}

function removeDay(dayId) {
  AppBreakdown.days = AppBreakdown.days.filter(d => d.id !== dayId);
  AppBreakdown.scenes.forEach(sc => { if (sc.assignedDay === dayId) sc.assignedDay = null; });
  renderSceneTable();
  renderDayPanels();
  saveBreakdownData();
}

function unassignScene(sceneId, dayId) {
  const scene = AppBreakdown.scenes.find(s => s.id === sceneId);
  if (scene) scene.assignedDay = null;
  const day = AppBreakdown.days.find(d => d.id === dayId);
  if (day) day.sceneIds = day.sceneIds.filter(sid => sid !== sceneId);
  renderSceneTable();
  renderDayPanels();
  saveBreakdownData();
}

// --- 导出 ---
function exportBreakdown() {
  const win = window.open('', '_blank', 'width=900,height=700');
  const rows = AppBreakdown.days.map((day, di) => {
    const scenes = day.sceneIds.map(sid => AppBreakdown.scenes.find(s => s.id === sid)).filter(Boolean);
    return scenes.map((sc, si) => `
      <tr><td>${di+1}</td><td>${day.label}</td><td>${esc(sc.num)}</td><td>${esc(sc.mainLocation)}</td>
      <td>${sc.io}</td><td>${sc.dn}</td><td>${esc(sc.summary)}</td><td>${sc.pages}页</td>
      <td>${esc(sc.mainChars)}</td><td>${esc(sc.props)}</td><td>${esc(sc.remark)}</td></tr>
    `).join('');
  }).join('');

  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>顺场表</title>
<style>
body{font-family:'PingFang SC','Microsoft YaHei',sans-serif;padding:20px 28px;color:#1D1D1F;}
h2{text-align:center;font-size:1.3rem;margin-bottom:6px;}
table{width:100%;border-collapse:collapse;font-size:0.72rem;}
th{font-weight:700;background:#F0F0F2;padding:5px 6px;border:1px solid #CCC;text-align:left;}
td{padding:4px 6px;border:1px solid #DDD;}
@page{size:A4 landscape;margin:10mm;}
@media print{body{padding:0;}}
</style></head><body>
<h2>📖 顺场表</h2>
<table><thead><tr><th>天</th><th>拍摄日</th><th>场号</th><th>主场景</th><th>内外</th><th>日夜</th><th>内容</th><th>页数</th><th>主要角色</th><th>道具</th><th>备注</th></tr></thead>
<tbody>${rows}</tbody></table>
<script>window.onload=function(){window.print();}<\/script></body></html>`);
  win.document.close();
}

// --- 存储 ---
function saveBreakdownData() {
  localStorage.setItem('fh_breakdown', JSON.stringify({
    scenes: AppBreakdown.scenes,
    days: AppBreakdown.days
  }));
}

function loadStoredDays() {
  try {
    const raw = localStorage.getItem('fh_breakdown');
    return raw ? JSON.parse(raw).days || [] : [];
  } catch(e) { return []; }
}

function loadBreakdownData() {
  try {
    const raw = localStorage.getItem('fh_breakdown');
    if (!raw) return;
    const d = JSON.parse(raw);
    AppBreakdown.scenes = d.scenes || [];
    AppBreakdown.days = d.days || [];
    if (AppBreakdown.scenes.length > 0) {
      document.getElementById('bd-layout').style.display = 'grid';
      document.getElementById('ai-suggest').style.display = 'block';
      updateSuggestCard();
      renderSceneTable();
      renderDayPanels();
    }
  } catch(e) {}
}

function saveBreakdown() {
  saveBreakdownData();
  showToast('剧本分解已保存 💾');
}

// ============================================
// 全局状态
// ============================================
const AppState = {
  schedule: []
};

// ============================================
// 初始化
// ============================================
function init() {
  loadCallSheetDraft();
  loadBreakdownData();

  // 点击侧边栏外部关闭（移动端）
  document.getElementById('app').addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
