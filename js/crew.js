// ============================================
// Prodlink — 组员管理 / 酒店安排 / 预算账单
// ============================================

// ============================================
// 组员管理
// ============================================
let crewTab = 'form';

function switchCrewTab(tab) {
  crewTab = tab;
  document.querySelectorAll('#tool-crew .tab-btn').forEach((b,i) => b.classList.toggle('active', (i===0 && tab==='form') || (i===1 && tab==='table')));
  document.getElementById('crew-panel-form').classList.toggle('active', tab === 'form');
  document.getElementById('crew-panel-table').classList.toggle('active', tab === 'table');
  if (tab === 'table') renderCrewTable();
}

function addCrewMember() {
  const m = {
    name: valEl('crew-name'), gender: valEl('crew-gender') || '男',
    role: valEl('crew-role'),
    phone: valEl('crew-phone'), wechat: valEl('crew-wechat'),
    idCard: valEl('crew-idcard'), emergency: valEl('crew-emergency'),
    diet: valEl('crew-diet'), needHotel: valEl('crew-hotel') === '是',
    arriveDate: valEl('crew-arrive'), leaveDate: valEl('crew-leave')
  };
  if (!m.name) { showToast('请输入姓名'); return; }
  DataHub.addCrewMember(m);
  // 清空表单
  ['crew-name','crew-phone','crew-wechat','crew-idcard','crew-emergency','crew-arrive','crew-leave'].forEach(id => setVal(id, ''));
  showToast('已添加: ' + m.name + ' ✅');
  switchCrewTab('table');
}

function renderCrewTable() {
  const search = (valEl('crew-search') || '').toLowerCase();
  const roleFilter = valEl('crew-filter-role');
  let members = DataHub.crewMembers;
  if (search) members = members.filter(m => m.name.toLowerCase().includes(search) || (m.phone||'').includes(search));
  if (roleFilter) members = members.filter(m => m.role === roleFilter);

  document.getElementById('crew-table-tbody').innerHTML = members.map(m => `
    <tr id="crew-row-${m.id}" class="${m._editing ? 'crew-editing' : ''}">
      ${m._editing ? `
        <td><input type="text" id="ec-name-${m.id}" value="${escAttr(m.name)}" style="width:70px;"></td>
        <td><select id="ec-gender-${m.id}"><option ${m.gender==='男'?'selected':''}>男</option><option ${m.gender==='女'?'selected':''}>女</option></select></td>
        <td><select id="ec-role-${m.id}"><option>导演</option><option>制片</option><option>摄影</option><option>灯光</option><option>美术</option><option>录音</option><option>化妆</option><option>场务</option><option>演员</option><option>其他</option></select></td>
        <td><input type="text" id="ec-phone-${m.id}" value="${escAttr(m.phone||'')}" style="width:80px;"></td>
        <td><input type="text" id="ec-wechat-${m.id}" value="${escAttr(m.wechat||'')}" style="width:70px;"></td>
        <td><select id="ec-diet-${m.id}"><option ${m.diet==='无特殊'?'selected':''}>无特殊</option><option ${m.diet==='素食'?'selected':''}>素食</option><option ${m.diet==='清真'?'selected':''}>清真</option><option ${m.diet==='过敏'?'selected':''}>过敏</option></select></td>
        <td><select id="ec-hotel-${m.id}"><option ${m.needHotel?'selected':''}>是</option><option ${!m.needHotel?'selected':''}>否</option></select></td>
        <td><input type="date" id="ec-arrive-${m.id}" value="${m.arriveDate||''}" style="width:90px;"></td>
        <td><input type="date" id="ec-leave-${m.id}" value="${m.leaveDate||''}" style="width:90px;"></td>
        <td style="display:flex;gap:3px;">
          <button class="btn btn-primary btn-sm" onclick="saveCrewEdit(${m.id})" style="padding:2px 8px;font-size:0.65rem;">💾</button>
          <button class="btn btn-ghost btn-sm" onclick="cancelCrewEdit(${m.id})" style="padding:2px 8px;font-size:0.65rem;">✕</button>
        </td>
      ` : `
        <td><strong>${esc(m.name)}</strong></td><td>${m.gender||'男'}</td><td>${esc(m.role)}</td>
        <td>${esc(m.phone||'-')}</td><td>${esc(m.wechat||'-')}</td>
        <td>${esc(m.diet||'-')}</td><td>${m.needHotel?'🏨是':'否'}</td>
        <td>${m.arriveDate||'-'}</td><td>${m.leaveDate||'-'}</td>
        <td style="display:flex;gap:3px;">
          <button class="btn-icon" onclick="editCrewRow(${m.id})" title="编辑" style="color:var(--primary);">✏️</button>
          <button class="btn-icon btn-del" onclick="DataHub.removeCrewMember(${m.id});renderCrewTable();renderHotelPanel();renderBudgetPanel()">✕</button>
        </td>
      `}
    </tr>
  `).join('') || '<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text3);">暂无组员</td></tr>';

  // 同步选中职位到filter
  setTimeout(() => {
    members.filter(m => m._editing).forEach(m => {
      const sel = document.getElementById('ec-role-' + m.id);
      if (sel) sel.value = m.role;
    });
  }, 50);

  // 同步更新酒店和预算
  renderHotelPanel();
  renderBudgetPanel();
}

