// ============================================
// Prodlink 多人协作 — 方案A: URL分享 + 方案B: Firebase结构
// ============================================

const Collab = {
  // ━━━ 方案A: URL分享 ━━━

  // 打包项目数据 → 压缩 → URL
  packProject() {
    const data = {
      v: 1,
      scenePool: DataHub.scenePool,
      charPool: DataHub.charPool,
      propPool: DataHub.propPool,
      shootingDays: DataHub.shootingDays,
      crewMembers: DataHub.crewMembers,
      hotelRooms: DataHub.hotelRooms,
      budgetItems: DataHub.budgetItems
    };
    const json = JSON.stringify(data);
    return LZString.compressToEncodedURIComponent(json);
  },

  // URL → 解压 → 项目数据
  unpackProject(compressed) {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) throw new Error('无法解压数据');
    const data = JSON.parse(json);
    if (!data.v) throw new Error('数据格式不兼容');
    return data;
  },

  // 生成分享链接
  generateShareURL() {
    const packed = this.packProject();
    const base = window.location.origin + window.location.pathname;
    return base + '?share=' + packed;
  },

  // 生成短ID（用于手动输入）
  generateProjectID() {
    const packed = this.packProject();
    // 取压缩串的前16字符作为项目ID
    return packed.substring(0, 16);
  },

  // 从URL自动检测并导入
  autoImportFromURL() {
    const params = new URLSearchParams(window.location.search);
    const share = params.get('share');
    const id = params.get('id');

    if (share) {
      try {
        const data = this.unpackProject(share);
        this.importData(data, 'readonly');
        return true;
      } catch(e) {
        console.log('URL导入失败', e);
      }
    }
    if (id) {
      // 短ID模式 — 从本地缓存查找（方案B会用到）
      const cached = localStorage.getItem('fh_shared_' + id);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          this.importData(data, 'edit');
          return true;
        } catch(e) {}
      }
    }
    return false;
  },

  // 导入数据
  importData(data, mode) {
    if (data.scenePool) {
      DataHub._data.scenePool = data.scenePool;
      DataHub._data.charPool = data.charPool || [];
      DataHub._data.propPool = data.propPool || [];
    }
    if (data.shootingDays) DataHub._data.shootingDays = data.shootingDays;
    if (data.crewMembers) DataHub._data.crewMembers = data.crewMembers;
    if (data.hotelRooms) DataHub._data.hotelRooms = data.hotelRooms;
    if (data.budgetItems) DataHub._data.budgetItems = data.budgetItems;
    DataHub.save();

    // 同步到 AppBreakdown
    if (data.scenePool && data.scenePool.length) {
      AppBreakdown.scenes = data.scenePool.map(s => ({
        ...s, assignedDay: s.assignedDay || null, id: s.id || Date.now() + Math.random() * 100
      }));
      AppBreakdown.days = data.shootingDays || [];
      AppBreakdown.confirmed = true;
      document.getElementById('bd-layout').style.display = 'block';
      document.getElementById('ai-suggest').style.display = 'flex';
      updateSuggestCard(); renderSceneTable(); renderSameLocationTable(); renderDayPanels();
    }

    if (mode === 'readonly') {
      document.getElementById('collab-status').innerHTML = '👁️ 只读查看 (协作项目)';
      this.lockEditing();
    } else {
      document.getElementById('collab-status').innerHTML = '🤝 协作编辑中';
    }

    showToast('✅ 项目已导入 (' + mode === 'readonly' ? '只读' : '可编辑' + ')');
  },

  // 锁定编辑（只读模式）
  lockEditing() {
    // 禁用所有输入
    document.querySelectorAll('input, textarea, select, button').forEach(el => {
      if (el.closest('#collab-bar') || el.closest('#import-overlay') ||
          el.closest('.modal-overlay') || el.closest('.assistant-overlay') ||
          el.closest('.sb-nav') || el.closest('.bottom-nav') ||
          el.closest('#paywall-overlay') || el.closest('#confirm-panel') ||
          el.closest('#assistant-overlay') || el.id === 'script-input' ||
          el.classList.contains('nav-paw')) {
        return; // 导航和弹窗保持可用
      }
      el.disabled = true;
    });
    // 视觉提示
    document.querySelector('.main').style.opacity = '0.85';
  },

  // ━━━ 方案B: Firebase 实时协作（核心代码结构） ━━━
  // 使用前需: npm install firebase 或在 index.html 引入 Firebase CDN

  firebaseConfig: null,

  initFirebase(config) {
    this.firebaseConfig = config;
    // 伪代码 — 实际使用时取消注释:
    // firebase.initializeApp(config);
    // this._db = firebase.database();
    // this._startListening();
  },

  // 创建在线项目
  async createOnlineProject() {
    if (!this.firebaseConfig) {
      showToast('Firebase未配置，使用URL分享模式');
      return this.generateShareURL();
    }
    // const ref = this._db.ref('projects').push();
    // const projectId = ref.key;
    // await ref.set({
    //   projectId,
    //   data: DataHub._data,
    //   createdAt: firebase.database.ServerValue.TIMESTAMP,
    //   collaborators: {}
    // });
    // return projectId;
  },

  // 实时监听远程修改
  _startListening(projectId) {
    // const ref = this._db.ref('projects/' + projectId);
    // ref.on('value', (snapshot) => {
    //   const remote = snapshot.val();
    //   if (!remote || !remote.data) return;
    //   // 冲突处理：比较时间戳
    //   if (remote._ts > (DataHub._data._ts || 0)) {
    //     DataHub._data = remote.data;
    //     DataHub._data._ts = remote._ts;
    //     DataHub.save();
    //     this._refreshUI();
    //   }
    // });
    //
    // // 本地修改推送到Firebase
    // const origSave = DataHub.save.bind(DataHub);
    // DataHub.save = () => {
    //   origSave();
    //   DataHub._data._ts = Date.now();
    //   ref.child('data').set(DataHub._data);
    // };
  },

  _refreshUI() {
    if (AppBreakdown.scenes.length) {
      renderSceneTable(); renderSameLocationTable(); renderDayPanels();
    }
  }
};

