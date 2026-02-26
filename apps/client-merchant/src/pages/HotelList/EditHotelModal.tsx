import { Modal, Form, Input, InputNumber, Radio, Checkbox, Upload, Button, Card, Row, Col, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import { uploadImage } from "../../api/upload";
import {
  getHotelDetail,
  updateHotel,
  type CreateHotelPayload,
  type RoomType,
} from "../../api/hotels";

const { TextArea } = Input;

const starRatingOptions = [
  { value: "none", label: "无星级" },
  { value: "2", label: "二星级" },
  { value: "3", label: "三星级" },
  { value: "4", label: "四星级" },
  { value: "5", label: "五星级" },
];

const tagOptions = [
  { label: "免费Wi-Fi", value: "免费Wi-Fi" },
  { label: "含早", value: "含早" },
  { label: "健身房", value: "健身房" },
  { label: "游泳池", value: "游泳池" },
  { label: "SPA", value: "SPA" },
  { label: "会议室", value: "会议室" },
];

function starToStarRating(star: number): string {
  if (star === 0) return "none";
  if (star >= 2 && star <= 5) return String(star);
  return "none";
}

function starRatingToStar(starRating: string | undefined): number {
  if (!starRating || starRating === "none") return 0;
  const n = parseInt(starRating, 10);
  return Number.isNaN(n) ? 0 : Math.min(5, Math.max(0, n));
}

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

function UploadCover({ value, onChange }: { value?: string; onChange?: (url: string) => void }) {
  const [loading, setLoading] = useState(false);
  const fileList = value
    ? [{ uid: "-1", name: "cover", status: "done" as const, url: value }]
    : [];
  return (
    <Upload
      listType="picture-card"
      maxCount={1}
      showUploadList={{ showPreviewIcon: false }}
      fileList={fileList}
      beforeUpload={async (file) => {
        setLoading(true);
        try {
          const url = await uploadImage(file as File);
          onChange?.(url);
        } catch {
          message.error("封面上传失败");
        } finally {
          setLoading(false);
        }
        return false;
      }}
      onRemove={() => onChange?.("")}
    >
      {fileList.length >= 1 ? null : (
        <div>
          {loading ? <span>上传中…</span> : <><PlusOutlined /><span>上传封面图</span></>}
        </div>
      )}
    </Upload>
  );
}

function UploadImages({ value = [], onChange }: { value?: string[]; onChange?: (urls: string[]) => void }) {
  const [loading, setLoading] = useState(false);
  const fileList = (value || []).map((url, i) => ({
    uid: String(i),
    name: `image-${i}`,
    status: "done" as const,
    url,
  }));
  return (
    <Upload
      listType="picture-card"
      maxCount={5}
      showUploadList={{ showPreviewIcon: false }}
      fileList={fileList}
      beforeUpload={async (file) => {
        setLoading(true);
        try {
          const url = await uploadImage(file as File);
          onChange?.([...(value || []), url]);
        } catch {
          message.error("图片上传失败");
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
        <div>
          {loading ? <span>上传中…</span> : <><PlusOutlined /><span>上传图片</span></>}
        </div>
      )}
    </Upload>
  );
}

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
        <div>
          {loading ? <span>上传中…</span> : <><PlusOutlined /><span>上传房型图片</span></>}
        </div>
      )}
    </Upload>
  );
}

