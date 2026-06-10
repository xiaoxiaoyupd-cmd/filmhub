// ============================================
// Prodlink 在线同步协作 — Firebase Realtime Database
// 使用前: 去 console.firebase.google.com 创建项目 → 复制配置
// ============================================

const Collab = {
  _db: null,
  _projectId: null,
  _syncing: false,
  _localChange: false, // 防回环标记

  // ━━━ Firebase 配置 ━━━
  // 如需使用自己的 Firebase: 去 console.firebase.google.com
  // 创建项目 → 项目设置 → 添加 Web 应用 → 复制配置粘贴到这里
  get firebaseConfig() {
    // 优先从 localStorage 读取用户自定义配置
    const saved = localStorage.getItem('fh_firebase_config');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    // 默认公共配置（需替换为你自己的）
    return null;
  },

  // ━━━ 初始化 Firebase ━━━
  initFirebase() {
    return new Promise((resolve, reject) => {
      if (this._db) { resolve(this._db); return; }

      const config = this.firebaseConfig;
      if (!config) {
        reject(new Error('NO_CONFIG'));
        return;
      }

      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(config);
        }
        this._db = firebase.database();
        // 匿名登录
        firebase.auth().signInAnonymously().then(() => {
          console.log('Firebase 匿名登录成功');
          resolve(this._db);
        }).catch(err => {
          // 如果 Auth 未启用，直接用数据库（无认证模式）
          console.log('匿名登录失败，尝试无认证模式', err.message);
          resolve(this._db);
        });
      } catch(e) {
        reject(e);
      }
    });
  },

  // ━━━ 检查是否可用 ━━━
  isAvailable() {
    return !!(this._db || this.firebaseConfig);
  },

  // ━━━ 创建在线项目 ━━━
  async createProject() {
    try {
      await this.initFirebase();
    } catch(e) {
      if (e.message === 'NO_CONFIG') {
        showToast('💡 需先配置 Firebase，见设置页');
        return null;
      }
      throw e;
    }

    const projectId = 'proj_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const ref = this._db.ref('projects/' + projectId);

    // 写入当前全部数据
    const data = {
      _ts: firebase.database.ServerValue.TIMESTAMP,
      _creator: 'user_' + Date.now(),
      datahub: DataHub._data,
      callsheet: getCallSheetFullData(),
      breakdown: {
        scenes: (window.AppBreakdown && AppBreakdown.scenes) ? AppBreakdown.scenes : [],
        days: (window.AppBreakdown && AppBreakdown.days) ? AppBreakdown.days : []
      }
    };

    await ref.set(data);
    this._projectId = projectId;
    // 持久化项目 ID
    localStorage.setItem('fh_project_id', projectId);
    this._startListening(projectId);
    return projectId;
  },

  // ━━━ 加入项目 ━━━
  async joinProject(projectId) {
    try {
      await this.initFirebase();
    } catch(e) {
      if (e.message === 'NO_CONFIG') {
        showToast('💡 需先配置 Firebase');
        return false;
      }
      throw e;
    }

    // 检查项目是否存在
    const ref = this._db.ref('projects/' + projectId);
    const snap = await ref.once('value');
    if (!snap.exists()) {
      showToast('❌ 项目不存在或已过期');
      return false;
    }

    const remote = snap.val();
    if (remote.datahub) {
      DataHub._data = remote.datahub;
      DataHub.save();
    }
    if (remote.breakdown && remote.breakdown.scenes) {
      window.AppBreakdown.scenes = remote.breakdown.scenes;
      window.AppBreakdown.days = remote.breakdown.days || [];
      window.AppBreakdown.confirmed = true;
    }
    if (remote.callsheet) {
      restoreCallSheetFromData(remote.callsheet);
    }

    this._projectId = projectId;
    localStorage.setItem('fh_project_id', projectId);
    this._startListening(projectId);

    // 刷新 UI
    if (window.AppBreakdown && window.AppBreakdown.scenes.length) {
      document.getElementById('bd-layout').style.display = 'block';
      document.getElementById('ai-suggest').style.display = 'flex';
      if (typeof updateSuggestCard === 'function') updateSuggestCard();
      if (typeof renderSceneTable === 'function') renderSceneTable();
      if (typeof renderSameLocationTable === 'function') renderSameLocationTable();
      if (typeof renderDayPanels === 'function') renderDayPanels();
    }
    if (typeof renderCrewTable === 'function') renderCrewTable();
    if (typeof renderHotelPanel === 'function') renderHotelPanel();
    if (typeof renderBudgetPanel === 'function') renderBudgetPanel();

    showToast('✅ 已加入项目，实时同步中');
    return true;
  },

  // ━━━ 离开项目 ━━━
  leaveProject() {
    this._stopListening();
    this._projectId = null;
    localStorage.removeItem('fh_project_id');
    showToast('已退出协作');
  },

  // ━━━ 推送本地数据到 Firebase ━━━
  async pushData() {
    if (!this._projectId || !this._db) return;
    if (this._localChange) return; // 防止回环

    try {
      const ref = this._db.ref('projects/' + this._projectId);
      await ref.update({
        _ts: firebase.database.ServerValue.TIMESTAMP,
        datahub: DataHub._data,
        callsheet: getCallSheetFullData(),
        'breakdown/scenes': (window.AppBreakdown && window.AppBreakdown.scenes) ? window.AppBreakdown.scenes : [],
        'breakdown/days': (window.AppBreakdown && window.AppBreakdown.days) ? window.AppBreakdown.days : []
      });
    } catch(e) {
      console.log('Firebase 推送失败', e);
    }
  },

  // ━━━ 开始监听远程变更 ━━━
  _startListening(projectId) {
    if (this._syncing) this._stopListening();
    this._syncing = true;

    const ref = this._db.ref('projects/' + projectId);
    this._listener = ref.on('value', (snapshot) => {
      const remote = snapshot.val();
      if (!remote) return;

      this._localChange = true;

      // 同步 DataHub
      if (remote.datahub) {
        DataHub._data = { ...DataHub._data, ...remote.datahub };
        DataHub.save();
      }

      // 同步顺场表
      if (remote.breakdown && remote.breakdown.scenes && window.AppBreakdown) {
        window.AppBreakdown.scenes = remote.breakdown.scenes;
        window.AppBreakdown.days = remote.breakdown.days || [];
        window.AppBreakdown.confirmed = true;
        if (typeof updateSuggestCard === 'function') updateSuggestCard();
        if (typeof renderSceneTable === 'function') renderSceneTable();
        if (typeof renderSameLocationTable === 'function') renderSameLocationTable();
        if (typeof renderDayPanels === 'function') renderDayPanels();
      }

      // 同步通告单
      if (remote.callsheet) {
        restoreCallSheetFromData(remote.callsheet);
        // 如果预览已显示，重新生成
        const preview = document.getElementById('cs-preview-content');
        if (preview && preview.style.display !== 'none') {
          if (typeof generateCallSheet === 'function') generateCallSheet();
        }
      }

      // 同步组员/酒店/预算
      if (typeof renderCrewTable === 'function') renderCrewTable();
      if (typeof renderHotelPanel === 'function') renderHotelPanel();
      if (typeof renderBudgetPanel === 'function') renderBudgetPanel();

      this._localChange = false;
    });
  },

  _stopListening() {
    if (this._listener && this._db && this._projectId) {
      this._db.ref('projects/' + this._projectId).off('value', this._listener);
    }
    this._listener = null;
    this._syncing = false;
  }
};

