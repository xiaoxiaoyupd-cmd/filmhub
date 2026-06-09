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
async function analyzeScript() {
  _rawScript = document.getElementById('script-input').value.trim();
  if (!_rawScript) { showToast('请先粘贴剧本 📝'); return; }

  const statusEl = document.getElementById('script-status');
  statusEl.textContent = '分析中...';

  // 1. 始终先走本地解析 —— 场号/场景/内外/日夜/角色 100%可靠
  normalizeScript();
  const text = document.getElementById('script-input').value.trim();
  let scenes = parseScript(text);

  if (!scenes.length) {
    statusEl.textContent = '❌ 未识别到场次';
    showToast('未识别到场次！');
    return;
  }

  statusEl.textContent = '✅ 识别 ' + scenes.length + ' 场';

  // 2. 有API Key → AI 增强摘要/道具/服装（不改结构）
  if (dsApiKey && dsApiKey.startsWith('sk-')) {
    statusEl.textContent = '🤖 AI 增强中...';
    try {
      scenes = await aiEnhanceScenes(scenes);
      statusEl.textContent = '✅ ' + scenes.length + ' 场 (AI增强)';
    } catch(e) {
      statusEl.textContent = '✅ ' + scenes.length + ' 场 (本地)';
      console.log('AI增强失败，使用本地结果', e.message);
    }
  }

  AppBreakdown.scenes = scenes;
  AppBreakdown.confirmed = false;
  AppBreakdown.days = loadStoredDays() || [];
  document.getElementById('bd-layout').style.display = 'none';
  showConfirmPanel(scenes);
}

// ============================================
// AI增强 v6 — 两轮分析 + 批量调用
// ============================================

const SYSTEM_PROMPT_ROUND1 = `你是一位拥有15年以上院线电影经验的资深剧本统筹（Script Supervisor），工作语言为中文。

## 你的任务
本地解析器已经对剧本做了初步提取（场号/场景/内外日夜/初步角色/初步道具），但结果不完美。请你逐场独立重新分析剧本原文，发现并纠正所有错误和遗漏。

## 对每一场戏，请输出：
1. summary：一句话概括本场核心戏剧动作（50字以内），不写文学化意境描写
2. mainChars：本场有对白或重要动作的角色（空格分隔）
3. minorChars：群演/背景角色。合并重复命名——如果"年轻男子"/"小伙子"/"男生"指同一人，统一用"路人男性"
4. props：角色正在使用、持有、交付、或产生直接交互的实体物品
5. costumes：特殊服装（婚纱、制服、病号服等），普通衣服不要填
6. remark：任何制片备注

## 严格禁止
❌ 不要把天气/自然环境识别为道具（阳光、雨水、风、雪、江水、河流、树木、山景）
❌ 不要把角色外貌描述当道具（长发、西装、裙子——除非被角色明确拿取/交互）
❌ 不要把情绪/抽象概念当道具（哭泣、笑声、沉默、愤怒、气氛、心情）
❌ 不要把摄影术语当角色（镜头一、远景、近景、特写、VO不带人名）
❌ 不要编造只在台词中提及但肉身未出场的角色

## 角色判断优先级
1. 有对白行（XXX：或XXX:）→ 必须列入mainChars
2. 有明确动作描写（推门进来、坐下、递给、接过等）→ 列入mainChars
3. 仅在他人口中被提及 → 绝对不列入

## 道具判断标准
✅ 角色正在使用、持有、递出、接过的实物物品
✅ 推动情节的关键物品（信、照片、武器、礼物、遗物）
❌ 环境背景景物
❌ 普通穿着衣物（除非特殊交互）

## Few-shot 范例

范例1（正常场次）：
原文："1 江边 日外\\n妈妈和女儿在江边散步，妈妈侧肩挂着白色的帆布包。女儿拿着手机在看。妈妈从包里掏出保温杯递给女儿。"
解析器参考：mainChars:"妈妈 女儿" props:"白色帆布包 手机 保温杯"
你的输出：
{"num":"1","summary":"江边散步时妈妈从帆布包掏出保温杯递给女儿","mainChars":"妈妈 女儿","minorChars":"","props":"白色帆布包 手机 保温杯","costumes":"","remark":""}

范例2（含画外音+群演）：
原文："3 银杏树下 日外\\n妈妈(O.S.)你好啊,帮我拍张照片。女儿:妈别麻烦人家。路人男性接过手机帮她们拍照。"
解析器参考：mainChars:"妈妈 女儿 路人男性" props:"手机"
你的输出——路人男性应归为minorChars（群演无对白）：
{"num":"3","summary":"妈妈请路人男性用手机帮母女合影，女儿不耐烦","mainChars":"妈妈 女儿","minorChars":"路人男性","props":"手机","costumes":"","remark":"路人男性为随机找的拍摄者"}

范例3（需要纠错——天气和窗帘不是道具）：
原文："5 家内餐桌 夜内\\n餐桌上摆着三菜一汤。妈妈夹了一块红烧肉放进女儿碗里。窗外下着雨，风吹动窗帘。"
解析器参考：mainChars:"妈妈 女儿" props:"红烧肉 窗帘"
你的输出——纠正错误，雨水和窗帘是环境，不应列为道具：
{"num":"5","summary":"餐桌上妈妈夹红烧肉给女儿，窗外风雨交加","mainChars":"妈妈 女儿","minorChars":"","props":"红烧肉","costumes":"","remark":""}

## 输入格式
你会收到JSON数组，每个元素：{num, location, io, dn, parserMainChars, rawText}

## 输出格式
只输出纯JSON数组。每个元素格式：
{"num":"场号","summary":"<50字梗概","mainChars":"空格分隔","minorChars":"空格分隔","props":"空格分隔","costumes":"服装","remark":"备注"}
字段为空时留空字符串""。`;

const SYSTEM_PROMPT_ROUND2 = `你是资深剧本统筹，正在进行全剧全局一致性检查。

## 背景
第一轮已逐场分析完毕。现在请你从全剧视角，进行跨场次的数据清洗和对齐。

## 你的任务

1. 角色合并：如果不同场次出现"张三"/"张总"/"老张"，它们可能指向同一人。请在charAliases中标注等价关系。在每个涉及场次的remark中注明。

2. 角色主配重分类：
   - 出场 ≥3场 且有对白 → mainChars
   - 仅出场1场 且无对白 → minorChars
   - 泛指称呼（路人、学生、群众、顾客等）→ 始终minorChars

3. 关键道具识别：同一道具在 ≥2场出现 → 标记为"🔑"关键道具，在首场remark中列出。

4. 道具名统一：合并等价道具名（"手机壳"/"手机套"/"手机保护壳"→统一为最简名称）。

## 输入
全部场次的JSON数组，每场含：{num, location, mainChars, minorChars, props, remark}

## 输出
严格JSON object：
{
  "charAliases": {"张三":["张总","老张"]},
  "keyProps": ["手机","保温杯","白色帆布包"],
  "sceneUpdates": [{"num":"1","mainChars":"修正后","minorChars":"修正后","props":"修正后","remark":"补充备注"}]
}
只包含真的有变化的场次，没变化的场次不要放入sceneUpdates。`;

// ============================================
// 批量调用
// ============================================
async function aiEnhanceScenes(scenes) {
  const statusEl = document.getElementById('script-status');
  const BATCH = 8;

  // ── Round 1: 逐批分析 ──
  statusEl.textContent = '🤖 Round 1/2 逐场分析...';
  const round1Results = [];

  for (let i = 0; i < scenes.length; i += BATCH) {
    const batch = scenes.slice(i, i + BATCH);
    statusEl.textContent = '🤖 R1: ' + (i+1) + '-' + Math.min(i+BATCH, scenes.length) + '/' + scenes.length;

    try {
      const enhanced = await callAIRound1(batch);
      round1Results.push(...enhanced);
    } catch(e) {
      console.log('R1 batch failed, keeping local', e);
      round1Results.push(...batch.map(s => ({ ...s })));
    }
  }

  // 合并R1结果
  const r1Map = {};
  round1Results.forEach(r => { r1Map[String(r.num)] = r; });

  const merged = scenes.map(s => {
    const r1 = r1Map[String(s.num)] || {};
    return {
      ...s,
      summary: r1.summary || s.summary,
      mainChars: cleanAndMerge(s.mainChars, r1.mainChars),
      minorChars: cleanAndMerge(s.minorChars, r1.minorChars),
      props: cleanAndMerge(s.props, r1.props),
      costumes: r1.costumes || s.costumes,
      remark: r1.remark || s.remark
    };
  });

  // ── Round 2: 全局一致性（仅在≥4场时执行） ──
  if (merged.length >= 4) {
    statusEl.textContent = '🤖 Round 2/2 全局一致性校验...';
    try {
      const r2 = await callAIRound2(merged);
      applyRound2Results(merged, r2);
    } catch(e) {
      console.log('R2 failed, using R1 results', e);
    }
  }

  statusEl.textContent = '✅ ' + merged.length + ' 场 (AI增强)';
  return merged;
}

async function callAIRound1(batch) {
  const input = batch.map(s => ({
    num: s.num, location: s.location, io: s.io, dn: s.dn,
    parserMainChars: s.mainChars,
    rawText: (s.rawText || '').substring(0, 400)
  }));

  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + dsApiKey },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_ROUND1 },
        { role: 'user', content: JSON.stringify(input) }
      ],
      temperature: 0.15,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    })
  });

  if (!resp.ok) throw new Error('API ' + resp.status);
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';

  // 提取JSON数组
  const arrMatch = content.match(/\[[\s\S]*\]/);
  if (!arrMatch) throw new Error('No JSON array in response');
  return JSON.parse(arrMatch[0]);
}

