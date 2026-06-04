// ============================================
// Prodlink 中央数据池 — 所有模块数据联动
// ============================================
const DataHub = {
  _data: null,

  init() {
    try { this._data = JSON.parse(localStorage.getItem('fh_datahub')) || this.defaults(); }
    catch(e) { this._data = this.defaults(); }
    return this;
  },

  defaults() {
    return {
      scenePool: [],        // 场景池 [{num,location,io,dn,pages,summary,mainChars,props,...}]
      charPool: [],         // 角色池（去重后的角色名数组）
      propPool: [],         // 道具池（去重）
      shootingDays: [],     // 拍摄日 [{id,label,date,sceneIds:[...]}]
      crewMembers: [],      // 组员 [{id,name,role,phone,wechat,idCard,emergency,diet,needHotel,arriveDate,leaveDate}]
      hotelRooms: [],       // 酒店 [{room,occupants:[crewId,...]}]
      budgetItems: [],      // 预算 [{crewId,category,amount,note}]
    };
  },

  save() {
    localStorage.setItem('fh_datahub', JSON.stringify(this._data));
  },

  // --- 池操作 ---
  get scenePool() { return this._data.scenePool; },
  get charPool() { return this._data.charPool; },
  get propPool() { return this._data.propPool; },
  get shootingDays() { return this._data.shootingDays; },
  get crewMembers() { return this._data.crewMembers; },
  get hotelRooms() { return this._data.hotelRooms; },
  get budgetItems() { return this._data.budgetItems; },

  // 从剧本分解导入场景/角色/道具池
  importFromBreakdown(scenes) {
    // 场景池
    this._data.scenePool = scenes.map(s => ({
      num: s.num, location: s.location, io: s.io, dn: s.dn,
      pages: s.pages, summary: s.summary,
      mainChars: s.mainChars, minorChars: s.minorChars,
      props: s.props, costumes: s.costumes, remark: s.remark
    }));

    // 角色池（去重）
    const charSet = new Set();
    scenes.forEach(s => {
      (s.mainChars||'').split(/[\s、,]+/).filter(Boolean).forEach(c => charSet.add(c));
      (s.minorChars||'').split(/[\s、,]+/).filter(Boolean).forEach(c => charSet.add(c));
    });
    this._data.charPool = Array.from(charSet);

    // 道具池（去重）
    const propSet = new Set();
    scenes.forEach(s => {
      (s.props||'').split(/[\s、,]+/).filter(Boolean).forEach(p => propSet.add(p));
    });
    this._data.propPool = Array.from(propSet);

    this.save();
  },

  // 从拍摄日导入数据
  importShootingDays(days) {
    this._data.shootingDays = days;
    this.save();
  },

  // 根据拍摄日ID获取该日需要的所有信息（用于填充通告单）
  getDayCallSheetData(dayId) {
    const day = this._data.shootingDays.find(d => d.id === dayId);
    if (!day) return null;

    const scenes = day.sceneIds
      .map(sid => this._data.scenePool.find(s => s.num === String(sid) || s.num === sid))
      .filter(Boolean);

    // 汇总该日所需角色
    const dayChars = new Set();
    const dayProps = new Set();
    scenes.forEach(s => {
      (s.mainChars||'').split(/[\s、,]+/).filter(Boolean).forEach(c => dayChars.add(c));
      (s.props||'').split(/[\s、,]+/).filter(Boolean).forEach(p => dayProps.add(p));
    });

    return {
      date: day.date || '',
      label: day.label,
      scenes: scenes,
      chars: Array.from(dayChars),
      props: Array.from(dayProps),
      sceneCount: scenes.length,
      totalPages: scenes.reduce((sum,s) => sum + (parseFloat(s.pages)||0), 0)
    };
  },

  getDayOptions() {
    return this._data.shootingDays.map(d => ({
      id: d.id, label: d.label + (d.date ? ' ('+d.date+')' : ''),
      sceneCount: d.sceneIds.length
    }));
  },

  // --- 组员 ---
  addCrewMember(m) {
    m.id = Date.now();
    this._data.crewMembers.push(m);
    this.save();
    return m;
  },
  updateCrewMember(id, updates) {
    const idx = this._data.crewMembers.findIndex(m => m.id === id);
    if (idx > -1) { Object.assign(this._data.crewMembers[idx], updates); this.save(); }
  },
  removeCrewMember(id) {
    this._data.crewMembers = this._data.crewMembers.filter(m => m.id !== id);
    this.save();
  },

  // --- 酒店 ---
  updateHotelRooms(rooms) { this._data.hotelRooms = rooms; this.save(); },

  // --- 预算 ---
  updateBudgetItems(items) { this._data.budgetItems = items; this.save(); },

  // 导出全组通联为打印格式
  exportContactSheet() {
    return this._data.crewMembers.map(m => ({
      '姓名': m.name, '职位': m.role, '手机': m.phone, '微信': m.wechat,
      '紧急联系人': m.emergency, '饮食': m.diet, '住宿': m.needHotel?'是':'否',
      '到组': m.arriveDate, '离组': m.leaveDate
    }));
  }
};

// 全局初始化
DataHub.init();
