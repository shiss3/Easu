import { Tabs, Form, Input, Upload, Button, Card, Row, Col, Checkbox, Radio, message } from "antd";
import { PlusOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useState, useEffect } from 'react';
import Address from '../../components/address/Address';
import RoomDetail from './RoomDetail';
import { uploadImage } from '../../api/upload';
import './index.css';

const { TextArea } = Input;

const starRatingOptions = [
  { value: 'none', label: '无星级' },
  { value: '2', label: '二星级' },
  { value: '3', label: '三星级' },
  { value: '4', label: '四星级' },
  { value: '5', label: '五星级' },
];

const tagOptions = [
  { label: '免费Wi-Fi', value: '免费Wi-Fi' },
  { label: '含早', value: '含早' },
  { label: '健身房', value: '健身房' },
  { label: '游泳池', value: '游泳池' },
  { label: 'SPA', value: 'SPA' },
  { label: '会议室', value: '会议室' },
];

const tabItems = [
    { key: 'hotel', label: '酒店信息' },
    { key: 'roomType', label: '房型信息' },
];

// 封面图：选图即 FormData 上传到 /api/upload，表单存 CDN URL 字符串
function UploadCover({ value, onChange }: { value?: string; onChange?: (url: string) => void }) {
  const [loading, setLoading] = useState(false);
  const fileList = value
    ? [{ uid: '-1', name: 'cover', status: 'done' as const, url: value }]
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
          message.error('封面上传失败');
        } finally {
          setLoading(false);
        }
        return false;
      }}
      onRemove={() => onChange?.('')}
    >
      {fileList.length >= 1 ? null : (
        <div className="add-hotel-upload-btn">
          {loading ? <span>上传中…</span> : <><PlusOutlined /><span>上传封面图</span></>}
        </div>
      )}
    </Upload>
  );
}

// 酒店外观图等
function UploadImages({ value = [], onChange }: { value?: string[]; onChange?: (urls: string[]) => void }) {
  const [loading, setLoading] = useState(false);
  const fileList = (value || []).map((url, i) => ({
    uid: String(i),
    name: `image-${i}`,
    status: 'done' as const,
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
          message.error('图片上传失败');
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
          {loading ? <span>上传中…</span> : <><PlusOutlined /><span>上传图片</span></>}
        </div>
      )}
    </Upload>
  );
}