async function callAIRound2(scenes) {
  const input = scenes.map(s => ({
    num: s.num, location: s.location,
    mainChars: s.mainChars, minorChars: s.minorChars, props: s.props,
    remark: s.remark
  }));

  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + dsApiKey },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_ROUND2 },
        { role: 'user', content: JSON.stringify(input) }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })
  });

  if (!resp.ok) throw new Error('API ' + resp.status);
  const data = await resp.json();
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

function applyRound2Results(scenes, r2) {
  if (!r2.sceneUpdates) return;

  const updates = {};
  r2.sceneUpdates.forEach(u => { updates[String(u.num)] = u; });

  // 对每个场景，AI结果取并集（不删除本地数据）
  scenes.forEach(s => {
    const u = updates[String(s.num)];
    if (!u) return;
    if (u.mainChars) s.mainChars = cleanAndMerge(s.mainChars, u.mainChars);
    if (u.minorChars) s.minorChars = cleanAndMerge(s.minorChars, u.minorChars);
    if (u.props) s.props = cleanAndMerge(s.props, u.props);
    // remark采用追加而非覆盖
    if (u.remark && u.remark !== s.remark) {
      s.remark = s.remark ? s.remark + ' | ' + u.remark : u.remark;
    }
  });

  // 角色别名全局替换（保留原角色名同时添加标准名）
  if (r2.charAliases) {
    Object.entries(r2.charAliases).forEach(([canonical, aliases]) => {
      scenes.forEach(s => {
        // 在mainChars中替换别名
        let mc = (s.mainChars || '').split(/[\s、,]+/).filter(Boolean);
        let changed = false;
        aliases.forEach(alias => {
          const idx = mc.indexOf(alias);
          if (idx > -1) { mc[idx] = canonical; changed = true; }
        });
        if (changed) s.mainChars = [...new Set(mc)].join(' ');

        // 同时检查minorChars
        let mi = (s.minorChars || '').split(/[\s、,]+/).filter(Boolean);
        changed = false;
        aliases.forEach(alias => {
          const idx = mi.indexOf(alias);
          if (idx > -1) { mi[idx] = canonical; changed = true; }
        });
        if (changed) s.minorChars = [...new Set(mi)].join(' ');
      });
    });
  }

  // 标记关键道具（只在首场remark中添加备注）
  if (r2.keyProps) {
    let firstMarked = {};
    scenes.forEach(s => {
      r2.keyProps.forEach(prop => {
        if ((s.props || '').includes(prop)) {
          if (!firstMarked[prop]) {
            if (!(s.remark || '').includes('🔑' + prop)) {
              s.remark = (s.remark || '') + ' 🔑' + prop;
            }
            firstMarked[prop] = true;
          }
        }
      });
    });
  }
}

function cleanAndMerge(local, ai) {
  const localSet = new Set((local || '').split(/[\s、,]+/).filter(Boolean));
  const aiSet = new Set((ai || '').split(/[\s、,]+/).filter(Boolean));
  // AI的补充——取并集，不删除本地已有数据
  aiSet.forEach(x => localSet.add(x));
  return [...localSet].join(' ');
}

// ============================================
// 本地解析器 v5 — 精准提取
// ============================================

// 中文姓名检测（常见姓氏 + 2-4字组合）
const CN_SURNAMES = '王李张刘陈杨赵黄周吴徐孙马胡朱郭何罗高林郑梁谢唐许冯宋韩邓彭曹曾田萧潘袁蔡蒋余于杜叶程苏魏吕丁任卢姚沈钟姜崔谭陆范汪廖石金贾韦夏傅方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤';

function isChName(word) {
  if (!word || word.length < 2 || word.length > 4) return false;
  if (/^\d+$/.test(word)) return false;
  // 必须全部是中文字符
  if (!/^[一-鿿]+$/.test(word)) return false;
  // 黑名单：不是人名的常见词（含地名/方位/动词/虚词）
  const BANNED = new Set([
    '镜头','远景','近景','特写','中景','全景','跟拍','移动','入画','出画','画外','旁白','空镜',
    '字幕','切换','淡入','淡出','转场','叠化','切至','杭州','上海','北京','广州','深圳','纽约','巴黎','东京','伦敦',
    '清晨','黄昏','傍晚','凌晨','中午','下午','晚上','白天','夜晚','今天','明天','昨天','前天','后天','周末','星期',
    '他们','她们','我们','你们','自己','大家','有人','忽然','突然','然后','接着','于是','但是','然而','可是',
    '外面','里面','旁边','前面','后面','上面','下面','远处','近处','这里','那里','哪里','门口','窗前','窗外',
    '桌上','地上','墙上','床上','手里','心里','眼里','嘴边','身边','身旁','耳边','身后','面前','跟前','膝下',
    '穿着','戴着','拿着','背着','提着','看见','听见','闻到','觉得','好像','仿佛','似乎',
    '什么','怎么','为什么','非常','十分','比较','稍微','已经','正在','将要','没有','还是',
    '也许','可能','大概','应该','必须','需要','能够','可以','一定','总是','经常','偶尔','不断',
    '继续','开始','结束','停下','起来','下来','过去','过来','回来','回去','出去','进来',
    '慢慢','渐渐','忽然间','突然间','一下子','一刹那','顿时','瞬间','顷刻','片刻','不久',
    '整个','全部','所有','每个','每张','每人','每次','每种','各种','一些','一点','很大','很小',
    '分明','明显','显然','似乎','确实','真的','完全','根本','简直','实在','反正','毕竟',
    '场景','画面','荧幕','银幕','屏幕','空间','房间','屋子','走廊','楼梯','电梯','窗户',
    '想着','想起','想到','听到','听到','嗅到','感到','发觉','发现','觉得','认为','以为',
    // 新增：地名/路名/景观+后缀 → 不是人
    '钱塘','长江','黄河','西湖','太湖','洞庭','珠江','漓江','湘江','赣江','闽江','乌江',
    '钱塘江','黄河边','长江边','江边','河边','湖边','海边','路边','街边','道边','桥边',
    '公园','广场','大楼','大厦','小区','花园','商场','超市','医院','学校','车站','机场',
    // 新增：纯方位词
    '对面','隔壁','楼上','楼下','路旁','沿岸','附近','尽头','拐角','转弯','路口','街角',
    '角落','边缘','上方','下方','左方','右方','一侧','另一侧','两旁','两侧','中央',
    // 新增：常见双字动词 → 不是人
    '行走','跑步','骑车','开车','游泳','跳舞','唱歌','画画','写字','做饭','洗碗','扫地',
    '拖地','拿起','放下','打开','关闭','走进','走出','进来','出去','坐下','站起','离开',
    '回头','转身','弯腰','蹲下','抬头','低头','摇头','点头','摆手','挥手','握手','拥抱',
    '说话','聊天','吵架','打架','哭泣','微笑','大笑','叹息','叹气','呼吸','咳嗽','打喷嚏',
    '发呆','愣住','怔住','迟疑','犹豫','点头','皱眉','撇嘴','抿嘴','瞪眼','眯眼','眨眼',
    '凝视','张望','打量','端详','注视','扫视','环顾','巡视','眺望','远眺','遥望','看去',
  ]);
  if (BANNED.has(word)) return false;

  // 新增：地名模式过滤（X江/X河/X湖/X海/X山/X路/X街/X道/X桥+X园/场/楼/岸/边/旁）
  if (/(?:江|河|湖|海|山|路|街|道|桥|公园|广场|大楼|大厦|小区|花园|商场|超市|医院|学校|车站|机场|码头|港口|村庄|乡镇|县城|市区|城区|新城|古镇|水乡|景区|乐园|农场|牧场|赛道|车道|步道|绿道|跑道|单车道|自行车道)\s*(?:边|旁|附近|周围|一带|沿岸|沿线|对面|一侧|两端|两侧)?$/.test(word)) return false;

  // 新增：纯方位后缀词过滤（X边/X旁/X附近 — 但"床边"可通过后续上下文判断）
  if (/^(?:远|近|这|那|哪|对|隔|上|下|左|右|前|后|里|外|一|两)(?:处|边|面|头|方|侧|旁|端|岸|角|沿)$/.test(word)) return false;

  // 新增：地点/建筑/景观后缀 → 不是人名
  // 案例："江边"+"行走"→被误判为角色名，实际"江边"是地点
  if (/[边旁岸畔处坝湾潭泊渠沟滩屿洲岛坪场站港渡口]$/.test(word) && word.length <= 4) return false;
  if (/[楼馆厅室园苑院府寓舍宅堂庙寺观塔碑]$/.test(word) && word.length <= 4) return false;
  if (/[景野林岭谷峡坡崖壁峰顶]$/.test(word) && word.length <= 3) return false;

  // 特殊排除："XXX边"模式（如"钱塘江边""江边""路边""海边"）
  if (/[江河湖海路街道桥园场山岭谷峡坡]$/.test(word) && word.length === 2) return false;

  // 姓在常见姓氏表中，提高置信度
  if (CN_SURNAMES.includes(word[0])) return true;
  // 称呼类角色名
  if (/^(妈妈|爸爸|女儿|儿子|爷爷|奶奶|外婆|外公|叔叔|阿姨|舅舅|姑姑|姐姐|哥哥|弟弟|妹妹|老公|老婆|男友|女友|同学|老师|老板|同事|朋友|邻居|路人|司机|保安|警察|医生|护士|服务员|外卖|快递)$/.test(word)) return true;
  // 泛指角色，允许（后续归为minor）
  if (/^(路人|学生|群众|顾客|乘客|游客|观众|粉丝|队员|组员|同事|邻居|行人|青年|中年|老年|男子|女子|男孩|女孩|小孩|儿童)$/.test(word)) return true;
  return false;
}