// ============================================
// 全局函数（HTML onclick调用）
// ============================================
function shareProject() {
  if (!DataHub.scenePool.length && !DataHub.crewMembers.length) {
    showToast('请先完成剧本分解或录入组员 📋'); return;
  }

  const url = Collab.generateShareURL();
  const shortId = Collab.generateProjectID();

  // 也缓存到本地（方便后续短ID查找）
  const packed = Collab.packProject();
  localStorage.setItem('fh_shared_' + shortId, JSON.stringify({
    scenePool: DataHub.scenePool,
    shootingDays: DataHub.shootingDays,
    crewMembers: DataHub.crewMembers,
    hotelRooms: DataHub.hotelRooms,
    budgetItems: DataHub.budgetItems
  }));

  // 复制链接
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('✅ 分享链接已复制！发送给团队成员即可');
    }).catch(() => {
      showShareFallback(url, shortId);
    });
  } else {
    showShareFallback(url, shortId);
  }
}

function showShareFallback(url, shortId) {
  // 创建分享信息面板
  const html = `
    <div style="text-align:left;line-height:1.8;">
      <p><b>🔗 分享链接：</b></p>
      <textarea readonly style="width:100%;height:40px;font-size:0.7rem;padding:6px;border:1px solid var(--border);border-radius:4px;resize:none;">${url}</textarea>
      <p style="margin-top:8px;"><b>🆔 项目ID：</b> <code>${shortId}</code></p>
      <p style="font-size:0.7rem;color:var(--text2);">团队成员可在 Prodlink 中输入项目ID导入</p>
    </div>`;

  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:600;background:white;padding:24px;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.3);max-width:400px;width:90%;';
  el.innerHTML = html + '<button class="btn btn-primary btn-sm" style="margin-top:8px;width:100%;" onclick="this.parentElement.remove()">关闭</button>';
  document.body.appendChild(el);
}

function showImportDialog() {
  document.getElementById('import-overlay').style.display = 'flex';
  setTimeout(() => document.getElementById('import-input').focus(), 200);
}

function closeImportDialog() {
  document.getElementById('import-overlay').style.display = 'none';
}

function importProject() {
  const input = document.getElementById('import-input').value.trim();
  const modeEl = document.querySelector('input[name="import-mode"]:checked');
  const mode = modeEl ? modeEl.value : 'edit';

  if (!input) { showToast('请粘贴链接或项目ID'); return; }

  let data = null;

  // 检测是完整链接还是短ID
  if (input.includes('share=')) {
    // 完整URL
    try {
      const url = new URL(input);
      const share = url.searchParams.get('share');
      if (share) {
        data = Collab.unpackProject(share);
      }
    } catch(e) {
      // 不是合法URL，尝试作为纯压缩串
      try { data = Collab.unpackProject(input); } catch(e2) {}
    }
  } else {
    // 短ID → 从本地缓存查找
    try {
      const raw = input.length > 20 ?
        Collab.unpackProject(input) :
        JSON.parse(localStorage.getItem('fh_shared_' + input) || 'null');
      if (raw) data = raw.scenePool ? raw : null;
    } catch(e) {
      // 尝试直接作为压缩串
      try { data = Collab.unpackProject(input); } catch(e2) {}
    }
  }

  if (!data) {
    showToast('❌ 无法解析，请检查链接/ID是否正确');
    return;
  }

  closeImportDialog();
  Collab.importData(data, mode);
}

// ============================================
// 初始化：自动检测URL参数
// ============================================
(function() {
  const origInit = window.init || (() => {});
  window.init = function() {
    origInit();
    // 自动检测URL中的协作数据
    if (Collab.autoImportFromURL()) {
      // URL有分享数据，已自动导入
      console.log('协作数据已自动导入');
    }
    // 检测是否有隔离数据需要清理
    const ts = localStorage.getItem('fh_shared_ts');
    if (ts && Date.now() - parseInt(ts) > 86400000 * 7) {
      // 清理7天前的分享缓存
      const keys = Object.keys(localStorage).filter(k => k.startsWith('fh_shared_'));
      keys.forEach(k => localStorage.removeItem(k));
    }
  };
})();