function AddHotel() {
  const [activeTab, setActiveTab] = useState('hotel');
  const [form] = Form.useForm();

  // 切换到房型信息时，滚动到页面顶部
  useEffect(() => {
    if (activeTab === 'roomType') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  // 校验酒店信息 Tab 的必填字段
  const validateHotelRequired = async () => {
    try {
      // 仅校验酒店信息必填字段：名称、地址、省市区、星级、标签、封面图、酒店外观图
      await form.validateFields([
        'name',
        'region',
        'addressDetail',
        'starRating',
        'tags',
        'coverImage',
        'images',
      ]);
      return true;
    } catch {
      return false;
    }
  };

  // 按钮跳转到房型信息
  const handleGoRoomType = async () => {
    const ok = await validateHotelRequired();
    if (ok) {
      setActiveTab('roomType');
    }
  };

  // Tab 切换时：点击房型信息同样需要先通过酒店信息校验
  const handleTabChange = async (key: string) => {
    if (key === 'roomType') {
      const ok = await validateHotelRequired();
      if (!ok) {
        return;
      }
    }
    setActiveTab(key);
  };

  return (
    <div className="add-hotel-page">
      <div className="add-hotel-tabs-wrap">
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems.map((item) => ({
            key: item.key,
            label: item.label,
            children: null,
          }))}
          className="add-hotel-tabs"
        />
      </div>

      <div className="add-hotel-content">
        {/* 酒店信息：用 display 控制显隐而非条件渲染，避免切到房型页后 form 字段被卸载导致 getFieldsValue() 取不到值 */}
        <div style={{ display: activeTab === 'hotel' ? 'block' : 'none' }}>
          <Row gutter={24} className="add-hotel-form-row">
            <Col xs={24} lg={16}>
              <Form
                form={form}
                layout="vertical"
                initialValues={{ region: [], coverImage: '', images: [] }}
              >
                <Card title="基本信息" className="add-hotel-card">
                  <Form.Item
                    name="name"
                    label="酒店名称（中文）"
                    required
                    rules={[{ required: true, message: '请输入酒店名称' }]}
                    extra="示例：上海易宿小易酒店(淞虹路地铁站店)"
                  >
                    <Input placeholder="请输入酒店名称" allowClear />
                  </Form.Item>

                  {/* 酒店地址：Address 组件（省/市/区选择器）+ 详细地址 */}
                  <Form.Item
                    name="region"
                    rules={[{ required: true, message: '请选择省/市/区' }]}
                  >
                    <Address label="酒店地址（中文）" required />
                  </Form.Item>
                  <Form.Item
                    name="addressDetail"
                    label="详细地址（无需重复填写省市区信息）"
                    required
                    rules={[{ required: true, message: '请填写详细地址' }]}
                  >
                    <TextArea rows={2} placeholder="请参照以下格式输入地址：金钟路968号" allowClear />
                  </Form.Item>

                  {/* 星级 */}
                  <Form.Item name="starRating" label="星级" required rules={[{ required: true, message: '请选择星级' }]}>
                    <Radio.Group options={starRatingOptions} className="add-hotel-star-radio" />
                  </Form.Item>
                  <div className="add-hotel-star-hint">
                    <InfoCircleOutlined />
                    <span>平台将根据规则对申请的星/钻级进行审核，上线后的钻级可能与申请钻级不同。</span>
                  </div>

                  <Form.Item name="description" label="酒店描述">
                    <TextArea rows={4} placeholder="请输入酒店描述（如：位于市中心的豪华酒店，交通便利，为您提供顶级的住宿体验）" allowClear />
                  </Form.Item>
                  <Form.Item
                    name="tags"
                    label="标签"
                    required
                    rules={[{ required: true, message: '请至少选择一个标签' }]}
                    extra="可多选，如：免费Wi-Fi、含早、健身房等"
                  >
                    <Checkbox.Group options={tagOptions} />
                  </Form.Item>
                  <Form.Item name="priceDesc" label="价格描述">
                    <Input placeholder="如：特惠一口价" allowClear />
                  </Form.Item>
                </Card>

                <Card title="店招图片" className="add-hotel-card add-hotel-card--images">
                  <p className="add-hotel-upload-desc">
                    需上传封面及酒店外观图等，请等待上传完成。
                  </p>
                  <Form.Item
                    name="coverImage"
                    label="封面图"
                    required
                    rules={[{ required: true, message: '请上传封面图' }, { type: 'string', min: 1, message: '请上传封面图' }]}
                  >
                    <UploadCover />
                  </Form.Item>
                  <Form.Item
                    name="images"
                    label="酒店外观图等"
                    required
                    rules={[
                      { required: true, message: '请至少上传一张酒店外观图' },
                      { type: 'array', min: 1, message: '请至少上传一张酒店外观图' },
                    ]}
                    extra="可上传多张，用于展示酒店外观、店招、前台等"
                  >
                    <UploadImages />
                  </Form.Item>
                </Card>

                <div style={{ textAlign: 'right', marginTop: 8 }}>
                  <Button type="link" onClick={handleGoRoomType}>
                    继续填写房型信息 &gt;
                  </Button>
                </div>
              </Form>
            </Col>
            <Col xs={24} lg={8}>
              <div className="add-hotel-hints">
                <div className="add-hotel-hint-block">
                  <div className="add-hotel-hint-title">
                    <InfoCircleOutlined />
                    <span>填写说明</span>
                  </div>
                  <ol className="add-hotel-hint-list">
                    <li>1. 酒店名称需与营业执照一致，便于用户搜索。</li>
                    <li>2. 省、市/县、详细地址为必填，无需在详细地址中重复省市区信息。</li>
                    <li>3. 星级为必选，平台将按规则审核后展示。</li>
                    <li>4. 封面图将作为列表与详情主图，请使用清晰横图。</li>
                  </ol>
                  <a href="#" className="add-hotel-hint-link">详细规则点击此处</a>
                </div>
                <div className="add-hotel-hint-block">
                  <div className="add-hotel-hint-title">
                    <InfoCircleOutlined />
                    <span>图片上传参考</span>
                  </div>
                  <p className="add-hotel-hint-text">封面图需包含完整建筑外观或店招；外观图可多角度展示门头与周边。</p>
                </div>
              </div>
            </Col>
          </Row>
        </div>

        <div style={{ display: activeTab === 'roomType' ? 'block' : 'none' }}>
          <RoomDetail hotelForm={form} />
        </div>
      </div>
    </div>
  );
}

export default AddHotel;