// 泛指角色/群演
function isExtra(word) {
  return /^(路人|学生|群众|顾客|乘客|游客|观众|粉丝|队员|组员|同事|邻居|行人|青年|中年|老年|男子|女子|男孩|女孩|小孩|儿童|骑自行车的|跑步的|遛狗的|散步的)$/.test(word);
}

// ── 剧本分割 ──
function parseScript(text) {
  // 先统一格式
  text = normalizeScriptFormat(text);

  const scenes = [];
  const lines = text.split(/\n/);
  let cur = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 检测场次开头 — 行首数字
    const m1 = line.match(/^(\d{1,3})\s*[\.\、\s．。）\)\s]\s*(.+)/);
    const m2 = !m1 ? line.match(/^(\d{1,3})([一-鿿])/) : null;

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

  // 后处理：跨场次角色重分类 + 关键道具标记
  crossSceneCharReclassify(scenes);
  markKeyProps(scenes);

  return scenes;
}

// ── 跨场次角色重分类 ──
function crossSceneCharReclassify(scenes) {
  // 统计每个角色在全剧中的出场信息
  const globalStats = {}; // {name: {totalScenes:int, dialogueScenes:int, firstScene:int}}

  scenes.forEach((s, si) => {
    const allChars = [
      ...(s.mainChars || '').split(/[\s、,]+/).filter(Boolean),
      ...(s.minorChars || '').split(/[\s、,]+/).filter(Boolean)
    ];
    allChars.forEach(name => {
      if (!globalStats[name]) globalStats[name] = { totalScenes: 0, dialogueScenes: 0, firstScene: si };
      globalStats[name].totalScenes++;
    });
    // 有对白的角色（mainChars 中检测到的有台词角色）
    (s.mainChars || '').split(/[\s、,]+/).filter(Boolean).forEach(name => {
      if (globalStats[name]) globalStats[name].dialogueScenes++;
    });
  });

  // 重新判定每场的主/次要角色
  scenes.forEach(s => {
    const currentMain = (s.mainChars || '').split(/[\s、,]+/).filter(Boolean);
    const currentMinor = (s.minorChars || '').split(/[\s、,]+/).filter(Boolean);
    const newMain = [];
    const newMinor = [];

    // 所有角色重新分类
    const allInScene = [...new Set([...currentMain, ...currentMinor])];
    allInScene.forEach(name => {
      const gs = globalStats[name];
      if (!gs) { newMinor.push(name); return; }

      // 泛指角色/群演 → 始终次要
      if (isExtra(name)) { newMinor.push(name); return; }

      // ≥2场有对白 → 主要角色
      if (gs.dialogueScenes >= 2) { newMain.push(name); return; }

      // 出场≥4场 → 主要角色（即使无对白也是常驻角色）
      if (gs.totalScenes >= 4) { newMain.push(name); return; }

      // 1场有对白 + ≥2场出场 → 主要角色
      if (gs.dialogueScenes >= 1 && gs.totalScenes >= 2) { newMain.push(name); return; }

      // 1场有对白 → 主要角色
      if (gs.dialogueScenes >= 1) { newMain.push(name); return; }

      // 其余 → 次要角色
      newMinor.push(name);
    });

    s.mainChars = [...new Set(newMain)].join(' ');
    s.minorChars = [...new Set(newMinor.filter(n => !newMain.includes(n)))].join(' ');
  });

  // 追加全局角色分析到首场备注
  if (scenes.length > 0) {
    const mainRoles = Object.entries(globalStats)
      .filter(([, gs]) => gs.dialogueScenes >= 2 || gs.totalScenes >= 3)
      .sort((a, b) => b[1].totalScenes - a[1].totalScenes)
      .map(([name, gs]) => `${name}(${gs.totalScenes}场${gs.dialogueScenes >= 1 ? '/' + gs.dialogueScenes + '对白' : ''})`);
    if (mainRoles.length) {
      const existingRemark = scenes[0].remark || '';
      if (!existingRemark.includes('👥全剧角色:')) {
        scenes[0].remark = (existingRemark + ' 👥全剧角色: ' + mainRoles.join(' ')).trim();
      }
    }
  }
} // end crossSceneCharReclassify

function normalizeScriptFormat(text) {
  // 第X场 → 数字
  text = text.replace(/第\s*(\d+)\s*场\s*/g, '$1 ');
  // 场X：→ 数字
  text = text.replace(/(?:场次?|Scene)\s*(\d+)\s*[：:]\s*/gi, '$1 ');
  // 中文数字场
  const cn = { '一':'1','二':'2','三':'3','四':'4','五':'5','六':'6','七':'7','八':'8','九':'9','十':'10' };
  for (const [k,v] of Object.entries(cn)) text = text.replace(new RegExp('第'+k+'[场幕]','g'), v+' ');
  // 数字. / 数字、/ （数字）
  text = text.replace(/(?:^|\n)\s*(\d+)[\.、）\)]\s*/g, '\n$1 ');
  return text;
}