interface EditHotelModalProps {
  open: boolean;
  hotelId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditHotelModal({ open, hotelId, onClose, onSuccess }: EditHotelModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !hotelId) return;
    setLoading(true);
    getHotelDetail(hotelId)
      .then((res) => {
        const d = res.data;
        if (!d) return;
        form.setFieldsValue({
          name: d.name,
          city: d.city,
          address: d.address,
          starRating: starToStarRating(d.star),
          description: d.description ?? "",
          tags: d.tags ?? [],
          priceDesc: d.priceDesc ?? "",
          coverImage: d.coverImage ?? "",
          images: d.images ?? [],
          roomTypes: (d.roomTypes ?? []).map((rt) => ({
            name: rt.name,
            price: rt.price,
            bedInfo: rt.bedInfo,
            images: rt.images ?? [],
            inventory: rt.inventory ?? 10,
          })),
        });
      })
      .catch(() => {
        message.error("加载酒店详情失败");
        onClose();
      })
      .finally(() => setLoading(false));
  }, [open, hotelId, form, onClose]);

  const handleCancel = () => {
    Modal.confirm({
      title: "是否不保存更改？",
      content: "关闭后当前修改将不保存。",
      okText: "不保存",
      cancelText: "继续编辑",
      onOk: () => {
        form.resetFields();
        onClose();
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!hotelId) return;
      const { starRating, tags, coverImage, images, roomTypes: rawRoomTypes, ...rest } = values;
      const roomTypes: RoomType[] = (Array.isArray(rawRoomTypes) ? rawRoomTypes : []).map(formRoomToRoomType);
      const payload: CreateHotelPayload = {
        ...rest,
        name: rest.name?.trim() ?? "",
        city: rest.city?.trim() ?? "",
        address: rest.address?.trim() ?? "",
        star: starRatingToStar(starRating),
        coverImage: typeof coverImage === "string" ? coverImage : "",
        images: Array.isArray(images) ? images : [],
        tags: Array.isArray(tags) ? tags : [],
        roomTypes,
      };
      setSubmitting(true);
      await updateHotel(hotelId, payload);
      message.success("已保存，请等待审核");
      form.resetFields();
      onClose();
      onSuccess();
    } catch (e) {
      if (e && typeof e === "object" && "errorFields" in e) {
        // 校验失败，不额外提示
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="编辑酒店"
      open={open}
      onCancel={handleCancel}
      width={720}
      destroyOnClose
      footer={null}
      maskClosable={false}
      afterClose={() => form.resetFields()}
    >
      {loading ? (
        <div style={{ padding: "24px 0", textAlign: "center" }}>加载中…</div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            region: [],
            coverImage: "",
            images: [],
            roomTypes: [{ images: [] }],
          }}
        >
          <Form.Item name="name" label="酒店名称" required rules={[{ required: true, message: "请输入酒店名称" }]}>
            <Input placeholder="请输入酒店名称" allowClear />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="city" label="城市" required rules={[{ required: true, message: "请输入城市" }]}>
                <Input placeholder="如：上海" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="address" label="地址" required rules={[{ required: true, message: "请输入地址" }]}>
                <Input placeholder="详细地址" allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="starRating" label="星级" required rules={[{ required: true, message: "请选择星级" }]}>
            <Radio.Group options={starRatingOptions} />
          </Form.Item>
          <Form.Item name="description" label="酒店描述">
            <TextArea rows={3} placeholder="请输入酒店描述" allowClear />
          </Form.Item>
          <Form.Item
            name="tags"
            label="标签"
            required
            rules={[{ required: true, message: "请至少选择一个标签" }]}
          >
            <Checkbox.Group options={tagOptions} />
          </Form.Item>
          <Form.Item name="priceDesc" label="价格描述">
            <Input placeholder="如：特惠一口价" allowClear />
          </Form.Item>
          <Form.Item
            name="coverImage"
            label="封面图"
            required
            rules={[{ required: true, message: "请上传封面图" }, { type: "string", min: 1, message: "请上传封面图" }]}
          >
            <UploadCover />
          </Form.Item>
          <Form.Item
            name="images"
            label="酒店外观图"
            required
            rules={[
              { required: true, message: "请至少上传一张酒店外观图" },
              { type: "array", min: 1, message: "请至少上传一张酒店外观图" },
            ]}
          >
            <UploadImages />
          </Form.Item>

          <Card type="inner" title="房型信息" style={{ marginBottom: 16 }}>
            <Form.List name="roomTypes">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, index) => (
                    <Card
                      key={field.key}
                      type="inner"
                      size="small"
                      title={`房型 ${index + 1}`}
                      style={{ marginBottom: 12 }}
                      extra={
                        fields.length > 1 ? (
                          <Button type="link" danger size="small" onClick={() => remove(field.name)}>
                            删除
                          </Button>
                        ) : null
                      }
                    >
                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item
                            {...field}
                            name={[field.name, "name"]}
                            label="房型名称"
                            required
                            rules={[{ required: true, message: "请输入房型名称" }]}
                          >
                            <Input placeholder="如：豪华大床房" allowClear />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            {...field}
                            name={[field.name, "price"]}
                            label="价格（元/晚）"
                            required
                            rules={[{ required: true, message: "请输入价格" }]}
                          >
                            <InputNumber min={1} style={{ width: "100%" }} placeholder="688" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item
                        {...field}
                        name={[field.name, "bedInfo"]}
                        label="床铺信息"
                        required
                        rules={[{ required: true, message: "请输入床铺信息" }]}
                      >
                        <Input placeholder="如：一张1.5m大床" allowClear />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, "images"]}
                        label="房型图片"
                        required
                        rules={[
                          { required: true, message: "请上传房型图片" },
                          { type: "array", min: 1, message: "请上传房型图片" },
                        ]}
                      >
                        <UploadRoomImages />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, "inventory"]}
                        label="库存（间数）"
                        required
                        rules={[{ required: true, message: "请输入库存" }]}
                      >
                        <InputNumber min={1} style={{ width: "100%" }} placeholder="10" />
                      </Form.Item>
                    </Card>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block>
                      + 新增房型
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Card>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Button onClick={handleCancel}>取消</Button>
            <Button type="primary" loading={submitting} onClick={() => void handleSubmit()} style={{ marginLeft: 8 }}>
              提交
            </Button>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
