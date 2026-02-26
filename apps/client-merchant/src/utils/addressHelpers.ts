import provinces from "china-division/dist/provinces.json";
import cities from "china-division/dist/cities.json";
import areas from "china-division/dist/areas.json";
import type { AddressValueArray } from "../components/address/Address";

const HKMOTW_CODES: Record<string, string> = {
  HK: "香港特别行政区",
  MO: "澳门特别行政区",
  TW: "台湾省",
};


// 根据 Address 组件的 value（省/市/区 code 数组）解析出中文名称
export function getRegionNames(
  region: AddressValueArray | undefined
): { provinceName: string; cityName: string; areaName: string } {
  const [provinceCode, cityCode, areaCode] = region ?? [];
  let provinceName = "";
  let cityName = "";
  let areaName = "";

  if (!provinceCode) {
    return { provinceName, cityName, areaName };
  }

  const isHKMOTW =
    provinceCode === "HK" || provinceCode === "MO" || provinceCode === "TW";

  if (isHKMOTW) {
    provinceName = HKMOTW_CODES[provinceCode] ?? provinceCode;
    if (cityCode?.startsWith(`${provinceCode}-`)) {
      cityName = cityCode.slice(provinceCode.length + 1);
    }
    if (areaCode) {
      areaName = areaCode;
    }
  } else {
    const provincesList = provinces as { code: string; name: string }[];
    const citiesList = cities as {
      code: string;
      name: string;
      provinceCode: string;
    }[];
    const areasList = areas as {
      code: string;
      name: string;
      cityCode: string;
    }[];

    const p = provincesList.find((item) => item.code === provinceCode);
    provinceName = p?.name ?? "";

    if (cityCode) {
      const c = citiesList.find((item) => item.code === cityCode);
      cityName = c?.name ?? "";
    }

    if (areaCode && cityCode) {
      const a = areasList.find(
        (item) => item.code === areaCode && item.cityCode === cityCode
      );
      areaName = a?.name ?? areaCode;
    }
  }

  return { provinceName, cityName, areaName };
}

/**
 * 将表单的 region + addressDetail 转为后端需要的 city 和 address
 * city: 城市名（用于筛选）
 * address: 完整地址字符串
 */
export function regionToCityAndAddress(
  region: AddressValueArray | undefined,
  addressDetail: string | undefined
): { city: string; address: string } {
  const { provinceName, cityName, areaName } = getRegionNames(region);
  const parts = [provinceName, cityName, areaName].filter(Boolean);
  const address = parts.length
    ? `${parts.join("")}${addressDetail ?? ""}`
    : addressDetail ?? "";
  const city = cityName || provinceName || "";
  return { city, address };
}