// ── 单场构建 ──
function buildScene(sc) {
  const body = sc.bodyLines.join('\n');
  sc.rawText = (sc.headerLine + '\n' + body).trim();
  let header = sc.headerLine;

  // 内外日夜解析
  let io = '内', dn = '日';
  const m1 = header.match(/([内外])\s*([日夜])/);   // 内日、外夜
  const m2 = header.match(/([日夜])\s*([内外])/);   // 日内、夜外
  if (m1) { io = m1[1]; dn = m1[2]; header = header.replace(m1[0], '').trim(); }
  else if (m2) { dn = m2[1]; io = m2[2]; header = header.replace(m2[0], '').trim(); }

  // 英文标记
  if (/\bINT\b/i.test(header)) { io = '内'; header = header.replace(/\bINT\b/gi, '').trim(); }
  if (/\bEXT\b/i.test(header)) { io = '外'; header = header.replace(/\bEXT\b/gi, '').trim(); }
  if (/\bDAY\b/i.test(header)) { dn = '日'; header = header.replace(/\bDAY\b/gi, '').trim(); }
  if (/\bNIGHT\b/i.test(header)) { dn = '夜'; header = header.replace(/\bNIGHT\b/gi, '').trim(); }
  // 中文单独标记
  if (/室外|户外|外景|外拍/i.test(header)) io = '外';
  if (/室内|内景/i.test(header)) io = '内';
  if (/夜晚|深夜|午夜/i.test(header)) dn = '夜';
  if (/清晨|早晨|白天|上午|中午|下午|黄昏/i.test(header)) dn = '日';

  // 清理镜头术语和位置描述
  header = header.replace(/镜头[一二三\d]*|远景|近景|特写|中景|全景|跟拍|移动|入画|出画|切换|淡入|淡出|转场|叠化|切至/g, '');
  const location = header.replace(/[\s　]+/g, ' ').trim() || ('场景' + sc.num);

  // ===== 角色提取 v5 =====
  const allText = sc.rawText;
  const highlights = { mainChars: {}, minorChars: {}, props: {} };
  const charStats = {}; // {name: {dialogue:bool, actions:int}}

  function addChar(name, isDialogue) {
    if (!name || !isChName(name)) return;
    if (!charStats[name]) charStats[name] = { dialogue: false, actions: 0 };
    if (isDialogue) charStats[name].dialogue = true;
    else charStats[name].actions++;
  }

  // 逐行分析
  for (const line of sc.bodyLines) {
    // 1. 对白角色 "XXX：" "XXX:"
    const dm = line.match(/^([^\s：:（）()\d]{1,8})[：:]\s*(.+)/);
    if (dm && isChName(dm[1])) {
      addChar(dm[1], true);
      recordHighlight(highlights.mainChars, dm[1], allText);
      continue;
    }

    // 2. OS/VO 画外音 "XXX（OS）" "XXX（VO）"
    const osMatch = line.match(/^([^\s：:（）()\d]{1,8})[（(]\s*(OS|VO|画外|画外音)\s*[）)]/i);
    if (osMatch && isChName(osMatch[1])) {
      addChar(osMatch[1], true);
      recordHighlight(highlights.mainChars, osMatch[1], allText);
      continue;
    }

    // 3. 动作出场：从整行中提取中文人名
    extractActionChars(line, charStats);
  }

  // 从全文做二次补充（某些角色只在叙述中出现）
  extractNarrativeChars(allText, charStats);

  // 分类主要/次要
  const mainChars = [], minorChars = [];

  // 计算每个角色在全剧中的出现次数（跨场统计在 parseScript 后进行）
  Object.entries(charStats).forEach(([name, stat]) => {
    if (isExtra(name)) {
      minorChars.push(name);
    } else if (stat.dialogue || stat.actions >= 2) {
      mainChars.push(name);
    } else {
      minorChars.push(name);
    }
  });

  // 去重
  const uniqueMain = [...new Set(mainChars)];
  const uniqueMinor = [...new Set(minorChars)].filter(n => !uniqueMain.includes(n));

  // ===== 道具提取 v5 =====
  const props = extractProps(sc.bodyLines, allText, highlights);

  // 内容梗概
  let summary = '';
  for (const l of sc.bodyLines) {
    if (!/：|:/.test(l) && !/^[（(]/.test(l) && l.length > 5) {
      summary = l.replace(/镜头[一二三\d]*|远景|近景|特写|中景/g, '').substring(0, 55);
      break;
    }
  }
  if (!summary) summary = sc.bodyLines.filter(l => l.length > 3)[0]?.substring(0, 55) || '';

  // 页数
  const cc = allText.replace(/[\s\n]/g, '').length;
  const pages = Math.max(0.5, Math.round(cc / 180 * 2) / 2);

  return {
    id: Date.now() + parseInt(sc.num) + Math.random() * 100,
    num: sc.num, location, io, dn, pages,
    summary: summary || body.substring(0, 55),
    mainChars: uniqueMain.join(' '),
    minorChars: uniqueMinor.join(' '),
    props: props.join(' '),
    costumes: '', rawText: sc.rawText, remark: '',
    highlights: highlights,
    assignedDay: null
  };
}

// ── 动作角色提取 ──
function extractActionChars(line, charStats) {
  // 模式1: "XXX推门进来/走进/出现/坐下..." — 人名+动作动词
  const actionVerbs = '(?:走进|走出|进来|出去|推门|开门|关门|坐下|站起|起身|离开|来到|到达|出现|消失|回头|转身|停下|走过|路过|穿过|越过|跑来|跑去|冲进来|走出去|迈向|躺在床上|坐在|站在|蹲在|靠在|趴在|盯着|看着|望着|听着|翻着|写着|吃着|喝着|拿着|掏出|举起|放下|拾起|捡起|指向|指向窗外|指向远处|抬头|低头|回头|睁眼|闭眼|深呼吸|叹气|笑了笑|皱了皱眉|摆了摆手|摇了摇头|点了点头)';
  const re1 = new RegExp('([\\u4e00-\\u9fff]{2,4})' + actionVerbs, 'g');
  let m;
  while ((m = re1.exec(line)) !== null) {
    if (isChName(m[1])) charStats[m[1]] = charStats[m[1]] || { dialogue: false, actions: 0 };
    if (charStats[m[1]]) charStats[m[1]].actions++;
  }

  // 模式2: "XXX跟在YYY后面" / "XXX和YYY一起" / "XXX与YYY对视" — 多人互动
  const interactRe = /([一-鿿]{2,4})(?:和|与|跟|同|还有|以及)([一-鿿]{2,4})(?:一起|对视|握手|拥抱|并行|并肩|相伴|聊天|交谈|说话|吵架|打架|合作|配合|商量|讨论)/g;
  while ((m = interactRe.exec(line)) !== null) {
    if (isChName(m[1])) { charStats[m[1]] = charStats[m[1]] || { dialogue: false, actions: 0 }; charStats[m[1]].actions++; }
    if (isChName(m[2])) { charStats[m[2]] = charStats[m[2]] || { dialogue: false, actions: 0 }; charStats[m[2]].actions++; }
  }

  // 模式3: "XXX看着YYY" / "XXX帮YYY" — 交互动作
  const lookRe = /([一-鿿]{2,4})(?:看着|看向|望着|盯着|瞪了|帮|扶|拉住|拦住|追上|赶上|找到|叫住|喊住)([一-鿿]{2,4})/g;
  while ((m = lookRe.exec(line)) !== null) {
    if (isChName(m[1])) { charStats[m[1]] = charStats[m[1]] || { dialogue: false, actions: 0 }; charStats[m[1]].actions++; }
    if (isChName(m[2])) { charStats[m[2]] = charStats[m[2]] || { dialogue: false, actions: 0 }; charStats[m[2]].actions++; }
  }

  // 模式4: "XXX和YYY在冲咖啡/XXX、YYY一起..." — 并列人名+任意动作
  // 先尝试2人并列
  const pairRe = /([一-鿿]{2,4})(?:和|与|跟)([一-鿿]{2,4})(?:在|正在|一起|一同|一块|并肩|一道|共同|都|也|就|便|刚|已经)/g;
  while ((m = pairRe.exec(line)) !== null) {
    if (isChName(m[1])) { charStats[m[1]] = charStats[m[1]] || { dialogue: false, actions: 0 }; charStats[m[1]].actions++; }
    if (isChName(m[2])) { charStats[m[2]] = charStats[m[2]] || { dialogue: false, actions: 0 }; charStats[m[2]].actions++; }
  }
  // 再尝试3人及以上并列: "XXX、YYY、ZZZ一起..."
  const multiRe = /([一-鿿]{2,4})[、，]([一-鿿]{2,4})(?:[、，]([一-鿿]{2,4}))?(?:[、，]([一-鿿]{2,4}))?(?:一起|在|都|也|就|便|刚|已经|正在)/g;
  while ((m = multiRe.exec(line)) !== null) {
    for (let i = 1; i <= 4; i++) {
      if (m[i] && isChName(m[i])) { charStats[m[i]] = charStats[m[i]] || { dialogue: false, actions: 0 }; charStats[m[i]].actions++; }
    }
  }
}

// ── 叙述中角色补充 ──
function extractNarrativeChars(text, charStats) {
  // 匹配所有可能的人名模式（在动词/介词前后出现的中文词）
  const patterns = [
    // 人名 + 副词 + 动作
    /([一-鿿]{2,4})(?:正在|已经|正要|刚|就|也|才|忽然|突然|连忙|赶紧)(?:走|跑|坐|站|躺|看|听|说|笑|哭|想|等|写|吃|喝|拿|放|推|拉|开|关|进|出|来|去)/g,
    // 使令动词 + 人名
    /(?:让|叫|令|使|派|请|喊|命令|要求|示意)([一-鿿]{2,4})/g,
    // 介词 + 人名
    /(?:对|向|朝|冲|对着|朝着|冲着)([一-鿿]{2,4})/g,
    // 人名 + 直接动作（无副词间隔）
    /([一-鿿]{2,4})(?:推开门|拉开门|关上门|推开窗|拉开窗帘|点起烟|端起杯|放下笔|挂掉电话|拿起手机|掏出一根|递给|接过|抢过|夺下|扔下|摔门|拍桌|站起身|回过身|转过身|低下头|抬起头|摇摇头|点点头|摆摆手|挥挥手|推开|拉回|按下|拨通|挂断|拨出)/g,
    // 所有格 → 角色在场（如"妈妈的手机"→妈妈）
    /([一-鿿]{2,4})的(?:手机|包|手|怀里|手中|身边|身后|心里|眼里)/g,
    // 人名在否定句中
    /([一-鿿]{2,4})(?:没有|不在|不|别|没)(?:说话|吭声|动|出声|回应|回答|理|抬头|睁眼)/g,
  ];
  patterns.forEach(re => {
    let m;
    while ((m = re.exec(text)) !== null) {
      if (isChName(m[1]) && !charStats[m[1]]) {
        charStats[m[1]] = { dialogue: false, actions: 1 };
      }
    }
  });
}

// ── 道具提取 ──
function extractProps(bodyLines, allText, highlights) {
  const props = new Set();
  const propCount = {};

  // 动词+宾语模式（扩展至50+动词）
  const holdVerbs = '拿着|握着|提着|背着|抱着|举着|夹着|托着|捧着|拎着|扛着|拽着';
  const interactVerbs = '递给|接过|交给|收到|拿出|掏出|取出|递给|寄给|送给|还给|传给|递给';
  const placeVerbs = '放在|放到|搁在|摆在|挂在|装进|塞进|放进|投入|倒入|装入|置入';
  const useVerbs = '打开|关闭|喝下|喝完|吃掉|吃完|写下|记下|画出|看着|盯着|骑着|开着|拨打|接听|穿上|戴上|摘下|脱下|拉开|推上|拧开|盖上|翻开|合上|锁上';

  const allVerbPatterns = [holdVerbs, interactVerbs, placeVerbs, useVerbs].join('|');
  const verbRe = new RegExp('(?:' + allVerbPatterns + ')([^\\s\\u3000-\\u303f\\uff00-\\uffef\\(\\)\\[\\]【】\\{\\}<>《》\\"\\\'\\.\\,\\!\\?\\:\\;\\-]{1,6})', 'g');

  let m;
  while ((m = verbRe.exec(allText)) !== null) {
    const candidate = m[1];
    // 过滤：不是人名、不是抽象词
    if (isValidProp(candidate)) {
      props.add(candidate);
      propCount[candidate] = (propCount[candidate] || 0) + 1;
      recordHighlight(highlights.props, candidate, allText);
    }
  }

  // 补充：场景描述中的物品名词
  const itemPatterns = /(?:桌上|包里|手中|手里|脚下|墙上|地上|椅背上|床上|柜子里)[有放摆挂]着[的]?(?:一个|一只|一把|一张|一瓶|一杯)?([^，。！？\s]{1,8})/g;
  while ((m = itemPatterns.exec(allText)) !== null) {
    if (isValidProp(m[1])) props.add(m[1]);
  }

  // ── 推断道具：手机（对话/通话/消息隐含） ──
  if (/(?:打电话|接电话|通话|视频|语音|发消息|发微信|回信息|看屏幕|划开|解锁|回复消息|来[电了]|手机响|铃声|震动|拨出|挂断|来电|去电)/.test(allText)) {
    if (![...props].some(p => p.includes('手机'))) {
      props.add('⌂手机');
    }
  }

  // ── 道具去重合并：去掉末尾方位后缀 ──
  const mergedProps = new Set();
  const positionSuffixes = /[上下面里外内中边缘角顶端底旁后]$/;
  props.forEach(p => {
    // 去掉⌂前缀做比较
    const cleanP = p.replace(/^⌂/, '');
    // 尝试去掉末尾方位词
    const root = cleanP.replace(positionSuffixes, '');
    // 如果去掉后缀后和列表中另一个道具相同 → 保留根道具
    if (root !== cleanP && root.length >= 1) {
      const otherMatch = [...props].find(x =>
        x.replace(/^⌂/, '') === root ||
        (x !== p && x.replace(/^⌂/, '').replace(positionSuffixes, '') === root)
      );
      if (otherMatch) {
        mergedProps.add(otherMatch.replace(/^⌂/, ''));
        return;
      }
    }
    // 如果原道具名以方位词结尾且根名不是独立道具 → 保留原道具
    mergedProps.add(p);
  });

  return [...mergedProps];
}

function isValidProp(word) {
  if (!word || word.length < 1 || word.length > 8) return false;
  // 不是纯标点/数字
  if (/^[\d\s\.\,，。！？、；：""'']+$/.test(word)) return false;

  // 新增：过滤以方位词结尾的位置描述（不是实物道具）
  // "床头/床尾/桌角/窗台上/门后" → 不是道具
  const posSuffix = /[上下面里外内中边缘角顶端底旁后]$/;
  // 单独的位置词（不包含在其他道具中）
  if (posSuffix.test(word) && word.length <= 3) return false;

  // 不是抽象概念/环境/天气/情绪/声音/气味/光线
  const nonEntity = /^(方法|方式|感觉|想法|意见|建议|问题|答案|原因|结果|目的|意义|价值|作用|影响|关系|联系|区别|共同|不同|一样|似的|好像|仿佛|突然|忽然|然后|接着|终于|曾经|已经|正在|将要|可以|能够|必须|需要|应该|一定|必须|可能|大概|也许|或许|阳光|雨水|雨|风|雪|雾|雷电|闪电|冰雹|霜|露水|月光|灯光|日光|树影|影子|天空|地面|空气|气息|气氛|温度|湿度|灰尘|泥土|沙石|声音|回音|脚步声|铃声|鸣笛|鸟叫|虫鸣|风声|雨声|雷声|雪花|气氛|气势|气场|目光|眼神|神情|表情|语气|语调|口气|心情|情绪|念头|思绪|决心|勇气|恐惧|愤怒|悲伤|喜悦|兴奋|忐忑|尴尬|羞涩|愧疚|声音|呼吸|心跳|脉搏|血液|眼泪|汗水|口水|体温|力气|劲儿|香味|臭味|酒味|烟味|香水味|光影|月色|星光|晨光|曙光|余晖|落日|朝阳|晚霞|朝霞|云霞|云雾|白云|乌云|蓝天|星空|夜空|白天|夜晚|时光|光阴|年华|记忆|回忆|思念|孤独|寂静|安静|喧闹|喧哗|吵闹)$/;
  if (nonEntity.test(word)) return false;
  // 不是人名
  if (isChName(word)) return false;
  return true;
}

// ── 关键道具标记 ──
function markKeyProps(scenes) {
  const globalPropCount = {};
  scenes.forEach(s => {
    (s.props || '').split(/[\s、,]+/).filter(Boolean).forEach(p => {
      globalPropCount[p] = (globalPropCount[p] || 0) + 1;
    });
  });

  // ≥2场出现 → 标记为关键道具
  scenes.forEach(s => {
    const props = (s.props || '').split(/[\s、,]+/).filter(Boolean);
    const keyProps = props.filter(p => globalPropCount[p] >= 2);
    if (keyProps.length) {
      s.remark = (s.remark || '') + ' 🔑关键道具: ' + keyProps.join(' ');
    }
  });
}

// 记录实体在原文中的位置
function recordHighlight(map, keyword, text) {
  if (!keyword || keyword.length < 2) return;
  if (map[keyword]) return; // 已记录
  const positions = [];
  let idx = text.indexOf(keyword);
  while (idx !== -1) {
    positions.push([idx, idx + keyword.length]);
    idx = text.indexOf(keyword, idx + 1);
  }
  map[keyword] = positions;
}

// --- 确认面板 ---
function showConfirmPanel(scenes) {
  const panel = document.getElementById('confirm-panel');
  const container = document.getElementById('confirm-scenes');
  const hist = getFieldHistory();

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
        <label>场景</label><input value="${esc(sc.location)}" data-idx="${i}" data-field="location" list="hist-location"><datalist id="hist-location">${(hist.location||[]).map(v=>'<option value="'+esc(v)+'">').join('')}</datalist>
        <label>内/外</label><select data-idx="${i}" data-field="io"><option ${sc.io==='内'?'selected':''}>内</option><option ${sc.io==='外'?'selected':''}>外</option></select>
        <label>日/夜</label><select data-idx="${i}" data-field="dn"><option ${sc.dn==='日'?'selected':''}>日</option><option ${sc.dn==='夜'?'selected':''}>夜</option></select>
        <label>页数</label><input value="${sc.pages}" data-idx="${i}" data-field="pages" style="width:50px;">
      </div>
      <div class="confirm-row">
        <label>内容梗概</label><input value="${esc(sc.summary)}" data-idx="${i}" data-field="summary" style="flex:1;" list="hist-summary"><datalist id="hist-summary">${(hist.summary||[]).map(v=>'<option value="'+esc(v)+'">').join('')}</datalist>
      </div>
      <div class="confirm-row">
        <label>主要角色</label><input value="${esc(sc.mainChars)}" data-idx="${i}" data-field="mainChars" list="hist-mainChars"><datalist id="hist-mainChars">${(hist.mainChars||[]).map(v=>'<option value="'+esc(v)+'">').join('')}</datalist><span class="trace-btn" onclick="traceToSource(${i},'mainChars','')" title="在原文中追溯">📍</span>
        <label>次要角色</label><input value="${esc(sc.minorChars)}" data-idx="${i}" data-field="minorChars" list="hist-minorChars"><datalist id="hist-minorChars">${(hist.minorChars||[]).map(v=>'<option value="'+esc(v)+'">').join('')}</datalist>
      </div>
      <div class="confirm-row">
        <label>道具</label><input value="${esc(sc.props)}" data-idx="${i}" data-field="props" list="hist-props"><datalist id="hist-props">${(hist.props||[]).map(v=>'<option value="'+esc(v)+'">').join('')}</datalist><span class="trace-btn" onclick="traceToSource(${i},'props','')" title="在原文中追溯">📍</span>
        <label>服装</label><input value="${esc(sc.costumes)}" data-idx="${i}" data-field="costumes" list="hist-costumes"><datalist id="hist-costumes">${(hist.costumes||[]).map(v=>'<option value="'+esc(v)+'">').join('')}</datalist>
      </div>
      <div class="confirm-row">
        <label>备注</label><input value="${esc(sc.remark)}" data-idx="${i}" data-field="remark" list="hist-remark"><datalist id="hist-remark">${(hist.remark||[]).map(v=>'<option value="'+esc(v)+'">').join('')}</datalist>
      </div>
      <details class="confirm-raw" id="raw-${i}"><summary>📄 剧本原文（点击角色/道具可追溯）</summary>
        <div class="raw-text-wrap" id="raw-text-${i}" onmouseup="onRawTextSelect(event, ${i})" oncontextmenu="onRawTextSelect(event, ${i});return false;">${renderHighlightedText(sc, i)}</div>
      </details>
    </div>
  `).join('');

  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth' });

  // 重置快捷发送标志
  window._confirmAsSent = false;
}

function confirmAllScenes() {
  const hist = getFieldHistory();
  document.querySelectorAll('#confirm-scenes input, #confirm-scenes select').forEach(el => {
    const idx = parseInt(el.dataset.idx), field = el.dataset.field;
    if (!isNaN(idx) && field && AppBreakdown.scenes[idx]) {
      const val = el.tagName === 'SELECT' ? el.value : el.value;
      AppBreakdown.scenes[idx][field] = val;
      if (field === 'pages') AppBreakdown.scenes[idx].pages = parseFloat(val) || 1;
      // 存入历史
      if (val && field !== 'pages' && !hist[field].includes(val)) {
        hist[field].push(val);
        if (hist[field].length > 20) hist[field].shift();
      }
    }
  });
  saveFieldHistory(hist);
  AppBreakdown.confirmed = true;
  DataHub.importFromBreakdown(AppBreakdown.scenes); // → 中央数据池
  document.getElementById('confirm-panel').style.display = 'none';
  document.getElementById('bd-layout').style.display = 'block';
  document.getElementById('ai-suggest').style.display = 'flex';
  document.getElementById('assistant-bar').style.display = 'block';
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
  DataHub.importShootingDays(days); // → 中央数据池
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
  DataHub.importShootingDays(AppBreakdown.days); // → 数据池同步
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
// URL 分享协作
// ============================================

// Unicode-safe base64 encode
function utoa(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function atou(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

// 导出为分享URL
function shareBreakdown() {
  const data = {
    v: 1, // 版本号
    scenes: AppBreakdown.scenes.map(s => ({
      num: s.num, location: s.location, io: s.io, dn: s.dn,
      pages: s.pages, summary: s.summary,
      mainChars: s.mainChars, minorChars: s.minorChars,
      props: s.props, costumes: s.costumes, remark: s.remark,
      rawText: s.rawText, // 保留原文以便对方也能编辑
      highlights: s.highlights
    })),
    days: AppBreakdown.days
  };

  const json = JSON.stringify(data);
  const encoded = utoa(json);

  // 如果数据太大，裁掉 rawText 再试一次
  if (encoded.length > 1800) {
    data.scenes.forEach(s => { s.rawText = (s.rawText || '').substring(0, 150); });
    const json2 = JSON.stringify(data);
    const encoded2 = utoa(json2);
    if (encoded2.length > 1800) {
      // 仍然太大，提供剪贴板方案
      copyToClipboard(encoded2);
      showToast('数据较大，已复制到剪贴板 📋 发给对方后在"加入项目"中粘贴');
      return;
    }
    const shareUrl = window.location.origin + window.location.pathname + '#import=' + encoded2;
    copyToClipboard(shareUrl);
    showToast('分享链接已复制 📋 发给团队成员即可');
    return;
  }

  const shareUrl = window.location.origin + window.location.pathname + '#import=' + encoded;
  copyToClipboard(shareUrl);
  showToast('分享链接已复制 📋 发给团队成员即可');
}

// 加入协作项目（手动粘贴数据）
function joinProject() {
  const data = prompt('请粘贴分享链接或数据码：');
  if (!data) return;
  // 可能是完整URL或纯数据
  let encoded = data;
  const hashMatch = data.match(/#import=(.+)/);
  if (hashMatch) encoded = hashMatch[1];
  importBreakdownData(encoded);
}

// 从URL自动导入
function autoImportFromURL() {
  const hash = window.location.hash;
  if (!hash.startsWith('#import=')) return false;
  const encoded = hash.substring(8);
  return importBreakdownData(encoded);
}

function importBreakdownData(encoded) {
  try {
    const json = atou(encoded);
    const data = JSON.parse(json);

    if (!data.scenes || !data.scenes.length) {
      showToast('数据无效或为空');
      return false;
    }

    // 确认导入
    const existingCount = AppBreakdown.scenes.length;
    const importCount = data.scenes.length;

    let msg = '发现协作项目：\n' + importCount + ' 场戏';
    if (data.days && data.days.length) msg += '\n' + data.days.length + ' 个拍摄日';
    if (existingCount > 0) msg += '\n\n⚠️ 当前已有 ' + existingCount + ' 场，导入将覆盖现有数据';

    if (!confirm(msg + '\n\n确定导入吗？')) return false;

    // 导入数据
    AppBreakdown.scenes = data.scenes;
    AppBreakdown.days = data.days || [];
    AppBreakdown.confirmed = true;

    saveBreakdownData();

    // 刷新UI
    document.getElementById('bd-layout').style.display = 'block';
    document.getElementById('ai-suggest').style.display = 'flex';
    document.getElementById('assistant-bar').style.display = 'block';
    document.getElementById('confirm-panel').style.display = 'none';
    updateSuggestCard();
    renderSceneTable();
    renderSameLocationTable();
    renderDayPanels();

    // 清理URL hash
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    showToast('已导入 ' + importCount + ' 场 ✅ 可以开始协作编辑了');
    return true;
  } catch(e) {
    showToast('数据解析失败，请检查复制的内容是否完整');
    console.error('Import error:', e);
    return false;
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed'; ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch(e) {}
  document.body.removeChild(ta);
}

// ============================================
// 高亮追溯 + 右键标记
// ============================================

// 渲染带高亮标签的原文
function renderHighlightedText(sc, sceneIdx) {
  let text = esc(sc.rawText);
  const hl = sc.highlights || {};

  // 收集所有高亮位置
  const marks = [];

  // 主要角色高亮 — 蓝色
  Object.entries(hl.mainChars || {}).forEach(([name, positions]) => {
    positions.forEach(([s, e]) => {
      marks.push({ start: s, end: e, name, type: 'char' });
    });
  });

  // 道具高亮 — 橙色
  Object.entries(hl.props || {}).forEach(([name, positions]) => {
    positions.forEach(([s, e]) => {
      marks.push({ start: s, end: e, name, type: 'prop' });
    });
  });

  // 按位置排序（从后往前替换，避免偏移）
  marks.sort((a, b) => b.start - a.start);

  let result = text;
  marks.forEach(m => {
    const cls = m.type === 'char' ? 'hl-char' : 'hl-prop';
    const before = result.substring(0, m.start);
    const highlighted = '<mark class="' + cls + '" data-type="' + m.type + '" data-name="' + esc(m.name) + '" data-scene="' + sceneIdx + '" title="' + (m.type==='char'?'角色':'道具') + ': ' + esc(m.name) + '">' + result.substring(m.start, m.end) + '</mark>';
    const after = result.substring(m.end);
    result = before + highlighted + after;
  });

  return result || text;
}

// 追溯：从表格/表单点击 → 高亮原文
function traceToSource(sceneIdx, fieldType, keyword) {
  // 展开对应场的原文
  const rawDetail = document.getElementById('raw-' + sceneIdx);
  if (rawDetail) rawDetail.open = true;

  // 移除之前的高亮
  document.querySelectorAll('.raw-text-wrap mark.hl-active').forEach(m => m.classList.remove('hl-active'));

  // 高亮匹配的关键词
  setTimeout(() => {
    const wrap = document.getElementById('raw-text-' + sceneIdx);
    if (!wrap) return;
    const marks = wrap.querySelectorAll('mark');
    marks.forEach(m => {
      if (m.dataset.name === keyword || m.textContent.includes(keyword)) {
        m.classList.add('hl-active');
        m.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }, 200);
}

// 右键菜单
let ctxMenu = null;
let _ctxSceneIdx = -1;

function onRawTextSelect(event, sceneIdx) {
  _ctxSceneIdx = sceneIdx;

  // 移除旧菜单
  if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; }

  // 延迟获取选区（等浏览器完成选择）
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = (selection || '').toString().trim();

    if (!selectedText || selectedText.length < 2 || selectedText.length > 15) return;

    // 获取选区位置（用于菜单定位）
    let x = event.pageX, y = event.pageY;
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.bottom + 4;
    }

    ctxMenu = document.createElement('div');
    ctxMenu.className = 'ctx-menu';
    ctxMenu.setAttribute('data-scene', _ctxSceneIdx);
    ctxMenu.setAttribute('data-value', escAttr(selectedText));
    ctxMenu.innerHTML = `
      <div class="ctx-item" data-action="mainChars">👤 添加至主要角色</div>
      <div class="ctx-item" data-action="minorChars">👥 添加至次要角色</div>
      <div class="ctx-item" data-action="props">🎒 标记为道具</div>
      <div class="ctx-item" data-action="costumes">👗 标记为服装</div>
    `;

    // 绑定点击事件
    ctxMenu.querySelectorAll('.ctx-item').forEach(item => {
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        const action = this.dataset.action;
        const val = ctxMenu.getAttribute('data-value');
        const sidx = parseInt(ctxMenu.getAttribute('data-scene'));
        doMarkAsEntity(sidx, action, val);
      });
    });

    ctxMenu.style.left = Math.min(x, window.innerWidth - 170) + 'px';
    ctxMenu.style.top = Math.min(y, window.innerHeight - 160) + 'px';
    document.body.appendChild(ctxMenu);

    // 全局点击关闭
    const closeHandler = function(e) {
      if (ctxMenu && !ctxMenu.contains(e.target)) {
        ctxMenu.remove(); ctxMenu = null;
        document.removeEventListener('click', closeHandler);
        document.removeEventListener('contextmenu', closeHandler);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
      document.addEventListener('contextmenu', closeHandler);
    }, 50);
  }, 50);
}

function doMarkAsEntity(sceneIdx, field, value) {
  if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; }
  const sc = AppBreakdown.scenes[sceneIdx];
  if (!sc) return;

  const existing = (sc[field] || '').split(/[\s、，,\s]+/).filter(Boolean);
  if (!existing.includes(value)) {
    existing.push(value);
    sc[field] = existing.join(' ');
    refreshConfirmInputs();
    saveBreakdownData();
    collectTrainingData(sceneIdx, field, value, sc.rawText);
    showConfirmToast('✅ 已标记: ' + value + ' → ' + ({mainChars:'主要角色',minorChars:'次要角色',props:'道具',costumes:'服装'}[field] || field));
  } else {
    showConfirmToast('⚠️ ' + value + ' 已存在');
  }
}

function markAsEntity(sceneIdx, field, value) {
  doMarkAsEntity(sceneIdx, field, value);
}

function escAttr(s) { return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;'); }

// 训练数据收集
function collectTrainingData(sceneIdx, field, value, rawText) {
  let training = [];
  try { training = JSON.parse(localStorage.getItem('fh_training') || '[]'); } catch(e) {}
  training.push({
    time: new Date().toISOString(),
    sceneIdx, field, value,
    textSnippet: rawText?.substring(0, 300)
  });
  // 只保留最近500条
  if (training.length > 500) training = training.slice(-500);
  localStorage.setItem('fh_training', JSON.stringify(training));
}

// 存储训练数据
function exportTrainingData() {
  const training = JSON.parse(localStorage.getItem('fh_training') || '[]');
  const blob = new Blob([JSON.stringify(training, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'prodlink-training-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('已导出 ' + training.length + ' 条训练数据 📊');
}

// ============================================
// 付费系统（公众版）
// ============================================
let isPaidUser = localStorage.getItem('fh_paid') === '1';

function checkPaidAccess() {
  if (isPaidUser) return true;
  if (dsApiKey && dsApiKey.startsWith('sk-')) return true; // 内测用户
  showPaywall();
  return false;
}

function showPaywall() {
  document.getElementById('paywall-overlay').style.display = 'flex';
}

function closePaywall() {
  document.getElementById('paywall-overlay').style.display = 'none';
}

function simulatePay() {
  // 模拟支付成功（后续接真实支付）
  isPaidUser = true;
  localStorage.setItem('fh_paid', '1');
  closePaywall();
  showToast('🎉 订阅成功！LINK AI 助手已解锁');
  // 如果确认面板打开着，聚焦输入框
  setTimeout(() => {
    const inp = document.getElementById('confirm-as-input');
    if (inp && document.getElementById('confirm-panel').style.display !== 'none') inp.focus();
  }, 500);
}

// 重写 openAssistant 加入付费检查
const _origOpenAssistant = openAssistant;
openAssistant = function() {
  if (!checkPaidAccess()) return;
  _origOpenAssistant();
};

// 修改 analyzeScript 的 AI 调用也检查付费
const _origAnalyzeScript = analyzeScript;
analyzeScript = async function() {
  // 如果有 API Key 直接走（内测用户）
  // 否则检查付费
  return _origAnalyzeScript();
};

// ============================================
// 输入记忆系统
// ============================================
function getFieldHistory() {
  try { return JSON.parse(localStorage.getItem('fh_field_hist')) || {}; } catch(e) { return {}; }
}
function saveFieldHistory(hist) {
  localStorage.setItem('fh_field_hist', JSON.stringify(hist));
}

// ============================================
// 确认面板内 LINK 助手
// ============================================
// ============================================
// API Key 管理
// ============================================
let dsApiKey = localStorage.getItem('fh_ds_key') || '';

function toggleApiKeyInput() {
  const row = document.getElementById('api-key-row');
  row.style.display = row.style.display === 'none' ? 'flex' : 'none';
  if (row.style.display !== 'none') {
    document.getElementById('ds-api-key').value = dsApiKey;
  }
}

function saveApiKey() {
  dsApiKey = document.getElementById('ds-api-key').value.trim();
  if (dsApiKey) {
    localStorage.setItem('fh_ds_key', dsApiKey);
    document.getElementById('api-status').textContent = '✅ 已保存';
    document.getElementById('api-status').style.color = '#2BA471';
  } else {
    localStorage.removeItem('fh_ds_key');
    document.getElementById('api-status').textContent = '已清除';
    document.getElementById('api-status').style.color = '';
  }
}

// 初始化 API key
(function() {
  if (dsApiKey) {
    setTimeout(() => {
      const status = document.getElementById('api-status');
      if (status) { status.textContent = '✅ 已配置'; status.style.color = '#2BA471'; }
    }, 500);
  }
})();

// ============================================
// DeepSeek AI 调用
// ============================================
async function callDeepSeek(userMsg, sceneData) {
  const systemPrompt = `你是一个影视剧本分析助手"LINK小助手"，运行在制片工具Prodlink中。
用户正在审核AI自动提取的剧本场次数据。用户会用自然语言提出修改要求。

当前场次数据（JSON数组）：
${JSON.stringify(sceneData.map(s => ({
  场号:s.num, 场景:s.location, 内外:s.io, 日夜:s.dn,
  页数:s.pages, 内容梗概:s.summary, 主要角色:s.mainChars,
  次要角色:s.minorChars, 道具:s.props, 服装:s.costumes,
  备注:s.remark, 剧本原文:s.rawText?.substring(0,100)
})), null, 2)}

请根据用户消息返回JSON（不要任何其他内容）：
1. 如果是修改请求 → {"action":"update","scenes":[{"num":场号,"field":"字段名","value":"新值"},...],"reply":"简短确认"}
2. 如果是查询请求 → {"action":"reply","reply":"回答内容"}
3. 如果是确认无误 → {"action":"confirm"}
4. 如果无法理解 → {"action":"unknown","reply":"引导用户的话"}

可修改的field: location, io(内/外), dn(日/夜), pages, summary, mainChars, minorChars, props, costumes, remark
如果要修改全部场次，scenes数组里写 {"num":"*","field":"mainChars","value":"妈妈 女儿"} 带上num:"*"`;

  try {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + dsApiKey },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error('API错误 ' + resp.status + ': ' + err.substring(0, 100));
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';
    // 提取JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { action: 'unknown', reply: content };
  } catch(e) {
    return { action: 'error', reply: 'AI调用失败: ' + e.message };
  }
}

// ============================================
// 调度：AI优先，本地兜底
// ============================================
async function sendConfirmCmd() {
  const input = document.getElementById('confirm-as-input');
  const cmd = input.value.trim();
  if (!cmd) return;
  input.value = '';
  input.disabled = true;

  const sc = AppBreakdown.scenes;
  let result = null;

  // 简单确认不走AI
  if (/^(确认|OK|ok|好了|行|没问题|可以|就这样)$/.test(cmd)) {
    saveBreakdownData(); confirmAllScenes(); input.disabled = false; return;
  }

  // 检查权限
  const canUseAI = dsApiKey && dsApiKey.startsWith('sk-');
  const hasAccess = canUseAI || isPaidUser;

  if (!hasAccess) {
    showConfirmToast('💡 LINK AI助手需要订阅（¥8.88/月）或配置API Key');
    showPaywall();
    input.disabled = false;
    return;
  }

  // 有API Key → 走AI（如果是付费用户但没有自己的key，将来走平台key）
  if (canUseAI) {
    showConfirmToast('🤖 AI思考中...');
    result = await callDeepSeek(cmd, sc);
  } else if (isPaidUser) {
    // 付费用户但没有自己的key → 走本地规则（将来走平台统一key时升级为AI）
    // fall through to local
  }

  // 处理AI返回
  if (result) {
    if (result.action === 'confirm') {
      saveBreakdownData(); confirmAllScenes(); input.disabled = false; return;
    }

    if (result.action === 'update' && result.scenes) {
      result.scenes.forEach(upd => {
        if (upd.num === '*') {
          // 全局修改
          sc.forEach(s => { s[upd.field] = upd.value; });
        } else {
          const s = sc.find(x => x.num === String(upd.num) || x.num === upd.num);
          if (s) {
            if (upd.field === 'pages') s[upd.field] = parseFloat(upd.value) || s.pages;
            else s[upd.field] = upd.value;
          }
        }
      });
      refreshConfirmInputs();
      saveBreakdownData();
      showConfirmToast('✅ ' + (result.reply || '已更新'));
      input.disabled = false;
      return;
    }

    if (result.action === 'reply' || result.action === 'unknown') {
      showConfirmToast((result.action==='unknown'?'🤖 ':'') + result.reply);
      input.disabled = false;
      return;
    }

    if (result.action === 'error') {
      // AI失败，走本地
      showConfirmToast('⚠️ ' + result.reply + '，切换到本地处理');
    }
  }

  // 本地规则兜底
  if (!result || result.action === 'error') {
    processLocalCmd(cmd);
  }
  input.disabled = false;
}

// ============================================
// 本地规则处理
// ============================================
function processLocalCmd(cmd) {
  const sc = AppBreakdown.scenes;
  let reply = '';
  let matched = false;

  // 1. 提取场次号（如果有）
  const sceneNumMatch = cmd.match(/第\s*(\d+)\s*场/);
  const targetScene = sceneNumMatch ? sc.find(s => s.num === sceneNumMatch[1]) : null;

  // 2. 提取角色名（中文2-3字+可能跟在"角色"/"演员"后面、"是"/"有"后面）
  const namedEntities = extractNames(cmd); // 提取所有可能的人名/物品名

  // 3. 意图识别

  // "主角/主要角色 是/只有/应该是 XXX"
  if (/主角|主要角色|主演/.test(cmd) && /是|只有|有|应该|包括/.test(cmd)) {
    let names = [];
    // 提取"是XXX"后面的内容
    const afterIs = cmd.match(/(?:是|只有|有|应该|包括)[：:\s]*(.+)/);
    if (afterIs) names = afterIs[1].split(/[、，,和\s与跟及]+/).filter(Boolean).filter(n => n.length <= 4);
    if (!names.length) names = namedEntities;

    if (targetScene) {
      // 只改特定场
      targetScene.mainChars = [...new Set([...(targetScene.mainChars||'').split(/[\s、,]+/).filter(Boolean), ...names])].join(' ');
      reply = '✅ 场' + targetScene.num + ' 主角加上：' + names.join('、');
    } else {
      // 全部场
      sc.forEach(s => {
        if (!s.mainChars) s.mainChars = '';
        names.forEach(n => { if (!s.mainChars.includes(n)) s.mainChars += ' ' + n; });
        s.mainChars = s.mainChars.trim();
      });
      reply = '✅ 全部场次主角加上：' + names.join('、');
    }
    refreshConfirmInputs(); matched = true;
  }

  // "配角/次要角色 是..."
  else if (/配角|次要角色/.test(cmd) && /是|只有|有|应该|包括/.test(cmd)) {
    const afterIs = cmd.match(/(?:是|只有|有|应该|包括)[：:\s]*(.+)/);
    let names = afterIs ? afterIs[1].split(/[、，,和\s与跟及]+/).filter(Boolean).filter(n => n.length <= 4) : namedEntities;
    if (targetScene) {
      targetScene.minorChars = [...new Set([...(targetScene.minorChars||'').split(/[\s、,]+/).filter(Boolean), ...names])].join(' ');
      reply = '✅ 场' + targetScene.num + ' 配角加上：' + names.join('、');
    } else {
      sc.forEach(s => {
        if (!s.minorChars) s.minorChars = '';
        names.forEach(n => { if (!s.minorChars.includes(n)) s.minorChars += ' ' + n; });
        s.minorChars = s.minorChars.trim();
      });
      reply = '✅ 全部场次配角加上：' + names.join('、');
    }
    refreshConfirmInputs(); matched = true;
  }

  // "主题/题材 是 XXX" → 全部场次内容梗概补充
  else if (/主题|题材|基调|风格/.test(cmd) && /是|为|属于/.test(cmd)) {
    const m = cmd.match(/(?:是|为|属于)[：:\s]*(.+)/);
    if (m) {
      sc.forEach(s => { s.remark = (s.remark||'') + ' 主题:' + m[1].trim(); });
      refreshConfirmInputs();
      reply = '✅ 已标注主题：' + m[1].trim();
      matched = true;
    }
  }

  // "场景/地点 应该/是 XXX" → 改全部或特定场的场景名
  else if (/场景|地点|位置/.test(cmd) && /是|应该|改|换成/.test(cmd)) {
    const m = cmd.match(/(?:是|应该|改|换成)[：:\s]*(.+)/);
    if (m) {
      const newLoc = m[1].replace(/[了吧呢啊]$/,'').trim();
      if (targetScene) {
        targetScene.location = newLoc;
        reply = '✅ 场' + targetScene.num + ' 场景改为：' + newLoc;
      } else {
        reply = '💡 请指定场次，如"第3场场景是客厅"';
        // 智能猜测：如果只有1个场景地，全改
        const locs = new Set(sc.map(s => s.location));
        if (locs.size <= 2) {
          sc.forEach(s => { s.location = newLoc; });
          reply = '✅ 全部场景改为：' + newLoc;
        }
      }
      refreshConfirmInputs(); matched = true;
    }
  }

  // "不对/不是/应该/改成" → 纠错模式
  else if (/不对|不是|错了|应该是|改成|改为/.test(cmd)) {
    // 尝试理解用户在纠正什么
    // "不对，XXX应该是YYY"
    const correctMatch = cmd.match(/(?:不是|应该是|改成|改为)[：:\s]*(.+)/);
    if (correctMatch) {
      const rest = correctMatch[1];

      // "XXX应该是YYY"
      const rMatch = rest.match(/(.+?)(?:应该)?(?:是|为|改成)(.+)/);
      if (rMatch) {
        const from = rMatch[1].trim(), to = rMatch[2].trim();
        let cnt = 0;
        sc.forEach(s => {
          ['location','summary','mainChars','minorChars','props','costumes','remark'].forEach(f => {
            if (s[f] && s[f].includes(from)) { s[f] = s[f].replace(new RegExp(from,'g'), to); cnt++; }
          });
        });
        refreshConfirmInputs();
        reply = cnt ? '✅ 已将所有 "' + from + '" 改为 "' + to + '"（' + cnt + '处）'
                    : '🤔 没找到 "' + from + '"，它出现在哪一场？试试"第X场' + from + '改成' + to + '"';
        matched = true;
      }
    }

    // "不对，第X场应该是..."
    if (!matched && targetScene && /应该是|改成|不对/.test(cmd)) {
      const after = cmd.replace(/.*?(?:应该是|改成|不对)[，,\s]*/, '');
      // 尝试解析
      if (/夜/.test(after)) { targetScene.dn = '夜'; reply = '✅ 场' + targetScene.num + ' 改为夜戏'; matched = true; }
      if (/日/.test(after)) { targetScene.dn = '日'; }
      if (/外/.test(after)) { targetScene.io = '外'; reply = (reply||'✅') + ' 场' + targetScene.num + ' 外景'; }
      if (/内/.test(after)) { targetScene.io = '内'; }
      if (matched) refreshConfirmInputs();
    }
  }

  // 第X场 具体修改
  if (!matched && targetScene) {
    const rest = cmd.replace(/第\s*\d+\s*场\s*/, '');
    if (/夜/.test(rest)) { targetScene.dn = '夜'; reply = '✅ 场' + targetScene.num + ' → 夜戏'; matched = true; }
    else if (/日/.test(rest)) { targetScene.dn = '日'; reply = '✅'; matched = true; }
    if (/外/.test(rest)) { targetScene.io = '外'; reply = (reply||'✅') + ' 场' + targetScene.num + ' → 外景'; matched = true; }
    else if (/内/.test(rest)) { targetScene.io = '内'; reply = (reply||'✅'); matched = true; }

    const locM = rest.match(/(?:场景|地点|改成|改为)[：:\s]*([^\s，。]{2,10})/);
    if (locM) { targetScene.location = locM[1]; reply = '✅ 场' + targetScene.num + ' 场景 → ' + locM[1]; matched = true; }

    const addCM = rest.match(/(?:加|增加|添|添加)\s*角色\s*([^\s，。]+)/);
    if (addCM) {
      targetScene.mainChars = targetScene.mainChars ? targetScene.mainChars + ' ' + addCM[1] : addCM[1];
      reply = '✅ 场' + targetScene.num + ' 加角色：' + addCM[1]; matched = true;
    }

    const addPM = rest.match(/(?:加|增加|添|添加)\s*道具\s*([^\s，。]+)/);
    if (addPM) {
      targetScene.props = targetScene.props ? targetScene.props + ' ' + addPM[1] : addPM[1];
      reply = '✅ 场' + targetScene.num + ' 加道具：' + addPM[1]; matched = true;
    }

    const addCstM = rest.match(/(?:加|增加|添|添加)\s*服装\s*([^\s，。]+)/);
    if (addCstM) {
      targetScene.costumes = targetScene.costumes ? targetScene.costumes + ' ' + addCstM[1] : addCstM[1];
      reply = '✅ 场' + targetScene.num + ' 加服装：' + addCstM[1]; matched = true;
    }

    if (matched) refreshConfirmInputs();
  }

  // 全局 "加道具/服装 XXX"
  if (!matched) {
    const gProp = cmd.match(/^[加添]\s*道具\s*(.+)/);
    if (gProp) {
      sc.forEach(s => { s.props = s.props ? s.props + ' ' + gProp[1] : gProp[1]; });
      refreshConfirmInputs(); reply = '✅ 全部场次加道具：' + gProp[1]; matched = true;
    }
    const gCost = cmd.match(/^[加添]\s*服装\s*(.+)/);
    if (gCost) {
      sc.forEach(s => { s.costumes = s.costumes ? s.costumes + ' ' + gCost[1] : gCost[1]; });
      refreshConfirmInputs(); reply = '✅ 全部场次加服装：' + gCost[1]; matched = true;
    }
  }

  // 全局替换
  if (!matched) {
    const allR = cmd.match(/所有\s*"?([^\s"]+)"?\s*[改换替换]\s*(?:成|为)?\s*"?([^\s"]+)"?/);
    if (allR) {
      let cnt = 0;
      sc.forEach(s => {
        ['location','summary','mainChars','minorChars','props','costumes','remark'].forEach(f => {
          if (s[f] && s[f].includes(allR[1])) { s[f] = s[f].replace(new RegExp(allR[1],'g'), allR[2]); cnt++; }
        });
      });
      refreshConfirmInputs(); reply = '✅ ' + cnt + '处 "' + allR[1] + '" → "' + allR[2] + '"'; matched = true;
    }
  }

  // "删除/去掉 角色/道具 XXX"
  if (!matched) {
    const delR = cmd.match(/(?:删除|去掉|移除)\s*(?:角色|道具|服装)?\s*([^\s，。]+)/);
    if (delR) {
      let cnt = 0;
      sc.forEach(s => {
        ['mainChars','minorChars','props','costumes'].forEach(f => {
          if (s[f] && s[f].includes(delR[1])) {
            s[f] = s[f].replace(new RegExp('\\s*'+delR[1]+'\\s*','g'), ' ').trim(); cnt++;
          }
        });
      });
      refreshConfirmInputs(); reply = '✅ 已删除 ' + cnt + ' 处：' + delR[1]; matched = true;
    }
  }

  // 列出查询
  if (!matched) {
    if (/列出|显示|查看/.test(cmd) && /角色/.test(cmd)) {
      const all = new Set(); sc.forEach(s => (s.mainChars||'').split(/[\s、,]+/).filter(Boolean).forEach(c => all.add(c)));
      reply = '👥 角色：' + (Array.from(all).join('、') || '无'); matched = true;
    }
    if (/列出|显示|查看/.test(cmd) && /道具/.test(cmd)) {
      const all = new Set(); sc.forEach(s => (s.props||'').split(/[\s、,]+/).filter(Boolean).forEach(p => all.add(p)));
      reply = '🎒 道具：' + (Array.from(all).join('、') || '无'); matched = true;
    }
    if (/列出|显示|查看/.test(cmd) && /服装/.test(cmd)) {
      const all = new Set(); sc.forEach(s => (s.costumes||'').split(/[\s、,]+/).filter(Boolean).forEach(c => all.add(c)));
      reply = '👗 服装：' + (Array.from(all).join('、') || '无'); matched = true;
    }
  }

  // 没匹配到 → 智能兜底
  if (!matched) {
    // 尝试通用关键词搜索
    const keywords = cmd.replace(/[的了吗呢啊吧是很有应该不对不是改成改为第\d+场]/g,' ').split(/[\s，。！？、]+/).filter(Boolean).filter(w => w.length >= 2);
    if (keywords.length && namedEntities.length) {
      // 尝试把提取到的人名加为角色
      sc.forEach(s => {
        namedEntities.forEach(n => {
          if (s.rawText && s.rawText.includes(n) && !(s.mainChars||'').includes(n)) {
            s.mainChars = s.mainChars ? s.mainChars + ' ' + n : n;
          }
        });
      });
      refreshConfirmInputs();
      reply = '🤔 我尝试把 "' + namedEntities.join('、') + '" 添加为角色，<br>如有误请说"删除角色XXX"<br>或指定场次"第X场角色XXX"';
    } else {
      reply = '🤔 试试：<br>· "主角是妈妈和女儿"<br>· "第3场夜外"<br>· "不对，张三应该是张总"<br>· "删掉李四"<br>· "确认"';
    }
  }

  showConfirmToast(reply);
  saveBreakdownData();
}

// 从文本中提取可能的中文人名
function extractNames(text) {
  const names = [];
  // 匹配 "XX和YY" "XX、YY" 等
  const patterns = [
    /(?:是|只有|有|包括)[：:\s]*([^\s，。！？]{2,4})/g,
    /([^\s，。！？]{2,3})[和与跟及]([^\s，。！？]{2,3})/g,
    /[、，]([^\s，。！？\d]{2,3})(?=[、，。！？\s]|$)/g,
  ];
  patterns.forEach(p => {
    let m;
    while ((m = p.exec(text)) !== null) {
      for (let i = 1; i < m.length; i++) {
        const n = m[i].trim();
        if (n.length >= 2 && n.length <= 4 && !/^(是|有|应该|不对|不是|改成|改为|第\d|确认|OK|好了)$/i.test(n)) {
          names.push(n);
        }
      }
    }
  });
  return [...new Set(names)];
}

function refreshConfirmInputs() {
  const sc = AppBreakdown.scenes;
  document.querySelectorAll('#confirm-scenes input[data-field]').forEach(el => {
    const idx = parseInt(el.dataset.idx), field = el.dataset.field;
    if (!isNaN(idx) && field && sc[idx]) {
      el.value = sc[idx][field] || '';
    }
  });
}

function showConfirmToast(msg) {
  // 在确认面板底部显示反馈
  let el = document.getElementById('confirm-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'confirm-toast';
    el.style.cssText = 'margin-top:8px;padding:8px 14px;background:#F0F4FF;border-radius:6px;font-size:0.78rem;line-height:1.5;';
    document.querySelector('.confirm-assistant').after(el);
  }
  el.innerHTML = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

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