// ━━━ 获取通告单完整数据 ━━━
function getCallSheetFullData() {
  try {
    return {
      project: val('cs-project'), date: val('cs-date'), day: val('cs-day'),
      producer: val('cs-producer'), assistant: val('cs-assistant'),
      weather: val('cs-weather'), sun: val('cs-sun'),
      location: val('cs-location'), parking: val('cs-parking'),
      timeline: typeof getTimeline === 'function' ? getTimeline() : {},
      scenes: typeof getSceneData === 'function' ? getSceneData() : [],
      cast: typeof getCastData === 'function' ? getCastData() : [],
      depts: typeof getDeptData === 'function' ? getDeptData() : [],
      vehicles: typeof getVehicleData === 'function' ? getVehicleData() : [],
      notes: {
        safety: val('cs-note-safety'),
        weather: val('cs-note-weather'),
        special: val('cs-note-special')
      }
    };
  } catch(e) { return null; }
}

// ━━━ 恢复通告单数据 ━━━
function restoreCallSheetFromData(d) {
  if (!d) return;
  try {
    setVal('cs-project', d.project);
    setVal('cs-date', d.date);
    setVal('cs-day', d.day);
    setVal('cs-producer', d.producer);
    setVal('cs-assistant', d.assistant);
    setVal('cs-weather', d.weather);
    setVal('cs-sun', d.sun);
    setVal('cs-location', d.location);
    setVal('cs-parking', d.parking);
    if (d.timeline) {
      setVal('cs-t-call', d.timeline.call);
      setVal('cs-t-breakfast', d.timeline.breakfast);
      setVal('cs-t-depart', d.timeline.depart);
      setVal('cs-t-start', d.timeline.start);
      setVal('cs-t-lunch', d.timeline.lunch);
      setVal('cs-t-transfer', d.timeline.transfer);
      setVal('cs-t-wrap', d.timeline.wrap);
    }
    if (d.scenes && d.scenes.length) {
      restoreTable('cs-scene-tbody', d.scenes, r =>
        `<td><input type="text" class="cs-scene-num" value="${esc(r.num||'')}"></td>` +
        `<td><select class="cs-scene-io"><option ${r.io==='内'?'selected':''}>内</option><option ${r.io==='外'?'selected':''}>外</option><option ${r.io==='内外'?'selected':''}>内外</option></select></td>` +
        `<td><select class="cs-scene-dn"><option ${r.dn==='日'?'selected':''}>日</option><option ${r.dn==='夜'?'selected':''}>夜</option><option ${r.dn==='日夜'?'selected':''}>日夜</option></select></td>` +
        `<td><input type="text" class="cs-scene-pages" value="${esc(r.pages||'')}"></td>` +
        `<td><input type="text" class="cs-scene-desc" value="${esc(r.desc||'')}"></td>` +
        `<td><input type="text" class="cs-scene-lead" value="${esc(r.lead||'')}"></td>` +
        `<td><input type="text" class="cs-scene-extras" value="${esc(r.extras||'')}" style="width:50px;"></td>` +
        `<td><input type="text" class="cs-scene-loc" value="${esc(r.loc||'')}"></td>` +
        `<td><button class="btn-icon btn-del" onclick="removeSceneRow(this)">✕</button></td>`);
    }
    if (d.cast && d.cast.length) {
      restoreTable('cs-cast-tbody', d.cast, c =>
        `<td><input type="text" class="cast-role" value="${esc(c.role||'')}"></td>` +
        `<td><input type="text" class="cast-actor" value="${esc(c.actor||'')}"></td>` +
        `<td><input type="time" class="cast-makeup" value="${c.makeup||'05:30'}"></td>` +
        `<td><input type="time" class="cast-arrive" value="${c.arrive||'06:30'}"></td>` +
        `<td><input type="text" class="cast-scenes" value="${esc(c.scenes||'')}"></td>` +
        `<td><input type="text" class="cast-note" value="${esc(c.note||'')}"></td>` +
        `<td><button class="btn-icon btn-del" onclick="removeCastRow(this)">✕</button></td>`);
    }
    if (d.vehicles && d.vehicles.length) {
      restoreTable('cs-vehicle-tbody', d.vehicles, v =>
        `<td><input type="text" class="v-plate" value="${esc(v.plate||'')}"></td>` +
        `<td><input type="text" class="v-driver" value="${esc(v.driver||'')}"></td>` +
        `<td><input type="text" class="v-phone" value="${esc(v.phone||'')}"></td>` +
        `<td><input type="text" class="v-riders" value="${esc(v.riders||'')}"></td>` +
        `<td><button class="btn-icon btn-del" onclick="removeVehicleRow(this)">✕</button></td>`);
    }
    if (d.depts) d.depts.forEach(dd => setVal('cs-dept-' + dd.key, dd.val));
    if (d.notes) {
      setVal('cs-note-safety', d.notes.safety);
      setVal('cs-note-weather', d.notes.weather);
      setVal('cs-note-special', d.notes.special);
    }
  } catch(e) {}
}

