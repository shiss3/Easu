import { Card, Form, Input, Button, Table, Tag, Space, Popconfirm, Modal, Spin, Select, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import type { ManagerRole } from "../../api/users";
import {
  getHotelList,
  getHotelDetail,
  setHotelOffline,
  setHotelOnline,
  type HotelListItem,
  type ReviewProcess,
} from "../../api/hotels";
import EditHotelModal from "./EditHotelModal";
import AuditHotelModal from "./AuditHotelModal";

const REVIEW_LABEL: Record<ReviewProcess, string> = {
  PENDING: "审核中",
  PUBLISHED: "已发布",
  REJECTED: "已拒绝",
  DRAFT: "草稿",
};

const REVIEW_TAG_COLOR: Record<ReviewProcess, string> = {
  PENDING: "processing",
  PUBLISHED: "success",
  REJECTED: "error",
  DRAFT: "default",
};

function HotelList() {
  const role = useSelector((s: RootState) => s.authSlice.managerInfo?.role) as ManagerRole | undefined;
  const [form] = Form.useForm();
  const [list, setList] = useState<HotelListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editHotelId, setEditHotelId] = useState<number | null>(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditHotelId, setAuditHotelId] = useState<number | null>(null);
  const [viewAuditNoteHotelId, setViewAuditNoteHotelId] = useState<number | null>(null);
  const [viewAuditNoteLoading, setViewAuditNoteLoading] = useState(false);
  const [viewAuditNoteContent, setViewAuditNoteContent] = useState<string | null>(null);

  const fetchList = useCallback(
    async (params?: { name?: string; checking?: ReviewProcess; status?: number }) => {
      setLoading(true);
      try {
        const res = await getHotelList(params);
        setList(res.data ?? []);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (!viewAuditNoteHotelId) return;
    setViewAuditNoteLoading(true);
    getHotelDetail(viewAuditNoteHotelId)
      .then((res) => {
        const note = res.data?.adminNote;
        setViewAuditNoteContent(typeof note === "string" ? note : null);
      })
      .catch(() => message.error("加载审核意见失败"))
      .finally(() => setViewAuditNoteLoading(false));
  }, [viewAuditNoteHotelId]);

  const onSearch = () => {
    fetchList(getCurrentFilterParams());
  };

  const onReset = () => {
    form.resetFields();
    fetchList();
  };

  const getCurrentFilterParams = () => {
    const name = form.getFieldValue("name")?.trim?.();
    const checking = form.getFieldValue("checking") as ReviewProcess | undefined;
    const status = form.getFieldValue("status") as number | undefined;
    return {
      name: name || undefined,
      checking: checking || undefined,
      status: status !== undefined && status !== null ? status : undefined,
    };
  };

  const handleEdit = (record: HotelListItem) => {
    setEditHotelId(record.id);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditHotelId(null);
  };

  const openAudit = (record: HotelListItem) => {
    setAuditHotelId(record.id);
    setAuditModalOpen(true);
  };

  const closeAuditModal = () => {
    setAuditModalOpen(false);
    setAuditHotelId(null);
  };

  const openViewAuditNote = (record: HotelListItem) => {
    setViewAuditNoteHotelId(record.id);
    setViewAuditNoteContent(null);
  };

  const closeViewAuditNote = () => {
    setViewAuditNoteHotelId(null);
    setViewAuditNoteContent(null);
  };

  const handleOffline = async (record: HotelListItem) => {
    try {
      await setHotelOffline(record.id);
      message.success("已下线");
      fetchList(getCurrentFilterParams());
    } catch {
      // message 已在 request 拦截器处理
    }
  };

  const handleOnline = async (record: HotelListItem) => {
    try {
      await setHotelOnline(record.id);
      message.success("已上线，请审核");
      fetchList(getCurrentFilterParams());
    } catch {
      // message 已在 request 拦截器处理
    }
  };

  const columns: ColumnsType<HotelListItem> = [
    {
      title: "No.",
      key: "index",
      width: 64,
      render: (_, __, index) => index + 1,
    },
    {
      title: "酒店名称",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: "地址",
      dataIndex: "address",
      key: "address",
      ellipsis: true,
    },
    {
      title: "审核状态",
      dataIndex: "checking",
      key: "checking",
      width: 100,
      render: (checking: ReviewProcess) => (
        <Tag color={REVIEW_TAG_COLOR[checking]}>{REVIEW_LABEL[checking]}</Tag>
      ),
    },
    ...(role === "ADMIN"
      ? [
          {
            title: "在线状态",
            key: "status",
            width: 90,
            render: (_: unknown, record: HotelListItem) =>
              record.status === 1 ? (
                <Tag color="success">在线</Tag>
              ) : (
                <Tag color="default">已下线</Tag>
              ),
          } as const,
        ]
      : []),
    {
      title: "操作",
      key: "action",
      width: role === "ADMIN" ? 200 : 140,
      fixed: "right" as const,
      render: (_: unknown, record: HotelListItem) => {
        const nodes: React.ReactNode[] = [];
        if (role === "MERCHANT") {
          nodes.push(
            <Button type="link" size="small" key="edit" onClick={() => handleEdit(record)}>
              编辑
            </Button>
          );
          if (record.checking === "REJECTED") {
            nodes.push(
              <Button type="link" size="small" key="view" onClick={() => openViewAuditNote(record)}>
                查看
              </Button>
            );
          }
        }
        if (role === "ADMIN") {
          // 管理员仅对「在线且待审核」的酒店展示审核按钮
          if (record.status === 1 && record.checking === "PENDING") {
            nodes.push(
              <Button type="link" size="small" key="audit" onClick={() => openAudit(record)}>
                审核
              </Button>
            );
          }
          if (record.status === 1 && record.checking === "PUBLISHED") {
            nodes.push(
              <Popconfirm
                key="offline"
                title="确定下线该酒店？"
                onConfirm={() => handleOffline(record)}
              >
                <Button type="link" size="small" danger>
                  下线
                </Button>
              </Popconfirm>
            );
          }
          if (record.status === 0) {
            nodes.push(
              <Button
                type="link"
                size="small"
                key="online"
                onClick={() => handleOnline(record)}
              >
                上线
              </Button>
            );
          }
        }
        return <Space size="small">{nodes}</Space>;
      },
    },
  ];

  return (
    <div style={{ padding: "0 0 24px" }}>
      <Card className="mb" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={onSearch} initialValues={{ checking: undefined, status: undefined }}>
          <Form.Item name="name" label="酒店名称">
            <Input placeholder="请输入酒店名称" allowClear style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="checking" label="审核状态">
            <Select
              placeholder="全部"
              allowClear
              style={{ width: 120 }}
              options={[
                { value: "PENDING", label: "审核中" },
                { value: "PUBLISHED", label: "已发布" },
                { value: "REJECTED", label: "已拒绝" },
                { value: "DRAFT", label: "草稿" },
              ]}
            />
          </Form.Item>
          <Form.Item name="status" label="在线状态">
            <Select
              placeholder="全部"
              allowClear
              style={{ width: 100 }}
              options={[
                { value: 1, label: "在线" },
                { value: 0, label: "已下线" },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={onReset}>
              重置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="酒店列表">
        <Table<HotelListItem>
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
          scroll={{ x: 800 }}
        />
      </Card>

      <EditHotelModal
        open={editModalOpen}
        hotelId={editHotelId}
        onClose={closeEditModal}
        onSuccess={() => fetchList(getCurrentFilterParams())}
      />

      <AuditHotelModal
        open={auditModalOpen}
        hotelId={auditHotelId}
        onClose={closeAuditModal}
        onSuccess={() => fetchList(getCurrentFilterParams())}
      />

      <Modal
        title="审核意见"
        open={viewAuditNoteHotelId !== null}
        onCancel={closeViewAuditNote}
        footer={[<Button key="close" onClick={closeViewAuditNote}>关闭</Button>]}
        width={480}
      >
        {viewAuditNoteLoading ? (
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <Spin />
          </div>
        ) : (
          <div style={{ whiteSpace: "pre-wrap", minHeight: 60 }}>
            {viewAuditNoteContent !== null && viewAuditNoteContent !== ""
              ? viewAuditNoteContent
              : "无"}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default HotelList;
