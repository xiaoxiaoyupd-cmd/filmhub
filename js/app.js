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
