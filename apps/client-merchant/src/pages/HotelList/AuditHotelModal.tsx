import { Modal, Descriptions, Input, Button, Space, Card, message } from "antd";
import { useState, useEffect } from "react";
import { getHotelDetail, updateHotel } from "../../api/hotels";

const REVIEW_LABEL: Record<string, string> = {
  PENDING: "审核中",
  PUBLISHED: "已发布",
  REJECTED: "已拒绝",
  DRAFT: "草稿",
};

const STAR_LABEL: Record<number, string> = {
  0: "无星级",
  2: "二星级",
  3: "三星级",
  4: "四星级",
  5: "五星级",
};

const imgStyle: React.CSSProperties = {
  maxWidth: "100%",
  maxHeight: 160,
  objectFit: "contain",
  borderRadius: 4,
  border: "1px solid #f0f0f0",
};

interface AuditHotelModalProps {
  open: boolean;
  hotelId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuditHotelModal({ open, hotelId, onClose, onSuccess }: AuditHotelModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getHotelDetail>>["data"]>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => {
    if (!open || !hotelId) {
      setDetail(null);
      setShowRejectInput(false);
      setRejectNote("");
      return;
    }
    setLoading(true);
    getHotelDetail(hotelId)
      .then((res) => {
        setDetail(res.data ?? null);
      })
      .catch(() => {
        message.error("加载酒店详情失败");
        onClose();
      })
      .finally(() => setLoading(false));
  }, [open, hotelId, onClose]);

  const handleApprove = async () => {
    if (!hotelId) return;
    setSubmitting(true);
    try {
      await updateHotel(hotelId, { action: "APPROVE" });
      message.success("已通过");
      onClose();
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectConfirm = async () => {
    const note = rejectNote.trim();
    if (!note) {
      message.warning("请填写审核意见（必填）");
      return;
    }
    if (!hotelId) return;
    setSubmitting(true);
    try {
      await updateHotel(hotelId, { action: "REJECT", adminNote: note });
      message.success("已拒绝");
      onClose();
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowRejectInput(false);
    setRejectNote("");
    onClose();
  };

  return (
    <Modal
      title="审核酒店"
      open={open}
      onCancel={handleCancel}
      width={720}
      destroyOnClose
      footer={null}
      maskClosable={false}
      styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
    >
      {loading ? (
        <div style={{ padding: "24px 0", textAlign: "center" }}>加载中…</div>
      ) : detail ? (
        <>
          <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="酒店名称">{detail.name}</Descriptions.Item>
            <Descriptions.Item label="城市">{detail.city}</Descriptions.Item>
            <Descriptions.Item label="地址">{detail.address}</Descriptions.Item>
            <Descriptions.Item label="星级">{STAR_LABEL[detail.star as keyof typeof STAR_LABEL] ?? detail.star}</Descriptions.Item>
            <Descriptions.Item label="审核状态">{REVIEW_LABEL[detail.checking] ?? detail.checking}</Descriptions.Item>
            <Descriptions.Item label="酒店描述">{detail.description || "—"}</Descriptions.Item>
            <Descriptions.Item label="标签">{Array.isArray(detail.tags) ? detail.tags.join("、") : "—"}</Descriptions.Item>
            <Descriptions.Item label="价格描述">{detail.priceDesc || "—"}</Descriptions.Item>
          </Descriptions>

          <Card type="inner" title="封面图" size="small" style={{ marginBottom: 16 }}>
            {detail.coverImage ? (
              <img src={detail.coverImage} alt="封面" style={imgStyle} />
            ) : (
              <span style={{ color: "#999" }}>未上传</span>
            )}
          </Card>

          <Card type="inner" title="酒店外观图" size="small" style={{ marginBottom: 16 }}>
            {Array.isArray(detail.images) && detail.images.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {detail.images.map((url, i) => (
                  <img key={i} src={url} alt={`外观${i + 1}`} style={{ ...imgStyle, maxHeight: 120 }} />
                ))}
              </div>
            ) : (
              <span style={{ color: "#999" }}>未上传</span>
            )}
          </Card>

          <Card type="inner" title={`房型信息（${detail.roomTypes?.length ?? 0} 个）`} size="small" style={{ marginBottom: 16 }}>
            {(detail.roomTypes?.length ?? 0) > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {(detail.roomTypes ?? []).map((rt, index) => (
                  <Card key={index} size="small" title={`房型 ${index + 1}：${rt.name}`} type="inner">
                    <Descriptions column={1} bordered size="small">
                      <Descriptions.Item label="房型名称">{rt.name}</Descriptions.Item>
                      <Descriptions.Item label="价格">{rt.price} 元/晚</Descriptions.Item>
                      <Descriptions.Item label="床铺信息">{rt.bedInfo || "—"}</Descriptions.Item>
                      <Descriptions.Item label="库存">{rt.inventory} 间</Descriptions.Item>
                    </Descriptions>
                    {Array.isArray(rt.images) && rt.images.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ marginBottom: 4, color: "#666", fontSize: 12 }}>房型图片：</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {rt.images.map((url, i) => (
                            <img key={i} src={url} alt={`${rt.name}-${i + 1}`} style={{ ...imgStyle, maxHeight: 100 }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <span style={{ color: "#999" }}>暂无房型</span>
            )}
          </Card>

          {showRejectInput && (
            <div style={{ marginBottom: 16 }}>
              <span style={{ color: "#ff4d4f" }}>* </span>
              <span>审核意见（必填）：</span>
              <Input.TextArea
                rows={3}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="请输入拒绝原因"
                style={{ marginTop: 8 }}
              />
            </div>
          )}

          <div style={{ textAlign: "right" }}>
            <Space>
              {!showRejectInput ? (
                <>
                  <Button onClick={handleCancel}>取消</Button>
                  <Button type="primary" loading={submitting} onClick={() => void handleApprove()}>
                    通过
                  </Button>
                  <Button
                    danger
                    loading={submitting}
                    onClick={() => setShowRejectInput(true)}
                  >
                    拒绝
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => { setShowRejectInput(false); setRejectNote(""); }}>
                    返回
                  </Button>
                  <Button danger loading={submitting} onClick={() => void handleRejectConfirm()}>
                    确认拒绝
                  </Button>
                </>
              )}
            </Space>
          </div>
        </>
      ) : null}
    </Modal>
  );
}
