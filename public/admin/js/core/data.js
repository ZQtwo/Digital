/**
 * data.js —— 数据源（products / categories / coupons / reviews + helpers）
 * 与 Vue 版 _vue_backup/src/data/* 字段完全一致。
 */
(function (global) {
  var categories = [
    { id: 'P01', name: '手机通讯', art: 'phone' },
    { id: 'C01', name: '电脑整机', art: 'laptop' },
    { id: 'A01', name: '影音娱乐', art: 'headphone' },
    { id: 'W01', name: '智能穿戴', art: 'watch' },
    { id: 'M01', name: '摄影摄像', art: 'camera' },
    { id: 'R01', name: '外设配件', art: 'keyboard' },
    { id: 'S01', name: '存储网络', art: 'ssd' }
  ];
  var priceBands = [
    { label: '¥0 – 999', min: 0, max: 999 },
    { label: '¥1,000 – 2,999', min: 1000, max: 2999 },
    { label: '¥3,000 – 5,999', min: 3000, max: 5999 },
    { label: '¥6,000 – 9,999', min: 6000, max: 9999 },
    { label: '¥10,000 以上', min: 10000, max: Infinity }
  ];
  var sortOptions = [
    { value: 'recommend', label: '综合排序' },
    { value: 'sales', label: '销量优先' },
    { value: 'price-asc', label: '价格从低到高' },
    { value: 'price-desc', label: '价格从高到低' },
    { value: 'rating', label: '评分优先' },
    { value: 'new', label: '最新上架' }
  ];
  var brandList = [
    'VOLTA', 'ORBIT 星环', 'CELSIUM 铯原', 'AURORA 极光',
    'BASALT 磐石', 'PRISM 棱镜', 'NEBULA 星云', 'KESTREL 红隼'
  ];

  var C = {
    black: '曜石黑', silver: '月岩银', white: '极地白', gray: '钛空灰',
    blue: '深空蓝', orange: '熔岩橙', green: '苔原绿'
  };

  var products = [
    { id: 'p01', name: 'VOLTA X9 Pro 旗舰影像手机', brand: 'VOLTA', category: 'P01', art: 'phone', artSeed: 1,
      price: 6499, listPrice: 7299, rating: 4.8, ratingCount: 3821, sales: 12480, stock: 96,
      tags: ['一英寸主摄', '骁龙旗舰芯', '120W 快充'],
      highlights: ['1 英寸大底主摄 + 潜望长焦', '6.8" 2K LTPO 直屏，1–120Hz 自适应', '5400mAh 电池 + 120W 有线快充'],
      desc: 'X9 Pro 把一英寸主摄塞进 8.4mm 机身，配合自研夜景引擎，弱光成片率提升 47%。全系标配 120W 快充，19 分钟回血 80%。',
      options: [
        { name: '配色', values: [{ label: C.black }, { label: C.silver }, { label: C.orange }] },
        { name: '版本', values: [{ label: '12+256GB' }, { label: '16+512GB', delta: 700 }, { label: '16GB+1TB', delta: 1600 }] }
      ],
      specs: { '屏幕': '6.8" 2K LTPO 直屏 / 1–120Hz', '处理器': '骁龙旗舰 8 系（3nm）', '主摄': '1" 5000 万像素 OIS', '电池': '5400mAh / 120W 有线 / 50W 无线', '重量': '221g', '防护': 'IP68' } },
    { id: 'p02', name: 'VOLTA X9 轻旗舰手机', brand: 'VOLTA', category: 'P01', art: 'phone', artSeed: 2,
      price: 3999, listPrice: 4299, rating: 4.6, ratingCount: 2140, sales: 20360, stock: 154,
      tags: ['轻薄机身', '直屏手感'],
      highlights: ['6.36" 黄金手感小直屏', '5000 万像素双摄', '4800mAh + 80W 快充'],
      desc: '168g 的轻薄机身，单手可握。兼顾日常续航与影像，适合长期握持的使用者。',
      options: [
        { name: '配色', values: [{ label: C.black }, { label: C.white }, { label: C.blue }] },
        { name: '版本', values: [{ label: '12+256GB' }, { label: '12+512GB', delta: 500 }] }
      ],
      specs: { '屏幕': '6.36" 1.5K 直屏 / 120Hz', '处理器': '次旗舰 8 系', '主摄': '5000 万像素 OIS', '电池': '4800mAh / 80W', '重量': '168g', '防护': 'IP68' } },
    { id: 'p03', name: 'ORBIT Note 12 长续航手机', brand: 'ORBIT 星环', category: 'P01', art: 'phone', artSeed: 3,
      price: 1499, listPrice: 1799, rating: 4.4, ratingCount: 5602, sales: 48210, stock: 320,
      tags: ['入门首选', '6000mAh'],
      highlights: ['6000mAh 大电池，两天一充', '6.7" 高刷护眼屏', '支持 33W 快充'],
      desc: '把续航做到极致，重度使用也能撑满两天。适合备用机与长辈机场景。',
      options: [
        { name: '配色', values: [{ label: C.black }, { label: C.blue }] },
        { name: '版本', values: [{ label: '8+128GB' }, { label: '8+256GB', delta: 300 }] }
      ],
      specs: { '屏幕': '6.7" FHD+ / 120Hz', '处理器': '中端 7 系', '主摄': '5000 万像素', '电池': '6000mAh / 33W', '重量': '199g', '防护': 'IP54' } },
    { id: 'p04', name: 'CELSIUM Fold 折叠屏手机', brand: 'CELSIUM 铯原', category: 'P01', art: 'phone', artSeed: 4,
      price: 12999, listPrice: 13999, rating: 4.5, ratingCount: 806, sales: 2140, stock: 28,
      tags: ['折叠屏', '轻薄铰链'],
      highlights: ['8.0" 内屏 + 6.5" 外屏', '第五代水滴铰链，折痕更浅', '多任务分屏与手写笔支持'],
      desc: '展开即平板，合起即手机。铰链寿命 50 万次，支持多窗口并行处理。',
      options: [
        { name: '配色', values: [{ label: C.black }, { label: C.silver }] },
        { name: '版本', values: [{ label: '16+512GB' }, { label: '16GB+1TB', delta: 1200 }] }
      ],
      specs: { '内屏': '8.0" 2K 折叠屏 / 120Hz', '外屏': '6.5" FHD+ / 120Hz', '处理器': '旗舰 8 系', '电池': '4800mAh / 67W', '折叠厚度': '9.9mm', '重量': '239g' } },
    { id: 'p05', name: 'VOLTA Book Air 14 轻薄本', brand: 'VOLTA', category: 'C01', art: 'laptop', artSeed: 1,
      price: 5699, listPrice: 6299, rating: 4.7, ratingCount: 1673, sales: 8320, stock: 74,
      tags: ['1.19kg', '长续航', '2.8K OLED'],
      highlights: ['1.19kg 全金属机身', '14" 2.8K 120Hz OLED 屏', '70Wh 电池，续航 14 小时'],
      desc: '为通勤与差旅设计的轻薄本，OLED 屏覆盖 100% DCI-P3，适合设计校对与文档办公。',
      options: [
        { name: '配色', values: [{ label: C.silver }, { label: C.gray }] },
        { name: '配置', values: [{ label: '16G+512G' }, { label: '32G+1T', delta: 1200 }] }
      ],
      specs: { '屏幕': '14" 2.8K OLED / 120Hz', '处理器': '酷睿 Ultra 7', '内存': '16GB LPDDR5X', '硬盘': '512GB PCIe 4.0 SSD', '电池': '70Wh', '重量': '1.19kg' } },
    { id: 'p06', name: 'AURORA Studio 16 创作本', brand: 'AURORA 极光', category: 'C01', art: 'laptop', artSeed: 2,
      price: 12999, listPrice: 14499, rating: 4.8, ratingCount: 942, sales: 3260, stock: 41,
      tags: ['独显创作', '色准 ΔE<1', '雷电接口'],
      highlights: ['16" 4K Mini-LED 屏，ΔE<1', '专业独显 + 双风扇六热管', '双雷电 4 + HDMI 2.1'],
      desc: '面向视频剪辑与三维渲染的创作本，出厂逐台校色，附校色报告。',
      options: [
        { name: '配色', values: [{ label: C.gray }, { label: C.black }] },
        { name: '配置', values: [{ label: '32G+1T' }, { label: '64G+2T', delta: 3200 }] }
      ],
      specs: { '屏幕': '16" 4K Mini-LED / 120Hz', '处理器': '酷睿 Ultra 9', '显卡': '创作级独显 12GB', '内存': '32GB DDR5', '硬盘': '1TB PCIe 4.0 SSD', '重量': '1.92kg' } },
    { id: 'p07', name: 'BASALT 磐石 R7 游戏本', brand: 'BASALT 磐石', category: 'C01', art: 'laptop', artSeed: 3,
      price: 9499, listPrice: 10499, rating: 4.5, ratingCount: 1284, sales: 5410, stock: 63,
      tags: ['240Hz', '满血显卡', '液金散热'],
      highlights: ['16" 2.5K 240Hz 电竞屏', '满血功耗释放 + 液金导热', '四区 RGB 背光键盘'],
      desc: '把桌面级性能塞进 2.3kg 机身，支持独显直连与一键狂暴模式。',
      options: [
        { name: '配色', values: [{ label: C.black }] },
        { name: '配置', values: [{ label: '16G+1T' }, { label: '32G+2T', delta: 2000 }] }
      ],
      specs: { '屏幕': '16" 2.5K / 240Hz', '处理器': '锐龙 9 系', '显卡': '满血独显 12GB', '内存': '16GB DDR5 5600', '硬盘': '1TB PCIe 4.0 SSD', '重量': '2.34kg' } },
    { id: 'p08', name: 'VOLTA Mini 主机办公套装', brand: 'VOLTA', category: 'C01', art: 'console', artSeed: 1,
      price: 2999, listPrice: 3299, rating: 4.4, ratingCount: 620, sales: 4180, stock: 88,
      tags: ['0.9L 体积', '静音', '含键鼠'],
      highlights: ['0.9L 迷你体积，可挂显示器背面', '满载噪音 < 28dB', '随机附赠无线键鼠套装'],
      desc: '放在显示器背后就消失的主机，适合工位与前台等对整洁度要求高的场景。',
      options: [{ name: '配置', values: [{ label: '16G+512G' }, { label: '32G+1T', delta: 900 }] }],
      specs: { '体积': '0.9L', '处理器': '移动版 7 系', '内存': '16GB DDR5', '硬盘': '512GB NVMe', '接口': '双 HDMI + 四 USB-A', '噪音': '≈27dB' } },
    { id: 'p09', name: 'PRISM Pad 12 平板电脑', brand: 'PRISM 棱镜', category: 'C01', art: 'tablet', artSeed: 1,
      price: 3299, listPrice: 3599, rating: 4.6, ratingCount: 1502, sales: 9740, stock: 132,
      tags: ['12.1" 144Hz', '手写笔', '多屏协同'],
      highlights: ['12.1" 2.8K 144Hz 屏', '支持 4096 级压感手写笔', '与手机 / 电脑多屏协同'],
      desc: '既是电子笔记，也是第二块屏幕。支持磁吸键盘与压感笔，会议记录效率翻倍。',
      options: [
        { name: '配色', values: [{ label: C.silver }, { label: C.green }] },
        { name: '版本', values: [{ label: '8+256GB  WiFi' }, { label: '12+512GB 5G', delta: 1100 }] }
      ],
      specs: { '屏幕': '12.1" 2.8K / 144Hz', '处理器': '旗舰平板芯', '电池': '10000mAh / 45W', '扬声器': '四扬声器', '重量': '588g', '配件': '磁吸键盘 / 压感笔（选配）' } },
    { id: 'p10', name: 'NEBULA Buds Pro 降噪耳机', brand: 'NEBULA 星云', category: 'A01', art: 'earbuds', artSeed: 1,
      price: 999, listPrice: 1299, rating: 4.7, ratingCount: 8942, sales: 68200, stock: 410,
      tags: ['48dB 降噪', '空间音频', '无线充电'],
      highlights: ['最高 48dB 主动降噪', '双单元同轴发声', '单次 8h，总续航 38h'],
      desc: '降噪深度与耳压感做了重新平衡，长时间佩戴不闷。支持头部追踪空间音频。',
      options: [
        { name: '配色', values: [{ label: C.white }, { label: C.black }] },
        { name: '版本', values: [{ label: '标准版' }, { label: '无线充电盒', delta: 200 }] }
      ],
      specs: { '单元': '11mm 动圈 + 平板高音', '降噪': '最高 48dB 自适应', '续航': '8h / 38h（含充电盒）', '蓝牙': '5.4 / LDAC', '防护': 'IP54', '重量': '单耳 4.6g' } },
    { id: 'p11', name: 'AURORA H1 头戴降噪耳机', brand: 'AURORA 极光', category: 'A01', art: 'headphone', artSeed: 1,
      price: 2199, listPrice: 2499, rating: 4.8, ratingCount: 3260, sales: 14300, stock: 118,
      tags: ['Hi-Res', '60h 续航', '舒适头梁'],
      highlights: ['40mm 镀铍振膜单元', '开启降噪续航 60 小时', '280g 轻量头梁结构'],
      desc: '适合长途飞行与开放办公，佩戴压力分散设计，连续佩戴四小时无压耳感。',
      options: [{ name: '配色', values: [{ label: C.black }, { label: C.silver }, { label: C.blue }] }],
      specs: { '单元': '40mm 镀铍振膜', '频响': '4Hz – 40kHz（Hi-Res 认证）', '降噪': '自适应主动降噪', '续航': '60h（降噪开启）', '重量': '280g', '充电': 'USB-C / 快充 10min = 6h' } },
    { id: 'p12', name: 'KESTREL Sound 便携音箱', brand: 'KESTREL 红隼', category: 'A01', art: 'speaker', artSeed: 1,
      price: 699, listPrice: 899, rating: 4.5, ratingCount: 2140, sales: 18700, stock: 205,
      tags: ['IPX7 防水', '双箱串联', '24h 续航'],
      highlights: ['IPX7 级防水，可户外淋雨', '双箱 TWS 串联成立体声', '24 小时连续播放'],
      desc: '为露营与浴室设计的便携音箱，支持反向给手机应急充电。',
      options: [{ name: '配色', values: [{ label: C.orange }, { label: C.black }, { label: C.green }] }],
      specs: { '功率': '2 × 20W', '防水': 'IPX7', '续航': '24h', '蓝牙': '5.3', '重量': '680g', '附加': '支持反向充电' } },
    { id: 'p13', name: 'NEBULA Watch S3 智能手表', brand: 'NEBULA 星云', category: 'W01', art: 'watch', artSeed: 1,
      price: 1599, listPrice: 1799, rating: 4.6, ratingCount: 4120, sales: 22600, stock: 176,
      tags: ['血氧监测', '双频 GPS', '14 天续航'],
      highlights: ['1.43" AMOLED 常亮屏', '双频五星定位，越野更准', '典型场景 14 天续航'],
      desc: '面向跑步与骑行人群，支持 120+ 运动模式与专业训练负荷分析。',
      options: [
        { name: '配色', values: [{ label: C.black }, { label: C.silver }] },
        { name: '表带', values: [{ label: '氟橡胶' }, { label: '真皮', delta: 200 }, { label: '钛金属', delta: 600 }] }
      ],
      specs: { '屏幕': '1.43" AMOLED 常亮', '定位': '双频五星 GNSS', '健康': '心率 / 血氧 / 睡眠 / 压力', '续航': '14 天（典型）/ 30 天（长续航）', '防水': '5ATM', '重量': '36g（不含表带）' } },
    { id: 'p14', name: 'VOLTA Band 8 智能手环', brand: 'VOLTA', category: 'W01', art: 'watch', artSeed: 2,
      price: 269, listPrice: 329, rating: 4.4, ratingCount: 15200, sales: 98400, stock: 520,
      tags: ['轻量', '睡眠监测', '18 天续航'],
      highlights: ['仅 15g，睡觉无感', '睡眠呼吸暂停筛查', '18 天超长续航'],
      desc: '入门手环的性价比之选，重点优化睡眠与心率监测的夜间准确性。',
      options: [{ name: '配色', values: [{ label: C.black }, { label: C.blue }, { label: C.orange }] }],
      specs: { '屏幕': '1.62" AMOLED', '健康': '心率 / 血氧 / 睡眠', '续航': '18 天', '防水': '5ATM', '重量': '15g', '充电': '磁吸' } },
    { id: 'p15', name: 'PRISM Glass AR 智能眼镜', brand: 'PRISM 棱镜', category: 'W01', art: 'vr', artSeed: 1,
      price: 4299, listPrice: 4799, rating: 4.2, ratingCount: 386, sales: 1180, stock: 22,
      tags: ['AR 抬头显示', '语音助手', '轻量 78g'],
      highlights: ['单目 AR 抬头显示，导航直投视野', '78g 轻量镜架', '内置语音助手与骨传导扬声器'],
      desc: '把导航与消息提示放在视野角落，骑行与步行时无需掏出手机。',
      options: [{ name: '配色', values: [{ label: C.black }, { label: C.gray }] }],
      specs: { '显示': '单目 Micro-OLED 抬头显示', '交互': '触控镜腿 + 语音', '音频': '骨传导开放式', '重量': '78g', '续航': '6h（混合使用）', '防护': 'IPX4' } },
    { id: 'p16', name: 'CELSIUM M50 全画幅微单', brand: 'CELSIUM 铯原', category: 'M01', art: 'camera', artSeed: 1,
      price: 15999, listPrice: 16999, rating: 4.9, ratingCount: 742, sales: 1860, stock: 19,
      tags: ['全画幅', '8K 视频', '机身防抖'],
      highlights: ['4500 万像素全画幅背照式传感器', '8K30 / 4K120 视频录制', '机身五轴防抖 8 档'],
      desc: '兼顾高像素静态与高帧率视频，支持 14 档动态范围与双原生 ISO。',
      options: [{ name: '套装', values: [{ label: '单机身' }, { label: '+24-70 F2.8 镜头', delta: 9800 }] }],
      specs: { '传感器': '4500 万像素全画幅背照式', '视频': '8K30 / 4K120 10bit', '防抖': '机身五轴 8 档', '对焦': '759 点相位检测', '卡槽': 'CFexpress + SD 双卡', '重量': '658g' } },
    { id: 'p17', name: 'KESTREL Action 5 运动相机', brand: 'KESTREL 红隼', category: 'M01', art: 'camera', artSeed: 2,
      price: 2299, listPrice: 2599, rating: 4.7, ratingCount: 3260, sales: 12400, stock: 143,
      tags: ['5.3K', '极致防抖', '裸机防水'],
      highlights: ['5.3K60 视频录制', '增强防抖 3.0，骑行无糊', '裸机 10m 防水'],
      desc: '免壳下水，磁吸快拆，一按即录。配双屏便于自拍构图。',
      options: [{ name: '套装', values: [{ label: '标准套装' }, { label: '续航套装（含双电池）', delta: 350 }] }],
      specs: { '视频': '5.3K60 / 4K120', '防抖': '增强防抖 3.0', '防水': '裸机 10m', '屏幕': '前后双彩屏', '电池': '1800mAh', '重量': '154g' } },
    { id: 'p18', name: 'VOLTA Vision 4K 智能投影仪', brand: 'VOLTA', category: 'M01', art: 'projector', artSeed: 1,
      price: 3599, listPrice: 3999, rating: 4.4, ratingCount: 982, sales: 5240, stock: 67,
      tags: ['4K 激光', '自动对焦', '梯形校正'],
      highlights: ['真 4K 激光光源，2200 CVIA 流明', '全自动对焦 + 六向梯形校正', '内置 2×15W 音响'],
      desc: '客厅替代电视的方案，支持侧投与自动避障，摆在哪都能投正。',
      options: [{ name: '版本', values: [{ label: '标准版' }, { label: 'Pro（更高亮度）', delta: 900 }] }],
      specs: { '分辨率': '3840 × 2160', '光源': '激光 / 2200 CVIA 流明', '投射比': '1.2 : 1', '校正': '全自动六向梯形', '音响': '2 × 15W', '噪音': '< 26dB' } },
    { id: 'p19', name: 'PRISM K87 机械键盘', brand: 'PRISM 棱镜', category: 'R01', art: 'keyboard', artSeed: 1,
      price: 599, listPrice: 699, rating: 4.7, ratingCount: 6250, sales: 31800, stock: 260,
      tags: ['三模连接', '热插拔', 'Gasket 结构'],
      highlights: ['有线 / 2.4G / 蓝牙三模', '全键热插拔，随时换轴', 'Gasket 结构与五层消音'],
      desc: '打字音更闷更集中，适合办公室与深夜使用。支持三设备快速切换。',
      options: [
        { name: '轴体', values: [{ label: '线性红轴' }, { label: '段落茶轴', delta: 40 }, { label: '静音轴', delta: 90 }] },
        { name: '配列', values: [{ label: '87 键' }, { label: '75 键', delta: 0 }] }
      ],
      specs: { '连接': '有线 / 2.4G / 蓝牙 5.2', '结构': 'Gasket + 五层消音', '键帽': 'PBT 二色成型', '电池': '4000mAh', '灯效': 'RGB 单键背光', '重量': '980g' } },
    { id: 'p20', name: 'ORBIT M4 无线游戏鼠标', brand: 'ORBIT 星环', category: 'R01', art: 'mouse', artSeed: 1,
      price: 399, listPrice: 469, rating: 4.6, ratingCount: 4820, sales: 27600, stock: 300,
      tags: ['55g 轻量', '26K DPI', '双模'],
      highlights: ['55g 超轻量外壳', '26,000 DPI 光学引擎', '1000Hz 回报率，续航 90h'],
      desc: '为 FPS 玩家调校的对称造型，抓握与趴握都能贴合。',
      options: [
        { name: '配色', values: [{ label: C.black }, { label: C.white }] },
        { name: '版本', values: [{ label: '标准版' }, { label: '充电底座套装', delta: 120 }] }
      ],
      specs: { '重量': '55g', '引擎': '26,000 DPI 光学', '回报率': '1000Hz', '微动': '光学微动 8000 万次', '续航': '90h', '连接': '2.4G / 有线双模' } },
    { id: 'p21', name: 'AURORA C34 曲面显示器', brand: 'AURORA 极光', category: 'R01', art: 'monitor', artSeed: 1,
      price: 2799, listPrice: 3199, rating: 4.6, ratingCount: 1420, sales: 6320, stock: 54,
      tags: ['34" 带鱼屏', '165Hz', 'Type-C 90W'],
      highlights: ['34" 3440×1440 曲面带鱼屏', '165Hz 刷新率 + 1ms 响应', 'Type-C 单线连接并反向 90W 供电'],
      desc: '一条线连笔记本，同时充电、传屏、扩展 USB，桌面更干净。',
      options: [{ name: '版本', values: [{ label: '标准支架' }, { label: '升降旋转支架', delta: 200 }] }],
      specs: { '尺寸': '34" 曲面 1500R', '分辨率': '3440 × 1440 / 165Hz', '色域': '99% sRGB / 90% DCI-P3', '接口': 'Type-C 90W / DP1.4 / HDMI2.1', '响应': '1ms MPRT', '附加': '内置 KVM' } },
    { id: 'p22', name: 'VOLTA SSD 2TB 移动固态硬盘', brand: 'VOLTA', category: 'S01', art: 'ssd', artSeed: 1,
      price: 899, listPrice: 1099, rating: 4.8, ratingCount: 5620, sales: 24100, stock: 288,
      tags: ['2000MB/s', '抗摔', '双接口'],
      highlights: ['读取 2000MB/s、写入 1800MB/s', '2 米跌落防护', 'USB-C + USB-A 双接口'],
      desc: '剪片子时直接在外置盘上剪辑也不卡顿，金属外壳散热更稳。',
      options: [{ name: '容量', values: [{ label: '1TB', delta: -350 }, { label: '2TB' }, { label: '4TB', delta: 900 }] }],
      specs: { '容量': '2TB', '接口': 'USB 3.2 Gen2x2', '顺序读写': '2000 / 1800 MB/s', '尺寸': '88 × 46 × 10mm', '防护': '2m 抗摔 / IP54', '重量': '38g' } },
    { id: 'p23', name: 'BASALT Mesh 路由器 AX6600', brand: 'BASALT 磐石', category: 'S01', art: 'router', artSeed: 1,
      price: 1299, listPrice: 1499, rating: 4.5, ratingCount: 1860, sales: 8940, stock: 121,
      tags: ['Wi-Fi 7', 'Mesh 组网', '2.5G 网口'],
      highlights: ['Wi-Fi 7 三频 6600Mbps', '一键 Mesh 组网，覆盖 200㎡', '双 2.5G 网口 + 游戏加速'],
      desc: '复式与长条户型的覆盖方案，子母机免配置自动配对。',
      options: [{ name: '套装', values: [{ label: '单只' }, { label: '两只装', delta: 900 }, { label: '三只装', delta: 1700 }] }],
      specs: { '标准': 'Wi-Fi 7 (802.11be)', '速率': '三频 6600Mbps', '网口': '2 × 2.5G / 3 × 千兆', '天线': '内置 8 天线', '覆盖': '单只约 120㎡', '附加': '支持 2.5G 双拨' } },
    { id: 'p24', name: 'NEBULA Dock 12 合 1 扩展坞', brand: 'NEBULA 星云', category: 'S01', art: 'ssd', artSeed: 2,
      price: 449, listPrice: 549, rating: 4.3, ratingCount: 2140, sales: 16200, stock: 340,
      tags: ['双 4K 输出', '千兆网口', 'PD 100W'],
      highlights: ['双 4K60 视频输出', '千兆有线网口', 'PD 3.0 100W 直连供电'],
      desc: '一根线接齐显示器、有线网、读卡器与移动硬盘，笔记本扩展的常备件。',
      options: [{ name: '线长', values: [{ label: '15cm' }, { label: '30cm', delta: 30 }] }],
      specs: { '接口数': '12 合 1', '视频': '2 × 4K60 HDMI', '网络': 'RJ45 千兆', '供电': 'PD 3.0 100W 输入', '读卡': 'SD / TF 双卡同读', '材质': '全铝外壳' } },
    { id: 'p25', name: 'VOLTA Power 200W 氮化镓充电器', brand: 'VOLTA', category: 'R01', art: 'charger', artSeed: 1,
      price: 299, listPrice: 379, rating: 4.7, ratingCount: 3840, sales: 28600, stock: 420,
      tags: ['200W', '氮化镓', '四口同充'],
      highlights: ['200W 总功率，四口同时充', '氮化镓方案，体积比同功率小 40%', '折叠插脚，可选旅行转换头'],
      desc: '一个头搞定笔记本 + 手机 + 平板 + 耳机，出差只带一个充电器。',
      options: [{ name: '规格', values: [{ label: '国标插脚' }, { label: '含国际转换头', delta: 60 }] }],
      specs: { '总功率': '200W（2C2A）', '协议': 'PD 3.1 / PPS / QC 5', '技术': '第三代氮化镓', '体积': '72 × 72 × 32mm', '重量': '402g', '保护': '过流 / 过温 / 短路' } },
    { id: 'p26', name: 'KESTREL GO 20000mAh 移动电源', brand: 'KESTREL 红隼', category: 'R01', art: 'powerbank', artSeed: 1,
      price: 259, listPrice: 329, rating: 4.5, ratingCount: 6820, sales: 42300, stock: 460,
      tags: ['20000mAh', '自带线', '可上飞机'],
      highlights: ['20000mAh 容量，约 4 次手机充满', '自带 Type-C 线，免带线', '128 × 68 × 26mm，可登机'],
      desc: '机身自带线减少一次"忘带线"的尴尬，支持边充边放。',
      options: [{ name: '配色', values: [{ label: C.black }, { label: C.white }, { label: C.green }] }],
      specs: { '容量': '20000mAh / 74Wh', '输出': '双向 30W', '接口': '1C1A + 自带线', '显示': '数显剩余电量', '重量': '398g', '认证': '可随身登机' } },
    { id: 'p27', name: 'BASALT Console X 次世代主机', brand: 'BASALT 磐石', category: 'C01', art: 'console', artSeed: 2,
      price: 3899, listPrice: 4299, rating: 4.8, ratingCount: 2260, sales: 11300, stock: 58,
      tags: ['4K120', '1TB SSD', '光追'],
      highlights: ['4K120 输出与硬件光追', '定制 1TB NVMe SSD，秒进游戏', '向下兼容上代游戏库'],
      desc: '客厅娱乐中心，支持手柄快启与云存档同步。',
      options: [{ name: '版本', values: [{ label: '光驱版' }, { label: '数字版', delta: -500 }] }],
      specs: { '输出': '4K120 / 8K30', '存储': '定制 1TB NVMe', '光追': '硬件光追单元', '接口': 'HDMI 2.1 / 三 USB', '附带': '无线手柄 × 1', '重量': '4.2kg' } },
    { id: 'p28', name: 'CELSIUM Drone Air 航拍无人机', brand: 'CELSIUM 铯原', category: 'M01', art: 'drone', artSeed: 1,
      price: 5999, listPrice: 6599, rating: 4.6, ratingCount: 862, sales: 3240, stock: 37,
      tags: ['4K 三轴云台', '32 分钟续航', '全向避障'],
      highlights: ['4K60 三轴机械云台', '单电续航 32 分钟', '全向视觉避障 + 智能跟随'],
      desc: '249g 以下机身，免登记即可飞。支持一键成片与竖屏航拍。',
      options: [{ name: '套装', values: [{ label: '单电套装' }, { label: '畅飞套装（三电）', delta: 900 }] }],
      specs: { '重量': '249g', '云台': '三轴机械增稳', '视频': '4K60 / 2.7K120', '续航': '32 分钟', '图传': '1080p / 12km', '避障': '全向视觉' } },
    { id: 'p29', name: 'ORBIT Pen 2 压感手写笔', brand: 'ORBIT 星环', category: 'R01', art: 'mouse', artSeed: 2,
      price: 399, listPrice: 449, rating: 4.4, ratingCount: 1260, sales: 9840, stock: 218,
      tags: ['4096 级压感', '磁吸充电', '低延迟'],
      highlights: ['4096 级压感、支持侧锋倾斜', '磁吸吸附充电，随平板携带', '低至 9ms 笔迹延迟'],
      desc: '为手写笔记与速写设计，笔尖八支可换，磨平了不用换整支笔。',
      options: [{ name: '笔尖', values: [{ label: '标配 1 支' }, { label: '含 8 支备件', delta: 60 }] }],
      specs: { '压感': '4096 级', '延迟': '≈9ms', '充电': '磁吸无线', '续航': '12h', '重量': '15g', '附加': '倾斜识别 / 防误触' } },
    { id: 'p30', name: 'PRISM Camera 4K 直播摄像头', brand: 'PRISM 棱镜', category: 'R01', art: 'camera', artSeed: 3,
      price: 799, listPrice: 899, rating: 4.3, ratingCount: 1460, sales: 7420, stock: 164,
      tags: ['4K30', '自动取景', '双麦降噪'],
      highlights: ['4K30 / 1080P60 输出', 'AI 自动取景跟随', '双麦克风波束降噪'],
      desc: '开会与直播通用，支持一键虚化与白板增强模式。',
      options: [{ name: '安装', values: [{ label: '夹式' }, { label: '含三脚架', delta: 90 }] }],
      specs: { '分辨率': '4K30 / 1080P60', '视场角': '90°', '对焦': 'AI 自动取景', '麦克风': '双麦波束降噪', '接口': 'USB-C 免驱', '附加': '物理隐私盖' } }
  ];

  function getProduct(id) { return products.find(function (p) { return p.id === id; }) || null; }
  function getRelated(id, limit) {
    limit = limit || 4;
    var target = getProduct(id);
    if (!target) return products.slice(0, limit);
    var same = products.filter(function (p) { return p.id !== id && p.category === target.category; });
    var others = products
      .filter(function (p) { return p.id !== id && p.category !== target.category; })
      .sort(function (a, b) { return b.sales - a.sales; });
    return same.concat(others).slice(0, limit);
  }
  var bestSellers = products.slice().sort(function (a, b) { return b.sales - a.sales; }).slice(0, 6);

  var couponTemplates = [
    { id: 'cp-new', title: '新人首单立减', amount: 50, threshold: 199, days: 60, scope: '全场通用', desc: '仅限新用户首笔订单使用' },
    { id: 'cp-1000', title: '满 1000 减 80', amount: 80, threshold: 1000, days: 30, scope: '全场通用', desc: '不与新人券叠加' },
    { id: 'cp-3000', title: '满 3000 减 300', amount: 300, threshold: 3000, days: 20, scope: '全场通用', desc: '大额数码专享' },
    { id: 'cp-6000', title: '满 6000 减 800', amount: 800, threshold: 6000, days: 15, scope: '手机 / 电脑分类', desc: '单笔订单限用一张' },
    { id: 'cp-freight', title: '免运费券', amount: 12, threshold: 0, days: 45, scope: '运费抵扣', desc: '可直接抵扣一次运费' }
  ];
  var promotableCoupons = couponTemplates.slice(1, 4);

  // 评价数据：按 productId 派生
  function buildReviews() {
    var list = [];
    var authors = ['数码老张', '极客阿斌', 'Vita', '摄影师小李', '通勤党', '设计师阿雅', '老王', '学生小陈', '健身教练阿Ken', '宝妈小鹿'];
    var contents = {
      P01: ['屏幕素质同价位无敌，色彩很准。', '续航很扎实，重度用一天没压力。', '快充真的快，喝杯功夫茶就一半了。', '夜景比想象中强，对焦速度也快。'],
      C01: ['键盘手感很舒服，长时间码字不累。', '屏幕色彩很准，做设计够用。', '性能释放很到位，渲染效率提升明显。', '噪音控制优秀，深夜办公无干扰。'],
      A01: ['降噪深度足够，地铁里完全安静。', '佩戴舒适，长时间不压耳。', '声场开阔，听人声很有感情。', '延迟很低，看视频对得上口型。'],
      W01: ['续航准确，半个月一充无压力。', '定位很准，跑步轨迹贴合。', '佩戴轻巧，睡觉戴也无感。', '健康监测准，跟医疗设备对得上。'],
      M01: ['对焦非常快，抓拍成功率很高。', '高感控噪优秀，夜景细节丰富。', '机身做工扎实，手感好。', '视频防抖很稳，手持行走可用。'],
      R01: ['手感一流，回弹干脆。', '连接稳定，多设备切换丝滑。', '做工扎实，质感在线。', '性价比极高，这个价位没对手。'],
      S01: ['速度达标，传输稳定。', '发热控制好，长时间不烫手。', '兼容性强，多设备都能用。', '体积小巧，便携性优秀。']
    };
    var tags = ['真实购买', '复购用户', '试用报告', '老用户回归'];
    products.forEach(function (p) {
      var seed = Volta.Format.hashString(p.id);
      var rnd = Volta.Format.seededRandom(seed);
      var total = 2 + Math.floor(rnd() * 3); // 2-4 条
      for (var i = 0; i < total; i++) {
        var pool = contents[p.category] || contents.R01;
        var starBias = rnd() > 0.85 ? -1 : 0;
        list.push({
          id: p.id + '-r' + (i + 1),
          productId: p.id,
          author: authors[Math.floor(rnd() * authors.length)],
          avatar: authors[Math.floor(rnd() * authors.length)].slice(-1),
          rating: Math.max(3, Math.min(5, Math.round(p.rating) + starBias)),
          content: pool[Math.floor(rnd() * pool.length)],
          tag: tags[Math.floor(rnd() * tags.length)],
          ts: Date.now() - Math.floor(rnd() * 30) * 86400000 - i * 86400000
        });
      }
    });
    return list;
  }
  var reviews = null;
  function getReviews(productId) {
    if (!reviews) reviews = buildReviews();
    return reviews.filter(function (r) { return r.productId === productId; });
  }

  global.Volta = global.Volta || {};
  global.Volta.Data = {
    categories: categories,
    priceBands: priceBands,
    sortOptions: sortOptions,
    brandList: brandList,
    products: products,
    bestSellers: bestSellers,
    couponTemplates: couponTemplates,
    promotableCoupons: promotableCoupons,
    getProduct: getProduct,
    getRelated: getRelated,
    getReviews: getReviews
  };
})(window);