// ── 行内编辑 ──
function editCrewRow(id) {
  const m = DataHub.crewMembers.find(x => x.id === id);
  if (!m) return;
  m._editing = true;
  renderCrewTable();
}

function cancelCrewEdit(id) {
  const m = DataHub.crewMembers.find(x => x.id === id);
  if (!m) return;
  m._editing = false;
  renderCrewTable();
}

function saveCrewEdit(id) {
  const m = DataHub.crewMembers.find(x => x.id === id);
  if (!m) return;
  m.name     = valEl('ec-name-' + id) || m.name;
  m.gender   = valEl('ec-gender-' + id) || m.gender;
  m.role     = valEl('ec-role-' + id) || m.role;
  m.phone    = valEl('ec-phone-' + id);
  m.wechat   = valEl('ec-wechat-' + id);
  m.diet     = valEl('ec-diet-' + id) || m.diet;
  m.needHotel = valEl('ec-hotel-' + id) === '是';
  m.arriveDate = valEl('ec-arrive-' + id);
  m.leaveDate = valEl('ec-leave-' + id);
  m._editing = false;
  DataHub.save();
  renderCrewTable();
  showToast('已更新: ' + m.name);
}

function escAttr(s) { return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;'); }

function exportCrewContact() {
  const data = DataHub.exportContactSheet();
  if (!data.length) { showToast('暂无组员数据'); return; }
  const rows = data.map(d => '<tr>'+Object.values(d).map(v => '<td>'+esc(String(v||'-'))+'</td>').join('')+'</tr>').join('');
  const headers = Object.keys(data[0]).map(k => '<th>'+k+'</th>').join('');
  const win = window.open('', '_blank', 'width=900,height=600');
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>全组通联大表</title><style>body{font-family:sans-serif;padding:20px}h2{text-align:center}table{width:100%;border-collapse:collapse;font-size:.7rem}th{background:#eee;padding:5px;border:1px solid #ccc}td{padding:4px;border:1px solid #ddd}@page{size:A4 landscape;margin:8mm}</style></head><body><h2>全组通联大表</h2><table><thead><tr>'+headers+'</tr></thead><tbody>'+rows+'</tbody></table><script>window.onload=function(){window.print()}<\/script></body></html>');
  win.document.close();
}

// ============================================
// 酒店安排 v2 — 性别+日期+同组优先
// ============================================

// ── 日期工具 ──
function parseDate(d) { return d ? new Date(d + 'T00:00:00') : null; }
function datesOverlap(a1, l1, a2, l2) {
  const s1 = parseDate(a1), e1 = parseDate(l1);
  const s2 = parseDate(a2), e2 = parseDate(l2);
  if (!s1 || !e1 || !s2 || !e2) return true; // 无日期信息 → 默认可同住
  return s1 <= e2 && s2 <= e1;
}
function overlapDays(a1, l1, a2, l2) {
  const s1 = parseDate(a1), e1 = parseDate(l1);
  const s2 = parseDate(a2), e2 = parseDate(l2);
  if (!s1 || !e1 || !s2 || !e2) return 0;
  const start = new Date(Math.max(s1.getTime(), s2.getTime()));
  const end = new Date(Math.min(e1.getTime(), e2.getTime()));
  return Math.max(0, Math.ceil((end - start) / 86400000) + 1);
}

function renderHotelPanel() {
  const container = document.getElementById('hotel-content');
  const needHotel = DataHub.crewMembers.filter(m => m.needHotel);
  if (!needHotel.length) { container.innerHTML = '<div class="bd-empty"><p>暂无需要住宿的组员</p></div>'; return; }

  const rooms = DataHub.hotelRooms.length ? DataHub.hotelRooms : autoAssignRooms(needHotel);
  if (!DataHub.hotelRooms.length) DataHub.updateHotelRooms(rooms);

  const allOccupied = new Set();
  rooms.forEach(r => r.occupants.forEach(cid => allOccupied.add(String(cid))));
  const unassigned = needHotel.filter(m => !allOccupied.has(String(m.id)));

  const filledLo = rooms.filter(r => r.occupants.length === 2).length;
  const halfRooms = rooms.filter(r => r.occupants.length === 1).length;

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
      <span style="font-weight:700;font-size:0.9rem;">🏨 酒店安排 · ${needHotel.length}人需住宿 · ${rooms.length}间房 · ${filledLo}间满 · ${halfRooms}间单人</span>
      <div style="display:flex;gap:6px;">
        <button class="btn btn-primary btn-sm" onclick="autoAssignRoomsAndRefresh()">🪄 自动分配</button>
        <button class="btn btn-outline btn-sm" onclick="addHotelRoom()">+ 加房间</button>
        <button class="btn btn-ghost btn-sm" onclick="exportHotelSheet()">🖨️ 打印</button>
      </div>
    </div>

    <div class="hotel-main-layout">
      <!-- 房间列表（主体） -->
      <div class="hotel-rooms-section">
        ${rooms.map((r, ri) => {
          const occs = r.occupants.map(cid => DataHub.crewMembers.find(x => String(x.id) === String(cid))).filter(Boolean);
          return `
          <div class="hotel-room-card">
            <div class="room-header">
              <span class="room-seq">第${ri+1}间</span>
              <input type="text" class="room-num-input" value="${esc(r.room)}"
                onchange="updateRoomNumber(${ri}, this.value)" placeholder="输入房号">
              <span class="room-count">${r.occupants.length}/2人</span>
              <button class="btn-icon btn-del" onclick="removeHotelRoom(${ri})" title="删除房间">🗑</button>
            </div>
            <div class="room-occupants">
              ${occs.length === 0 ? '<span class="room-empty-hint">空房，从右侧拖人进来</span>' : ''}
              ${occs.map(o => {
                const dateStr = fmtDateRange(o.arriveDate, o.leaveDate);
                return `<div class="hotel-guest">
                  <span class="guest-main">${esc(o.name)} <em>${esc(o.role)}</em></span>
                  ${dateStr ? `<span class="guest-date">${dateStr}</span>` : ''}
                  <span class="guest-remove" onclick="removeFromRoom(${ri},${o.id})" title="移出房间">✕</span>
                </div>`;
              }).join('')}
            </div>
            ${occs.length < 2 ? `
            <div class="room-add-row">
              <select onchange="moveToRoom(${ri}, this.value)">
                <option value="">+ 添加人员</option>
                ${needHotel
                  .filter(m => !rooms.some(r2 => r2.occupants.map(String).includes(String(m.id))))
                  .map(m => `<option value="${m.id}">${esc(m.name)} (${m.gender||'?'}) ${esc(m.role)}</option>`).join('')}
              </select>
            </div>` : ''}
          </div>`;
        }).join('')}
      </div>

      <!-- 右侧待分配列表 -->
      <div class="hotel-unassigned">
        <div class="unassigned-title">📋 待分配 · ${unassigned.length}人</div>
        <div class="unassigned-list">
          ${unassigned.length === 0
            ? '<div class="unassigned-done">全部已分配 ✓</div>'
            : unassigned.map(m => `
              <div class="unassigned-guest" onclick="quickAssign(${m.id})">
                <span>${esc(m.name)} <em>${esc(m.role)}</em></span>
                <small>${fmtDateRange(m.arriveDate, m.leaveDate)||'未填日期'}</small>
              </div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

// ── 日期格式化 ──
function fmtDateRange(arrive, leave) {
  if (!arrive && !leave) return '';
  const a = arrive ? arrive.replace(/-/g, '/').replace(/^(\d{4})\/(\d)(?=\/)/, '$1/$2') : '';
  const l = leave ? leave.replace(/-/g, '/').replace(/^(\d{4})\/(\d)(?=\/)/, '$1/$2') : '';
  if (a && l) return a + ' - ' + l;
  return a || l;
}

// ── 编辑房号 ──
function updateRoomNumber(roomIdx, newNumber) {
  const rooms = [...DataHub.hotelRooms];
  if (rooms[roomIdx]) {
    rooms[roomIdx].room = newNumber.trim() || rooms[roomIdx].room;
  }
  DataHub.updateHotelRooms(rooms);
}

// ── 一键快捷分配 ──
function quickAssign(crewId) {
  const m = DataHub.crewMembers.find(x => String(x.id) === String(crewId));
  if (!m) return;
  const rooms = [...DataHub.hotelRooms];
  // 找最合适的房间
  let bestIdx = -1, bestScore = -1;
  rooms.forEach((r, ri) => {
    if (r.occupants.length >= 2) return; // 已满
    const occs = r.occupants.map(cid => DataHub.crewMembers.find(x => String(x.id) === String(cid))).filter(Boolean);
    if (occs.length === 0) { if (bestScore < 0) { bestIdx = ri; bestScore = 0; } return; }
    const o = occs[0];
    let score = 0;
    if (o.gender !== m.gender) return; // 性别不同 → 跳过
    if (o.gender === m.gender) score += 10;
    if (o.role === m.role) score += 5;
    if (datesOverlap(o.arriveDate, o.leaveDate, m.arriveDate, m.leaveDate)) {
      score += overlapDays(o.arriveDate, o.leaveDate, m.arriveDate, m.leaveDate);
    } else {
      score -= 100; // 日期无重叠 → 基本不匹配
    }
    if (score > bestScore) { bestScore = score; bestIdx = ri; }
  });
  if (bestIdx >= 0) {
    moveToRoom(bestIdx, crewId);
  } else {
    // 没有合适房间，新建一间
    rooms.push({ room: String(parseInt(rooms[rooms.length-1]?.room||'300') + 1), occupants: [parseInt(crewId)] });
    DataHub.updateHotelRooms(rooms);
    renderHotelPanel();
    showToast('已开新房');
  }
}

function removeFromRoom(roomIdx, crewId) {
  const rooms = [...DataHub.hotelRooms];
  if (rooms[roomIdx]) {
    rooms[roomIdx].occupants = rooms[roomIdx].occupants.filter(cid => String(cid) !== String(crewId));
  }
  DataHub.updateHotelRooms(rooms);
  renderHotelPanel();
  showToast('已移除');
}

// ── 智能自动分配 ──
function autoAssignRoomsAndRefresh() {
  const needHotel = DataHub.crewMembers.filter(m => m.needHotel);
  if (!needHotel.length) return;
  const rooms = autoAssignRooms(needHotel);
  DataHub.updateHotelRooms(rooms);
  renderHotelPanel();
  showToast('✅ 已按性别+日期+同组自动分配');
}

// ============================================
// autoAssignRooms — v2 智能分配算法
// ============================================
function autoAssignRooms(needHotel) {
  // 分组：先按性别分，再按日期重叠度分，同组优先
  const males = needHotel.filter(m => m.gender !== '女');
  const females = needHotel.filter(m => m.gender === '女');

  const rooms = [];
  let roomNum = 301;

  function assignGroup(group) {
    // 按日期接近程度排序
    const sorted = [...group].sort((a, b) => {
      if (a.arriveDate !== b.arriveDate) return (a.arriveDate||'').localeCompare(b.arriveDate||'');
      if (a.leaveDate !== b.leaveDate) return (a.leaveDate||'').localeCompare(b.leaveDate||'');
      return (a.role||'').localeCompare(b.role||'');
    });

    while (sorted.length > 0) {
      const person = sorted.shift(); // 取第一个人
      // 找最佳室友
      let bestIdx = -1, bestScore = -1;
      for (let i = 0; i < sorted.length; i++) {
        const other = sorted[i];
        let score = 0;
        // 同组加分最高
        if (other.role === person.role) score += 20;
        // 日期重叠加分
        if (datesOverlap(person.arriveDate, person.leaveDate, other.arriveDate, other.leaveDate)) {
          score += overlapDays(person.arriveDate, person.leaveDate, other.arriveDate, other.leaveDate);
        } else {
          score -= 50; // 日期完全不重叠则扣分（还是可能同住，但优先级低）
        }
        // 同到组日期加分
        if (person.arriveDate === other.arriveDate) score += 3;
        if (person.leaveDate === other.leaveDate) score += 3;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      }

      if (bestIdx >= 0) {
        const roommate = sorted.splice(bestIdx, 1)[0];
        rooms.push({ room: String(roomNum), occupants: [person.id, roommate.id] });
      } else {
        // 没人配 → 单人房
        rooms.push({ room: String(roomNum), occupants: [person.id] });
      }
      roomNum++;
    }
  }

  assignGroup(males);
  assignGroup(females);

  return rooms;
}

function moveToRoom(roomIdx, crewId) {
  if (!crewId) return;
  const rooms = [...DataHub.hotelRooms];
  rooms.forEach(r => { r.occupants = r.occupants.filter(cid => String(cid) !== String(crewId)); });
  // 如果房间满，自动开新房
  if (rooms[roomIdx].occupants.length >= 2) {
    const maxRoom = rooms.reduce((max, r) => Math.max(max, parseInt(r.room)||300), 300);
    rooms.push({ room: String(maxRoom + 1), occupants: [parseInt(crewId)] });
    showToast('原房间已满，已自动开新房');
  } else {
    if (!rooms[roomIdx].occupants.map(String).includes(String(crewId))) {
      rooms[roomIdx].occupants.push(parseInt(crewId));
    }
    showToast('已分配 ✅');
  }
  DataHub.updateHotelRooms(rooms);
  renderHotelPanel();
}

function addHotelRoom() {
  const rooms = [...DataHub.hotelRooms];
  const maxRoom = rooms.reduce((max, r) => Math.max(max, parseInt(r.room)||300), 300);
  rooms.push({ room: String(maxRoom + 1), occupants: [] });
  DataHub.updateHotelRooms(rooms);
  renderHotelPanel();
}

function removeHotelRoom(idx) {
  const rooms = [...DataHub.hotelRooms];
  rooms.splice(idx, 1);
  DataHub.updateHotelRooms(rooms);
  renderHotelPanel();
}

function exportHotelSheet() {
  const content = document.getElementById('hotel-content').innerHTML;
  const win = window.open('', '_blank', 'width=700,height=500');
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>酒店安排表</title><style>body{font-family:sans-serif;padding:20px}h2{text-align:center}.hotel-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.hotel-room-card{border:1px solid #ccc;border-radius:8px;padding:12px}.room-header{font-weight:700;margin-bottom:6px}.hotel-guest{display:inline-block;padding:2px 8px;background:#e8f5e9;border-radius:4px;margin:2px;font-size:.75rem}@page{size:A4;margin:10mm}@media print{body{padding:0}}</style></head><body><h2>酒店安排表</h2>'+content+'<script>window.onload=function(){window.print()}<\/script></body></html>');
  win.document.close();
}

// ============================================
// 预算账单
// ============================================
function renderBudgetPanel() {
  const container = document.getElementById('budget-content');
  const members = DataHub.crewMembers;
  if (!members.length) { container.innerHTML = '<div class="bd-empty"><p>请先在组员管理中录入组员</p></div>'; return; }

  const items = DataHub.budgetItems.length ? DataHub.budgetItems : [];
  // 自动补全新组员
  members.forEach(m => {
    if (!items.find(it => it.crewId === m.id)) {
      items.push({ crewId: m.id, name: m.name, role: m.role, salary: 0, hotelFee: 0, mealFee: 0 });
    }
  });

  const totalSalary = items.reduce((s,it) => s + (parseFloat(it.salary)||0), 0);
  const totalHotel = items.reduce((s,it) => s + (parseFloat(it.hotelFee)||0), 0);
  const totalMeal = items.reduce((s,it) => s + (parseFloat(it.mealFee)||0), 0);

  container.innerHTML = `
    <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap;">
      <div class="budget-card"><div class="budget-num">¥${totalSalary.toLocaleString()}</div><div class="budget-label">人员薪资</div></div>
      <div class="budget-card"><div class="budget-num">¥${totalHotel.toLocaleString()}</div><div class="budget-label">住宿费用</div></div>
      <div class="budget-card"><div class="budget-num">¥${totalMeal.toLocaleString()}</div><div class="budget-label">餐补费用</div></div>
      <div class="budget-card" style="background:var(--primary);color:#FFF;"><div class="budget-num" style="color:#FFF;">¥${(totalSalary+totalHotel+totalMeal).toLocaleString()}</div><div class="budget-label" style="color:rgba(255,255,255,0.8);">总预算</div></div>
    </div>
    <div class="table-wrap"><table class="cs-table"><thead><tr><th>姓名</th><th>职位</th><th>薪资/天</th><th>住宿费/天</th><th>餐补/天</th><th>小计</th></tr></thead><tbody>
    ${items.map(it => {
      const sub = (parseFloat(it.salary)||0) + (parseFloat(it.hotelFee)||0) + (parseFloat(it.mealFee)||0);
      return `<tr><td>${esc(it.name)}</td><td>${esc(it.role)}</td>
        <td><input type="number" value="${it.salary||0}" style="width:80px;" onchange="updateBudgetItem(${it.crewId},'salary',this.value)"></td>
        <td><input type="number" value="${it.hotelFee||0}" style="width:80px;" onchange="updateBudgetItem(${it.crewId},'hotelFee',this.value)"></td>
        <td><input type="number" value="${it.mealFee||0}" style="width:80px;" onchange="updateBudgetItem(${it.crewId},'mealFee',this.value)"></td>
        <td>¥${sub.toLocaleString()}</td></tr>`;
    }).join('')}
    </tbody></table></div>
  `;
}

function updateBudgetItem(crewId, field, value) {
  const items = [...DataHub.budgetItems];
  const it = items.find(i => i.crewId === crewId);
  if (it) { it[field] = parseFloat(value) || 0; DataHub.updateBudgetItems(items); renderBudgetPanel(); }
}

// --- 工具切换钩子 ---
const _origSwitchTool = switchTool;
switchTool = function(tool) {
  _origSwitchTool(tool);
  if (tool === 'crew') { switchCrewTab('form'); renderCrewTable(); }
  if (tool === 'hotel') renderHotelPanel();
  if (tool === 'budget') renderBudgetPanel();
};

// 辅助
function valEl(id) { return document.getElementById(id)?.value?.trim() || ''; }