// ━━━ DataHub.save 挂钩：本地保存时自动推 Firebase ━━━
const _origDataHubSave = DataHub.save;
DataHub.save = function() {
  _origDataHubSave.call(this);
  // 异步推送，不阻塞
  if (Collab._projectId && Collab._db && !Collab._localChange) {
    Collab.pushData();
  }
};

// ============================================
// 全局函数（HTML onclick 调用）
// ============================================

// 创建协作项目
async function createCollabProject() {
  // 先把当前表单数据也保存到 DataHub
  if (typeof saveCallSheet === 'function') saveCallSheet();
  if (typeof saveBreakdownData === 'function') saveBreakdownData();

  const projectId = await Collab.createProject();
  if (!projectId) return;

  // 显示分享信息
  const shortId = projectId.replace('proj_', '').slice(0, 12);
  showSharePanel(projectId, shortId);
  updateCollabStatus();
}

// 加入协作项目
function joinCollabProject() {
  const projectId = prompt('请输入项目 ID 或完整项目链接：');
  if (!projectId) return;

  // 从链接提取 projectId
  const id = projectId.includes('proj_') ?
    projectId.match(/proj_[a-z0-9]+/)[0] : projectId.trim();

  Collab.joinProject(id).then(success => {
    if (success) updateCollabStatus();
  });
}

