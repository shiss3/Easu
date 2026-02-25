import { Card, Form, Input, InputNumber, Upload, Row, Col, Button, message } from "antd";
import type { FormInstance } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createMerchantHotel, type CreateHotelPayload, type RoomType } from "../../api/hotels";
import { uploadImage } from "../../api/upload";
import { regionToCityAndAddress } from "../../utils/addressHelpers";

const { TextArea } = Input;

// 房型图片
function UploadRoomImages({
  value = [],
  onChange,
}: {
  value?: string[];
  onChange?: (urls: string[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const fileList = (value || []).map((url, i) => ({
    uid: String(i),
    name: `room-${i}`,
    status: "done" as const,
    url,
  }));
  return (
    <Upload
      listType="picture-card"
      multiple
      showUploadList={{ showPreviewIcon: false }}
      fileList={fileList}
      beforeUpload={async (file) => {
        setLoading(true);
        try {
          const url = await uploadImage(file as File);
          onChange?.([...(value || []), url]);
        } catch {
          message.error("房型图片上传失败");
        } finally {
          setLoading(false);
        }
        return false;
      }}
      onRemove={({ uid }) => {
        const next = (value || []).filter((_, i) => String(i) !== uid);
        onChange?.(next);
      }}
    >
      {fileList.length >= 5 ? null : (
        <div className="add-hotel-upload-btn">
          {loading ? <span>上传中…</span> : <><PlusOutlined /><span>上传房型图片</span></>}
        </div>
      )}
    </Upload>
  );
}

// 表单星级 'none' | '2'
function starRatingToStar(starRating: string | undefined): number {
  if (!starRating || starRating === "none") return 0;
  const n = parseInt(starRating, 10);
  return Number.isNaN(n) ? 0 : Math.min(5, Math.max(0, n));
}

// 将表单中的单个房型值转为后端 RoomType
function formRoomToRoomType(item: {
  name?: string;
  price?: number;
  bedInfo?: string;
  images?: string[];
  inventory?: number;
}): RoomType {
  return {
    name: String(item?.name ?? "").trim(),
    price: Number(item?.price) || 0,
    bedInfo: String(item?.bedInfo ?? "").trim(),
    images: Array.isArray(item?.images) ? item.images : [],
    inventory: Number(item?.inventory) || 0,
  };
}

interface RoomDetailProps {
  hotelForm: FormInstance;
}

function RoomDetail({ hotelForm }: RoomDetailProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmitAll = async () => {
    const hotelValues = hotelForm.getFieldsValue();
    const roomValues = form.getFieldsValue();
    const { region, addressDetail, starRating, tags, coverImage, images, ...rest } = hotelValues;
    const { city, address } = regionToCityAndAddress(region, addressDetail);
    const rawRoomTypes = Array.isArray(roomValues?.roomTypes) ? roomValues.roomTypes : [];
    const roomTypes: RoomType[] = rawRoomTypes.map(formRoomToRoomType);
    const payload: CreateHotelPayload = {
      name: rest.name?.trim() ?? "",
      address: address.trim(),
      city: city.trim(),
      star: starRatingToStar(starRating),
      coverImage: typeof coverImage === "string" ? coverImage : "",
      images: Array.isArray(images) ? images : [],
      description: rest.description?.trim(),
      tags: Array.isArray(tags) ? tags : [],
      priceDesc: rest.priceDesc?.trim(),
      roomTypes,
    };
    setLoading(true);
    try {
      await createMerchantHotel(payload);
      message.success("酒店创建成功，请等待审核");
      navigate("/home");
    } catch {
      // 错误已由 http 拦截器提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="房型信息" className="add-hotel-card">
      <Form
        form={form}
        layout="vertical"
        initialValues={{ roomTypes: [{ images: [] }] }}
        onFinish={() => {
          void onSubmitAll();
        }}
      >
        <Form.List name="roomTypes">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, index) => (
                <Card
                  key={field.key}
                  type="inner"
                  title={`房型 ${index + 1}`}
                  style={{ marginBottom: 16 }}
                  extra={
                    fields.length > 1 ? (
                      <Button type="link" danger onClick={() => remove(field.name)}>
                        删除
                      </Button>
                    ) : null
                  }
                >
                  <Row gutter={16}>
                    <Col xs={24} lg={12}>
                      <Form.Item
                        {...field}
                        name={[field.name, "name"]}
                        fieldKey={[field.fieldKey, "name"]}
                        label="房型名称"
                        required
                        rules={[{ required: true, message: "请输入房型名称" }]}
                      >
                        <Input placeholder="例如：豪华大床房" allowClear />
                      </Form.Item>
                    </Col>
                    <Col xs={24} lg={12}>
                      <Form.Item
                        {...field}
                        name={[field.name, "price"]}
                        fieldKey={[field.fieldKey, "price"]}
                        label="房型价格（元/晚）"
                        required
                        rules={[{ required: true, message: "请输入房型价格" }]}
                      >
                        <InputNumber
                          min={1}
                          style={{ width: "100%" }}
                          placeholder="例如：688"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    {...field}
                    name={[field.name, "bedInfo"]}
                    fieldKey={[field.fieldKey, "bedInfo"]}
                    label="床铺信息"
                    required
                    rules={[{ required: true, message: "请输入床铺信息" }]}
                    extra="例如：一张1.5m大床；两张1.2m单人床"
                  >
                    <TextArea rows={2} placeholder="请输入床铺信息" allowClear />
                  </Form.Item>

                  <Form.Item
                    {...field}
                    name={[field.name, "images"]}
                    fieldKey={[field.fieldKey, "images"]}
                    label="房型图片"
                    required
                    rules={[{ required: true, message: "请至少上传一张房型图片" }, { type: "array", min: 1, message: "请至少上传一张房型图片" }]}
                    extra="可上传多张，请等待上传完成"
                  >
                    <UploadRoomImages />
                  </Form.Item>

                  <Form.Item
                    {...field}
                    name={[field.name, "inventory"]}
                    fieldKey={[field.fieldKey, "inventory"]}
                    label="房型库存（间数）"
                    required
                    rules={[{ required: true, message: "请输入房型库存" }]}
                  >
                    <InputNumber
                      min={1}
                      style={{ width: "100%" }}
                      placeholder="例如：10"
                    />
                  </Form.Item>
                </Card>
              ))}

              <Form.Item>
                <Button type="dashed" block onClick={() => add()}>
                  + 新增房型
                </Button>
              </Form.Item>

              <Form.Item style={{ textAlign: "right", marginTop: 8 }}>
                <Button type="primary" htmlType="submit" loading={loading}>
                  提交
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </Card>
  );
}

export default RoomDetail;

