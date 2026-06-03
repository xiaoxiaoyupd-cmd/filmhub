/* ============================================
   Proflink — 应用逻辑
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

  if (tool === 'schedule') renderScheduleTable();
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
// 通告单生成器
// ============================================

function addCastRow() {
  const div = document.createElement('div');
  div.className = 'cast-row';
  div.innerHTML = `
    <input type="text" class="cast-role" placeholder="角色">
    <input type="text" class="cast-actor" placeholder="演员名">
    <input type="text" class="cast-call" placeholder="化妆/到场时间">
    <input type="text" class="cast-scene" placeholder="拍摄场次">
    <input type="text" class="cast-remark" placeholder="备注">
    <button class="btn-icon btn-del" onclick="removeCastRow(this)" title="删除">✕</button>
  `;
  document.getElementById('cs-cast-list').appendChild(div);
}

function removeCastRow(btn) {
  const rows = document.querySelectorAll('#cs-cast-list .cast-row');
  if (rows.length <= 1) {
    // 清空第一行而不是删除
    rows[0].querySelectorAll('input').forEach(inp => inp.value = '');
    return;
  }
  btn.closest('.cast-row').remove();
}

function getCastData() {
  const rows = document.querySelectorAll('#cs-cast-list .cast-row');
  const data = [];
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const d = {
      role: inputs[0].value.trim(),
      actor: inputs[1].value.trim(),
      calltime: inputs[2].value.trim(),
      scene: inputs[3].value.trim(),
      remark: inputs[4].value.trim()
    };
    if (d.role || d.actor) data.push(d);
  });
  return data;
}

function generateCallSheet() {
  const project = document.getElementById('cs-project').value.trim() || '未命名项目';
  const date = document.getElementById('cs-date').value || '____年__月__日';
  const day = document.getElementById('cs-day').value.trim() || '';
  const calltime = document.getElementById('cs-calltime').value || '';
  const sun = document.getElementById('cs-sun').value.trim() || '';
  const weather = document.getElementById('cs-weather').value.trim() || '';
  const location = document.getElementById('cs-location').value.trim() || '';
  const parking = document.getElementById('cs-parking').value.trim() || '';
  const scenes = document.getElementById('cs-scenes').value.trim() || '';
  const crew = document.getElementById('cs-crew').value.trim() || '';
  const notes = document.getElementById('cs-notes').value.trim() || '';
  const cast = getCastData();

  const preview = document.getElementById('cs-preview-content');
  const empty = document.getElementById('cs-preview-empty');

  let castRows = '';
  if (cast.length > 0) {
    castRows = `
      <tr><td class="td-label">演员通告</td><td>
        <table style="width:100%;border:none;margin:-5px -8px;">
          <tr style="font-weight:700;font-size:0.7rem;background:#F0F0F2;">
            <td style="border:none;">角色</td><td style="border:none;">演员</td>
            <td style="border:none;">化妆/到场</td><td style="border:none;">拍摄场次</td><td style="border:none;">备注</td>
          </tr>
          ${cast.map(c => `
            <tr>
              <td style="border:none;">${c.role || '-'}</td>
              <td style="border:none;">${c.actor || '-'}</td>
              <td style="border:none;">${c.calltime || '-'}</td>
              <td style="border:none;">${c.scene || '-'}</td>
              <td style="border:none;">${c.remark || '-'}</td>
            </tr>`).join('')}
        </table>
      </td></tr>`;
  }

  preview.innerHTML = `
    <h2>🎬 拍 摄 通 告 单</h2>
    <div class="cs-subtitle">${project}</div>
    <table>
      <tr><td class="td-label">项目名称</td><td><strong>${project}</strong> ${day ? '（'+day+'）' : ''}</td></tr>
      <tr><td class="td-label">通告日期</td><td>${date}</td></tr>
      <tr><td class="td-label">集合时间</td><td><strong>${calltime}</strong></td></tr>
      ${sun ? `<tr><td class="td-label">日出/日落</td><td>${sun}</td></tr>` : ''}
      ${weather ? `<tr><td class="td-label">天气</td><td>${weather}</td></tr>` : ''}
      <tr><td class="td-label">拍摄地点</td><td>${location}</td></tr>
      ${parking ? `<tr><td class="td-label">停车/交通</td><td>${parking}</td></tr>` : ''}
      ${scenes ? `<tr><td class="td-label">拍摄场次</td><td style="white-space:pre-wrap;">${scenes}</td></tr>` : ''}
      ${castRows}
      ${crew ? `<tr><td class="td-label">工作人员</td><td style="white-space:pre-wrap;">${crew}</td></tr>` : ''}
      ${notes ? `<tr><td class="td-label">备注</td><td style="white-space:pre-wrap;">${notes}</td></tr>` : ''}
    </table>
  `;

  empty.style.display = 'none';
  preview.style.display = 'block';
  document.getElementById('cs-preview-container').scrollIntoView({ behavior: 'smooth' });
}

function exportCallSheet() {
  const preview = document.getElementById('cs-preview-content');
  if (preview.style.display === 'none') {
    showToast('请先生成通告单');
    return;
  }
  const content = document.getElementById('cs-preview').cloneNode(true);
  content.querySelector('#cs-preview-empty').style.display = 'none';
  content.querySelector('#cs-preview-content').style.display = 'block';

  const win = window.open('', '_blank', 'width=800,height=900');
  win.document.write(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>拍摄通告单</title>
    <style>
      body { font-family: 'PingFang SC','Microsoft YaHei',sans-serif; padding: 30px 40px; color: #1D1D1F; max-width: 700px; margin: auto; }
      h2 { text-align:center; font-size:1.4rem; letter-spacing:2px; }
      .cs-subtitle { text-align:center; font-size:0.9rem; color:#6E6E73; margin-bottom:20px; }
      table { width:100%; border-collapse:collapse; font-size:0.85rem; }
      td { padding:6px 10px; border:1px solid #CCC; vertical-align:top; }
      .td-label { font-weight:700; background:#F5F5F7; width:100px; color:#6E6E73; }
      @media print { body { padding: 0; } }
    </style></head><body>
    ${content.querySelector('.cs-preview-content').innerHTML}
    </body></html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

function saveCallSheet() {
  const data = {
    project: document.getElementById('cs-project').value,
    date: document.getElementById('cs-date').value,
    day: document.getElementById('cs-day').value,
    calltime: document.getElementById('cs-calltime').value,
    sun: document.getElementById('cs-sun').value,
    weather: document.getElementById('cs-weather').value,
    location: document.getElementById('cs-location').value,
    parking: document.getElementById('cs-parking').value,
    scenes: document.getElementById('cs-scenes').value,
    crew: document.getElementById('cs-crew').value,
    notes: document.getElementById('cs-notes').value,
    cast: getCastData()
  };
  localStorage.setItem('fh_callsheet_draft', JSON.stringify(data));
  showToast('草稿已保存 💾');
}

function loadCallSheetDraft() {
  try {
    const raw = localStorage.getItem('fh_callsheet_draft');
    if (!raw) return;
    const d = JSON.parse(raw);
    document.getElementById('cs-project').value = d.project || '';
    document.getElementById('cs-date').value = d.date || '';
    document.getElementById('cs-day').value = d.day || '';
    document.getElementById('cs-calltime').value = d.calltime || '07:00';
    document.getElementById('cs-sun').value = d.sun || '';
    document.getElementById('cs-weather').value = d.weather || '';
    document.getElementById('cs-location').value = d.location || '';
    document.getElementById('cs-parking').value = d.parking || '';
    document.getElementById('cs-scenes').value = d.scenes || '';
    document.getElementById('cs-crew').value = d.crew || '';
    document.getElementById('cs-notes').value = d.notes || '';

    // 恢复演员表
    if (d.cast && d.cast.length > 0) {
      const container = document.getElementById('cs-cast-list');
      container.innerHTML = '';
      d.cast.forEach(c => {
        const div = document.createElement('div');
        div.className = 'cast-row';
        div.innerHTML = `
          <input type="text" class="cast-role" placeholder="角色" value="${esc(c.role||'')}">
          <input type="text" class="cast-actor" placeholder="演员名" value="${esc(c.actor||'')}">
          <input type="text" class="cast-call" placeholder="化妆/到场时间" value="${esc(c.calltime||'')}">
          <input type="text" class="cast-scene" placeholder="拍摄场次" value="${esc(c.scene||'')}">
          <input type="text" class="cast-remark" placeholder="备注" value="${esc(c.remark||'')}">
          <button class="btn-icon btn-del" onclick="removeCastRow(this)" title="删除">✕</button>
        `;
        container.appendChild(div);
      });
    }
  } catch(e) {}
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ============================================
// 拍摄大计划
// ============================================

function addScheduleRow(date, scene, location, io, cast, remark) {
  const rows = AppState.schedule;
  rows.push({
    id: Date.now(),
    date: date || '',
    scene: scene || '',
    location: location || '',
    io: io || '内',
    cast: cast || '',
    remark: remark || ''
  });
  saveScheduleData();
  renderScheduleTable();
}

function removeScheduleRow(id) {
  AppState.schedule = AppState.schedule.filter(r => r.id !== id);
  saveScheduleData();
  renderScheduleTable();
}

function updateScheduleCell(id, field, value) {
  const row = AppState.schedule.find(r => r.id === id);
  if (row) {
    row[field] = value;
    saveScheduleData();
    renderGantt();
  }
}

function saveScheduleData() {
  localStorage.setItem('fh_schedule', JSON.stringify(AppState.schedule));
}

function loadScheduleData() {
  try {
    const raw = localStorage.getItem('fh_schedule');
    AppState.schedule = raw ? JSON.parse(raw) : [];
  } catch(e) { AppState.schedule = []; }
}

function renderScheduleTable() {
  loadScheduleData();
  const tbody = document.getElementById('sch-tbody');
  if (AppState.schedule.length === 0) {
    // 预置示例行
    AppState.schedule = [
      { id: 1, date:'2026-06-15', scene:'场1 卧室对话 / 场3 客厅争吵', location:'XX创意园区B座', io:'内', cast:'张三(男主)、李四(女主)', remark:'带反光板' },
      { id: 2, date:'2026-06-16', scene:'场5 街道追逐', location:'幸福路外景', io:'外', cast:'张三(男主)、替身', remark:'封路申请已批' },
      { id: 3, date:'2026-06-17', scene:'场2 咖啡厅 / 场7 办公室', location:'星巴克(国贸店)', io:'内', cast:'李四(女主)、王五(配角)', remark:'下午2点后可用' },
    ];
    saveScheduleData();
  }

  const colors = ['color-0','color-1','color-2','color-3','color-4','color-5','color-6'];
  tbody.innerHTML = AppState.schedule.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><input type="date" value="${r.date}" onchange="updateScheduleCell(${r.id},'date',this.value)"></td>
      <td><input type="text" value="${esc(r.scene)}" onchange="updateScheduleCell(${r.id},'scene',this.value)" placeholder="场次+内容"></td>
      <td><input type="text" value="${esc(r.location)}" onchange="updateScheduleCell(${r.id},'location',this.value)" placeholder="拍摄地点"></td>
      <td>
        <select onchange="updateScheduleCell(${r.id},'io',this.value)">
          <option value="内" ${r.io==='内'?'selected':''}>内</option>
          <option value="外" ${r.io==='外'?'selected':''}>外</option>
          <option value="内外" ${r.io==='内外'?'selected':''}>内外</option>
        </select>
      </td>
      <td><input type="text" value="${esc(r.cast)}" onchange="updateScheduleCell(${r.id},'cast',this.value)" placeholder="所需演员"></td>
      <td><input type="text" value="${esc(r.remark)}" onchange="updateScheduleCell(${r.id},'remark',this.value)" placeholder="备注"></td>
      <td><button class="btn-icon btn-del" onclick="removeScheduleRow(${r.id})" title="删除">✕</button></td>
    </tr>
  `).join('');

  renderGantt();
}

function renderGantt() {
  const container = document.getElementById('gantt-chart');
  const empty = document.getElementById('gantt-empty');

  if (AppState.schedule.length === 0) {
    container.innerHTML = '<div class="gantt-empty" id="gantt-empty"><div class="empty-icon">📊</div><p>添加场次后自动生成甘特图</p></div>';
    return;
  }

  // 计算日期范围
  const dates = AppState.schedule.map(r => r.date).filter(Boolean).sort();
  if (dates.length === 0) {
    container.innerHTML = '<div class="gantt-empty"><p>请先填写日期信息</p></div>';
    return;
  }

  const minDate = new Date(dates[0]);
  const maxDate = new Date(dates[dates.length - 1]);
  const totalDays = Math.max(1, Math.ceil((maxDate - minDate) / (1000*60*60*24)) + 1);

  const colors = ['color-0','color-1','color-2','color-3','color-4','color-5','color-6'];

  container.innerHTML = AppState.schedule.map((r, i) => {
    let left = 0, width = 100;
    if (r.date) {
      const d = new Date(r.date);
      left = Math.max(0, Math.ceil((d - minDate) / (1000*60*60*24))) / totalDays * 100;
      width = Math.max(5, 100 / totalDays);
    }
    return `
      <div class="gantt-row">
        <div class="gantt-label" title="${esc(r.scene)}">${esc(r.scene || '未命名场次')}</div>
        <div class="gantt-bar-wrap">
          <div class="gantt-bar ${colors[i % colors.length]}" style="margin-left:${left}%;width:${width}%;">
            ${r.date || ''} ${r.location ? '@'+r.location : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

function exportSchedule() {
  const win = window.open('', '_blank', 'width=900,height=700');
  const rows = AppState.schedule.map((r, i) =>
    `<tr><td>${i+1}</td><td>${r.date}</td><td>${esc(r.scene)}</td><td>${esc(r.location)}</td><td>${r.io}</td><td>${esc(r.cast)}</td><td>${esc(r.remark)}</td></tr>`
  ).join('');

  win.document.write(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>拍摄大计划</title>
    <style>
      body { font-family:'PingFang SC','Microsoft YaHei',sans-serif; padding:30px; color:#1D1D1F; }
      h2 { text-align:center; font-size:1.4rem; margin-bottom:20px; }
      table { width:100%; border-collapse:collapse; font-size:0.82rem; }
      th { padding:8px 10px; border-bottom:2px solid #333; text-align:left; font-weight:700; }
      td { padding:6px 10px; border-bottom:1px solid #CCC; }
      @media print { body { padding:0; } }
    </style></head><body>
    <h2>📊 拍摄大计划</h2>
    <table><thead><tr><th>#</th><th>日期</th><th>场景/内容</th><th>地点</th><th>内外</th><th>演员</th><th>备注</th></tr></thead>
    <tbody>${rows}</tbody></table>
    </body></html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

function saveSchedule() {
  saveScheduleData();
  showToast('大计划已保存 💾');
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
  loadScheduleData();
  loadCallSheetDraft();

  // 点击侧边栏外部关闭（移动端）
  document.getElementById('app').addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
