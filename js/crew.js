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
    name: valEl('crew-name'), role: valEl('crew-role'),
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
    <tr>
      <td><strong>${esc(m.name)}</strong></td><td>${esc(m.role)}</td>
      <td>${esc(m.phone||'-')}</td><td>${esc(m.wechat||'-')}</td>
      <td>${esc(m.diet||'-')}</td><td>${m.needHotel?'🏨是':'否'}</td>
      <td>${m.arriveDate||'-'}</td><td>${m.leaveDate||'-'}</td>
      <td><button class="btn-icon btn-del" onclick="DataHub.removeCrewMember(${m.id});renderCrewTable();renderHotelPanel();renderBudgetPanel()">✕</button></td>
    </tr>
  `).join('') || '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text3);">暂无组员</td></tr>';

  // 同步更新酒店和预算
  renderHotelPanel();
  renderBudgetPanel();
}

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
// 酒店安排
// ============================================
function renderHotelPanel() {
  const container = document.getElementById('hotel-content');
  const needHotel = DataHub.crewMembers.filter(m => m.needHotel);
  if (!needHotel.length) { container.innerHTML = '<div class="bd-empty"><p>暂无需要住宿的组员</p></div>'; return; }

  const rooms = DataHub.hotelRooms.length ? DataHub.hotelRooms : autoAssignRooms(needHotel);
  DataHub.updateHotelRooms(rooms);

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <span>共 <b>${needHotel.length}</b> 人需住宿</span>
      <button class="btn btn-outline btn-sm" onclick="addHotelRoom()">+ 添加房间</button>
    </div>
    <div class="hotel-grid">${rooms.map((r,ri) => `
      <div class="hotel-room-card">
        <div class="room-header">🏨 ${r.room} <span>${r.occupants.length}人</span><button class="btn-icon btn-del" onclick="removeHotelRoom(${ri})">✕</button></div>
        <div class="room-occupants">
          ${r.occupants.map(cid => {
            const m = DataHub.crewMembers.find(x => x.id === cid);
            return m ? `<span class="hotel-guest">${esc(m.name)} <small>${esc(m.role)}</small></span>` : '';
          }).join('')}
        </div>
        <select style="width:100%;margin-top:6px;padding:4px;font-size:0.72rem;" onchange="moveToRoom(${ri}, this.value)">
          <option value="">+ 添加组员到此房间</option>
          ${needHotel.filter(m => !rooms.some(r2 => r2.occupants.includes(m.id))).map(m => '<option value="'+m.id+'">'+esc(m.name)+' ('+esc(m.role)+')</option>').join('')}
        </select>
      </div>
    `).join('')}</div>
    <button class="btn btn-outline btn-sm" style="margin-top:10px;" onclick="exportHotelSheet()">🖨️ 打印酒店安排表</button>
  `;
}

function autoAssignRooms(needHotel) {
  // 简单分配：每2人一间，按性别分（由姓名推测或随机）
  const rooms = [];
  let roomNum = 301;
  for (let i = 0; i < needHotel.length; i += 2) {
    const occ = [needHotel[i].id];
    if (needHotel[i+1]) occ.push(needHotel[i+1].id);
    rooms.push({ room: String(roomNum), occupants: occ });
    roomNum++;
  }
  return rooms;
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

function moveToRoom(roomIdx, crewId) {
  if (!crewId) return;
  const rooms = [...DataHub.hotelRooms];
  // 从其他房间移除
  rooms.forEach(r => { r.occupants = r.occupants.filter(cid => String(cid) !== String(crewId)); });
  // 添加到目标房间
  if (!rooms[roomIdx].occupants.includes(parseInt(crewId))) {
    rooms[roomIdx].occupants.push(parseInt(crewId));
  }
  DataHub.updateHotelRooms(rooms);
  renderHotelPanel();
  showToast('已分配 ✅');
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