// 退出协作
function leaveCollabProject() {
  if (confirm('退出协作后本地数据不会丢失。确定退出？')) {
    Collab.leaveProject();
    updateCollabStatus();
  }
}

// 更新协作状态指示器
function updateCollabStatus() {
  const el = document.getElementById('collab-status');
  if (!el) return;
  if (Collab._projectId) {
    const short = Collab._projectId.replace('proj_', '').slice(0, 8);
    el.innerHTML = '🟢 协作中 <code style="font-size:0.65rem;">' + short + '</code>';
    el.style.color = '#2BA471';
    el.style.cursor = 'pointer';
    el.title = '点击复制项目ID';
    el.onclick = () => {
      navigator.clipboard.writeText(Collab._projectId).then(() => showToast('项目ID已复制'));
    };
  } else {
    el.innerHTML = '⚪ 离线';
    el.style.color = '';
    el.style.cursor = 'default';
    el.onclick = null;
  }
}

// 分享面板
function showSharePanel(projectId, shortId) {
  const url = window.location.origin + window.location.pathname + '?project=' + projectId;
  const html = `
    <div style="text-align:left;line-height:1.8;">
      <p><b>🔗 协作链接：</b></p>
      <textarea readonly style="width:100%;height:40px;font-size:0.7rem;padding:6px;border:1px solid var(--border);border-radius:4px;resize:none;">${url}</textarea>
      <p style="margin-top:8px;"><b>🆔 项目ID：</b> <code>${shortId}</code></p>
      <p style="font-size:0.72rem;color:var(--text2);">📋 已复制到剪贴板。团队成员打开链接即可加入协作。<br>⚠️ 请勿分享给不相关的人。</p>
    </div>`;

  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:600;background:white;padding:24px;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.3);max-width:420px;width:90%;';
  el.innerHTML = html + '<button class="btn btn-primary btn-sm" style="margin-top:8px;width:100%;" onclick="this.parentElement.remove()">关闭</button>';
  document.body.appendChild(el);

  // 复制链接
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).catch(() => {});
  }
}

// Firebase 配置管理
function setFirebaseConfig() {
  const current = localStorage.getItem('fh_firebase_config') || '';
  const input = prompt(
    '请输入 Firebase 配置 JSON：\n\n' +
    '1. 前往 console.firebase.google.com\n' +
    '2. 创建项目 → 添加 Web 应用\n' +
    '3. 复制 firebaseConfig 对象粘贴到这里\n\n' +
    '格式: {"apiKey":"...","authDomain":"...",...}\n\n' +
    '留空则清空配置。',
    current
  );
  if (input === null) return; // 取消
  if (!input.trim()) {
    localStorage.removeItem('fh_firebase_config');
    showToast('Firebase 配置已清除');
    return;
  }
  try {
    const config = JSON.parse(input);
    // 验证必要字段
    if (!config.apiKey || !config.databaseURL) {
      showToast('❌ 配置不完整，至少需要 apiKey 和 databaseURL');
      return;
    }
    localStorage.setItem('fh_firebase_config', JSON.stringify(config));
    // 重置 Firebase 以便重新初始化
    Collab._db = null;
    showToast('✅ Firebase 配置已保存');
  } catch(e) {
    showToast('❌ JSON 格式错误');
  }
}

// URL 自动加入
(function() {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('project');
  if (projectId) {
    setTimeout(async () => {
      const success = await Collab.joinProject(projectId);
      if (success) {
        updateCollabStatus();
        // 切换到剧本分解页
        if (typeof switchTool === 'function') switchTool('schedule');
      }
      // 清理 URL
      if (window.history && window.history.replaceState) {
        const clean = window.location.origin + window.location.pathname;
        window.history.replaceState({}, '', clean);
      }
    }, 1000);
  }
})();
