/**
 * build-regions.js —— 下载中国省市区全量数据并生成为前台静态 JS
 * 数据源：unpkg china-division pcas-code.json（省/市/区县三级，含行政编码）
 * 输出：public/plant/js/core/regions.js —— window.VoltaChinaRegions = [{name, children:[{name, children:[区县名...]}]}]
 * 用法：node scripts/build-regions.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchJson(url, redirects) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        if (redirects > 5) return reject(new Error('too many redirects'));
        const next = r.headers.location.startsWith('http') ? r.headers.location : new URL(r.headers.location, url).href;
        return resolve(fetchJson(next, (redirects || 0) + 1));
      }
      if (r.statusCode !== 200) return reject(new Error('HTTP ' + r.statusCode));
      let raw = '';
      r.on('data', (c) => (raw += c));
      r.on('end', () => { try { resolve(JSON.parse(raw)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

(async () => {
  const src = await fetchJson('https://unpkg.com/china-division/dist/pcas-code.json', 0);
  if (!Array.isArray(src) || !src.length) throw new Error('数据源为空');

  const MUNICIPAL = { 北京市: 1, 上海市: 1, 天津市: 1, 重庆市: 1 };

  // 港澳台补充（china-division 主数据仅含大陆 31 省级）
  const SUPPLEMENT = [
    { name: '香港特别行政区', children: [
      { name: '香港特别行政区', children: ['中西区','湾仔区','东区','南区','油尖旺区','深水埗区','九龙城区','黄大仙区','观塘区','北区','大埔区','沙田区','西贡区','荃湾区','屯门区','元朗区','葵青区','离岛区'] }
    ]},
    { name: '澳门特别行政区', children: [
      { name: '澳门特别行政区', children: ['花地玛堂区','圣安多尼堂区','大堂区','望德堂区','风顺堂区','嘉模堂区','圣方济各堂区','路氹城'] }
    ]},
    { name: '台湾省', children: [
      { name: '台北市', children: ['中正区','大同区','中山区','万华区','信义区','松山区','大安区','南港区','北投区','内湖区','士林区','文山区'] },
      { name: '新北市', children: ['板桥区','三重区','中和区','永和区','新庄区','新店区','土城区','芦洲区','汐止区','树林区','淡水区','瑞芳区'] },
      { name: '桃园市', children: ['桃园区','中坜区','平镇区','八德区','杨梅区','芦竹区','大园区','龟山区','龙潭区'] },
      { name: '台中市', children: ['中区','东区','南区','西区','北区','西屯区','南屯区','北屯区','丰原区','大甲区','清水区','沙鹿区'] },
      { name: '台南市', children: ['中西区','东区','南区','北区','安平区','安南区','永康区','新营区','盐水区','白河区','麻豆区','佳里区'] },
      { name: '高雄市', children: ['楠梓区','左营区','鼓山区','三民区','盐埕区','前金区','新兴区','苓雅区','前镇区','旗津区','小港区','凤山区','冈山区','旗山区'] },
      { name: '基隆市', children: ['中正区','七堵区','暖暖区','仁爱区','中山区','安乐区','信义区'] },
      { name: '新竹市', children: ['东区','北区','香山区'] },
      { name: '嘉义市', children: ['东区','西区'] },
      { name: '新竹县', children: ['竹北市','竹东镇','新埔镇','湖口乡','新丰乡','芎林乡','横山乡','宝山乡','峨眉乡','北埔乡'] },
      { name: '苗栗县', children: ['苗栗市','头份市','竹南镇','后龙镇','通霄镇','苑里镇','卓兰镇','公馆乡','铜锣乡','三义乡'] },
      { name: '彰化县', children: ['彰化市','员林市','和美镇','鹿港镇','溪湖镇','二林镇','田中镇','北斗镇','花坛乡','芬园乡','大村乡','永靖乡'] },
      { name: '南投县', children: ['南投市','埔里镇','草屯镇','竹山镇','集集镇','名间乡','鹿谷乡','中寮乡','鱼池乡','水里乡','信义乡','仁爱乡'] },
      { name: '云林县', children: ['斗六市','斗南镇','虎尾镇','西螺镇','土库镇','北港镇','莿桐乡','林内乡','古坑乡','大埤乡','仑背乡','麦寮乡'] },
      { name: '嘉义县', children: ['太保市','朴子市','布袋镇','大林镇','民雄乡','溪口乡','新港乡','六脚乡','东石乡','义竹乡','鹿草乡','水上乡'] },
      { name: '屏东县', children: ['屏东市','潮州镇','东港镇','恒春镇','万丹乡','长治乡','麟洛乡','九如乡','里港乡','盐埔乡','枋寮乡','新埤乡'] },
      { name: '宜兰县', children: ['宜兰市','罗东镇','苏澳镇','头城镇','礁溪乡','壮围乡','员山乡','冬山乡','五结乡','三星乡','大同乡','南澳乡'] },
      { name: '花莲县', children: ['花莲市','凤林镇','玉里镇','新城乡','吉安乡','寿丰乡','光复乡','丰滨乡','瑞穗乡','富里乡','秀林乡','万荣乡'] },
      { name: '台东县', children: ['台东市','成功镇','关山镇','卑南乡','鹿野乡','池上乡','东河乡','长滨乡','太麻里乡','大武乡','绿岛乡','兰屿乡'] },
      { name: '澎湖县', children: ['马公市','湖西乡','白沙乡','西屿乡','望安乡','七美乡'] },
      { name: '金门县', children: ['金城镇','金湖镇','金沙镇','金宁乡','烈屿乡','乌坵乡'] },
      { name: '连江县', children: ['南竿乡','北竿乡','莒光乡','东引乡'] }
    ]}
  ];

  const out = src.map((p) => {
    let cities = (p.children || []).map((c) => {
      // 直辖市的「市辖区」「县」分组：市级名直接用省名，避免出现「请选择 市辖区」
      let cityName = c.name;
      if (MUNICIPAL[p.name] && (c.name === '市辖区' || c.name === '县' || c.name === '省直辖县级行政区划')) {
        cityName = p.name;
      }
      const districts = [...new Set([...(c.children || []).map((d) => d.name)])];
      return { name: cityName, children: districts };
    });
    // 直辖市合并重名市级（市辖区+县 都映射为省名 → 合并区县）
    if (MUNICIPAL[p.name]) {
      const merged = {};
      cities.forEach((c) => {
        if (!merged[c.name]) merged[c.name] = [];
        merged[c.name] = merged[c.name].concat(c.children);
      });
      cities = Object.keys(merged).map((k) => ({ name: k, children: [...new Set(merged[k])] }));
    }
    return { name: p.name, children: cities };
  });

  // 合并港澳台（若主数据已有同名省级则跳过）
  SUPPLEMENT.forEach((s) => {
    if (!out.some((p) => p.name === s.name)) out.push(s);
  });

  const provinces = out.length;
  const cities = out.reduce((n, p) => n + p.children.length, 0);
  const districts = out.reduce((n, p) => n + p.children.reduce((m, c) => m + c.children.length, 0), 0);

  const js = '/**\n'
    + ' * regions.js —— 中国省/市/县（区）三级全量数据（自动生成，勿手改）\n'
    + ` * 来源：china-division（pcas-code.json），共 ${provinces} 省 / ${cities} 市 / ${districts} 区县\n`
    + ' * 重新生成：node scripts/build-regions.js\n'
    + ' */\n'
    + '(function (global) {\n'
    + '  global.VoltaChinaRegions = ' + JSON.stringify(out) + ';\n'
    + '})(window);\n';

  const dest = path.join(__dirname, '..', 'public', 'plant', 'js', 'core', 'regions.js');
  fs.writeFileSync(dest, js, 'utf8');
  console.log(`OK provinces=${provinces} cities=${cities} districts=${districts} size=${(fs.statSync(dest).size / 1024).toFixed(0)}KB`);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
