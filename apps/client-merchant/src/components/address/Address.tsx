import { useMemo } from "react";
import { Input, Row, Col, Select } from "antd";
import provinces from "china-division/dist/provinces.json";
import cities from "china-division/dist/cities.json";
import areas from "china-division/dist/areas.json";
import hkmotw from "china-division/dist/HK-MO-TW.json";
import "./index.css";

// 与 Form 联用时 value 为 [provinceCode?, cityCode?, areaCode?]
export type AddressValueArray = [string?, string?, string?];

interface AddressProps {
  value?: AddressValueArray;
  onChange?: (value: AddressValueArray) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const NO_DISTRICT = "";

// 港澳台地区
const HKMOTW_CODES: Record<string, string> = {
  HK: "香港特别行政区",
  MO: "澳门特别行政区",
  TW: "台湾省",
};

type HKMOTWData = Record<string, Record<string, string[]>>;

// 中国省市区选择器
function Address({
  value = [],
  onChange,
  label = "酒店地址（中文）",
  required = false,
  disabled = false,
  className = "",
}: AddressProps) {
  const [provinceCode, cityCode, areaCode] = value ?? [];
  const isHKMOTW = provinceCode === "HK" || provinceCode === "MO" || provinceCode === "TW";

  const provinceOptions = useMemo(() => {
    const list = provinces as { code: string; name: string }[];
    const mainland = list.map((p) => ({ value: p.code, label: p.name }));
    const hkmotwOpts = [
      { value: "HK", label: "香港特别行政区" },
      { value: "MO", label: "澳门特别行政区" },
      { value: "TW", label: "台湾省" },
    ];
    return [...mainland, ...hkmotwOpts];
  }, []);

  const cityOptions = useMemo(() => {
    if (!provinceCode) return [];
    if (isHKMOTW) {
      const provinceName = HKMOTW_CODES[provinceCode];
      const data = hkmotw as HKMOTWData;
      const citiesObj = data[provinceName];
      if (!citiesObj) return [];
      return Object.keys(citiesObj).map((name) => ({ value: `${provinceCode}-${name}`, label: name }));
    }
    const list = cities as { code: string; name: string; provinceCode: string }[];
    return list.filter((c) => c.provinceCode === provinceCode).map((c) => ({ value: c.code, label: c.name }));
  }, [provinceCode, isHKMOTW]);

  const areaOptions = useMemo(() => {
    if (!cityCode) return [];
    if (isHKMOTW && cityCode.startsWith(`${provinceCode}-`)) {
      const provinceName = HKMOTW_CODES[provinceCode];
      const cityName = cityCode.slice(provinceCode.length + 1);
      const data = hkmotw as HKMOTWData;
      const districts = data[provinceName]?.[cityName];
      if (!Array.isArray(districts)) return [];
      return districts.map((name) => ({ value: name, label: name }));
    }
    const list = areas as { code: string; name: string; cityCode: string }[];
    const items = list.filter((a) => a.cityCode === cityCode).map((a) => ({ value: a.code, label: a.name }));
    return [{ value: NO_DISTRICT, label: "无行政区" }, ...items];
  }, [cityCode, provinceCode, isHKMOTW]);

  const onProvinceChange = (v: string) => {
    onChange?.([v, undefined, undefined]);
  };
  const onCityChange = (v: string) => {
    onChange?.([provinceCode, v, undefined]);
  };
  const onAreaChange = (v: string | undefined) => {
    onChange?.([provinceCode, cityCode, v === undefined ? undefined : v]);
  };

  return (
    <div className={`address-region ${className}`.trim()}>
      {label && (
        <div className="address-region-label">
          {required && <span className="address-region-required">*</span>}
          <span>{label}</span>
        </div>
      )}
      <Row gutter={16} className="address-region-row">
        <Col span={6}>
          <Input disabled value="中国" className="address-input-disabled" />
        </Col>
        <Col span={6}>
          <Select
            placeholder="省"
            allowClear
            options={provinceOptions}
            value={provinceCode || undefined}
            onChange={onProvinceChange}
            disabled={disabled}
            style={{ width: "100%" }}
          />
        </Col>
        <Col span={6}>
          <Select
            placeholder="市/县"
            allowClear
            options={cityOptions}
            value={cityCode || undefined}
            onChange={onCityChange}
            disabled={disabled || !provinceCode}
            style={{ width: "100%" }}
          />
        </Col>
        <Col span={6}>
          <Select
            placeholder="行政区"
            allowClear
            options={areaOptions}
            value={areaCode ?? undefined}
            onChange={onAreaChange}
            disabled={disabled || !cityCode}
            style={{ width: "100%" }}
          />
        </Col>
      </Row>
    </div>
  );
}

export default Address;
