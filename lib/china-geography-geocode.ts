/**
 * China province-level queries: canonical Nominatim strings + display repair when
 * upstream APIs mis-assign admin1 (e.g. Yunnan labeled as Hunan).
 */

/** Rough bounding boxes (degrees). Yunnan / Hunan longitudes do not overlap. */
const YUNNAN_BOX = { south: 21.0, north: 29.45, west: 97.35, east: 106.35 };
const HUNAN_BOX = { south: 24.45, north: 30.35, west: 108.65, east: 114.35 };

function inBox(lat: number, lng: number, box: typeof YUNNAN_BOX): boolean {
  return lat >= box.south && lat <= box.north && lng >= box.west && lng <= box.east;
}

/**
 * If coordinates fall in Yunnan but the label says Hunan (or vice versa), fix the string.
 * Scoped to these two provinces to avoid touching unrelated "湖南/云南" tokens elsewhere.
 */
export function repairMisassignedProvinceLabel(displayName: string, lat: number, lng: number): string {
  let s = displayName;
  if (inBox(lat, lng, YUNNAN_BOX)) {
    s = s.replace(/\b湖南省\b/g, "云南省");
    s = s.replace(/,\s*湖南\b/g, ", 云南");
    s = s.replace(/\b湖南,\s*/g, "云南, ");
    s = s.replace(/\bHunan Province\b/gi, "Yunnan Province");
    s = s.replace(/\bHunan\b/g, "Yunnan");
  } else if (inBox(lat, lng, HUNAN_BOX)) {
    s = s.replace(/\b云南省\b/g, "湖南省");
    s = s.replace(/,\s*云南\b/g, ", 湖南");
    s = s.replace(/\b云南,\s*/g, "湖南, ");
    s = s.replace(/\bYunnan Province\b/gi, "Hunan Province");
    s = s.replace(/\bYunnan\b/g, "Hunan");
  }
  return s;
}

function normKey(q: string): string {
  return q.trim().replace(/\s+/g, "");
}

/**
 * Exact province-level query → preferred `q` for Nominatim (Chinese full names).
 * Covers provincial administrative divisions commonly typed without "省/市/自治区".
 */
const CHINA_PROVINCE_NOMINATIM: Record<string, string> = {
  北京: "北京市, 中国",
  北京市: "北京市, 中国",
  天津: "天津市, 中国",
  天津市: "天津市, 中国",
  上海: "上海市, 中国",
  上海市: "上海市, 中国",
  重庆: "重庆市, 中国",
  重庆市: "重庆市, 中国",

  河北: "河北省, 中国",
  河北省: "河北省, 中国",

  山西: "山西省, 中国",
  山西省: "山西省, 中国",

  内蒙古: "内蒙古自治区, 中国",
  内蒙古自治区: "内蒙古自治区, 中国",

  辽宁: "辽宁省, 中国",
  辽宁省: "辽宁省, 中国",

  吉林: "吉林省, 中国",
  吉林省: "吉林省, 中国",

  黑龙江: "黑龙江省, 中国",
  黑龙江省: "黑龙江省, 中国",

  江苏: "江苏省, 中国",
  江苏省: "江苏省, 中国",

  浙江: "浙江省, 中国",
  浙江省: "浙江省, 中国",

  安徽: "安徽省, 中国",
  安徽省: "安徽省, 中国",

  福建: "福建省, 中国",
  福建省: "福建省, 中国",

  江西: "江西省, 中国",
  江西省: "江西省, 中国",

  山东: "山东省, 中国",
  山东省: "山东省, 中国",

  河南: "河南省, 中国",
  河南省: "河南省, 中国",

  湖北: "湖北省, 中国",
  湖北省: "湖北省, 中国",

  湖南: "湖南省, 中国",
  湖南省: "湖南省, 中国",
  湘: "湖南省, 中国",

  广东: "广东省, 中国",
  广东省: "广东省, 中国",
  粤: "广东省, 中国",

  广西: "广西壮族自治区, 中国",
  广西壮族自治区: "广西壮族自治区, 中国",

  海南: "海南省, 中国",
  海南省: "海南省, 中国",
  琼: "海南省, 中国",

  四川: "四川省, 中国",
  四川省: "四川省, 中国",

  贵州: "贵州省, 中国",
  贵州省: "贵州省, 中国",

  云南: "云南省, 中国",
  云南省: "云南省, 中国",
  滇: "云南省, 中国",

  西藏: "西藏自治区, 中国",
  西藏自治区: "西藏自治区, 中国",

  陕西: "陕西省, 中国",
  陕西省: "陕西省, 中国",

  甘肃: "甘肃省, 中国",
  甘肃省: "甘肃省, 中国",

  青海: "青海省, 中国",
  青海省: "青海省, 中国",

  宁夏: "宁夏回族自治区, 中国",
  宁夏回族自治区: "宁夏回族自治区, 中国",

  新疆: "新疆维吾尔自治区, 中国",
  新疆维吾尔自治区: "新疆维吾尔自治区, 中国",

  香港: "香港, 中国",
  香港特别行政区: "香港, 中国",

  澳门: "澳门, 中国",
  澳门特别行政区: "澳门, 中国",

  台湾: "台湾, 中国",
  台湾省: "台湾, 中国",
};

/** English / pinyin province names → same Nominatim disambiguation */
const ENGLISH_PROVINCE_NOMINATIM: Record<string, string> = {
  beijing: "北京市, 中国",
  tianjin: "天津市, 中国",
  shanghai: "上海市, 中国",
  chongqing: "重庆市, 中国",
  hebei: "河北省, 中国",
  shanxi: "山西省, 中国",
  innermongolia: "内蒙古自治区, 中国",
  liaoning: "辽宁省, 中国",
  jilin: "吉林省, 中国",
  heilongjiang: "黑龙江省, 中国",
  jiangsu: "江苏省, 中国",
  zhejiang: "浙江省, 中国",
  anhui: "安徽省, 中国",
  fujian: "福建省, 中国",
  jiangxi: "江西省, 中国",
  shandong: "山东省, 中国",
  henan: "河南省, 中国",
  hubei: "湖北省, 中国",
  hunan: "湖南省, 中国",
  guangdong: "广东省, 中国",
  guangxi: "广西壮族自治区, 中国",
  hainan: "海南省, 中国",
  sichuan: "四川省, 中国",
  guizhou: "贵州省, 中国",
  yunnan: "云南省, 中国",
  tibet: "西藏自治区, 中国",
  xizang: "西藏自治区, 中国",
  shaanxi: "陕西省, 中国",
  gansu: "甘肃省, 中国",
  qinghai: "青海省, 中国",
  ningxia: "宁夏回族自治区, 中国",
  xinjiang: "新疆维吾尔自治区, 中国",
  hongkong: "香港, 中国",
  macau: "澳门, 中国",
  macao: "澳门, 中国",
  taiwan: "台湾, 中国",
};

/**
 * If `q` is exactly a known province-level name, return a precise Nominatim query
 * so Open-Meteo / Photon never win with a wrong admin1.
 */
export function getCanonicalChinaProvinceSearch(q: string): string | null {
  const key = normKey(q);
  if (CHINA_PROVINCE_NOMINATIM[key]) return CHINA_PROVINCE_NOMINATIM[key];
  const lower = key.toLowerCase();
  if (ENGLISH_PROVINCE_NOMINATIM[lower]) return ENGLISH_PROVINCE_NOMINATIM[lower];
  return null;
}
