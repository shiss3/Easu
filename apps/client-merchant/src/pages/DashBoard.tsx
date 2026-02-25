import { Card, Row, Col, Statistic, Spin } from "antd";
import {
  ShopOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  AuditOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import type { ManagerRole } from "../api/users";
import {
  getDashboardStats,
  type DashboardStatsMerchant,
  type DashboardStatsAdmin,
} from "../api/hotels";

const cardStyle: React.CSSProperties = {
  background: "#fafafa",
  borderRadius: 8,
  border: "1px solid #f0f0f0",
};

function DashBoard() {
  const role = useSelector((s: RootState) => s.authSlice.managerInfo?.role) as ManagerRole | undefined;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStatsMerchant | DashboardStatsAdmin | null>(null);

  useEffect(() => {
    setLoading(true);
    getDashboardStats()
      .then((res) => setStats(res.data ?? null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: "0 0 24px" }}>

      {role === "MERCHANT" && stats && "onlineCount" in stats && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card style={cardStyle}>
              <Statistic
                title="名下在线酒店总数（家）"
                value={(stats as DashboardStatsMerchant).onlineCount}
                valueStyle={{ fontWeight: 700, fontSize: 28 }}
                prefix={<ShopOutlined style={{ color: "#1890ff", marginRight: 8 }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card style={cardStyle}>
              <Statistic
                title="审核中酒店总数（家）"
                value={(stats as DashboardStatsMerchant).pendingCount}
                valueStyle={{ fontWeight: 700, fontSize: 28 }}
                prefix={<ClockCircleOutlined style={{ color: "#52c41a", marginRight: 8 }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card style={cardStyle}>
              <Statistic
                title="被拒绝酒店总数（家）"
                value={(stats as DashboardStatsMerchant).rejectedCount}
                valueStyle={{ fontWeight: 700, fontSize: 28 }}
                prefix={<CloseCircleOutlined style={{ color: "#ff4d4f", marginRight: 8 }} />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {role === "ADMIN" && stats && "totalCount" in stats && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={12}>
            <Card style={cardStyle}>
              <Statistic
                title="酒店总数（家）"
                value={(stats as DashboardStatsAdmin).totalCount}
                valueStyle={{ fontWeight: 700, fontSize: 28 }}
                prefix={<GlobalOutlined style={{ color: "#1890ff", marginRight: 8 }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={12}>
            <Card style={cardStyle}>
              <Statistic
                title="待审核酒店总数（家）"
                value={(stats as DashboardStatsAdmin).pendingCount}
                valueStyle={{ fontWeight: 700, fontSize: 28 }}
                prefix={<AuditOutlined style={{ color: "#fa8c16", marginRight: 8 }} />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {!stats && !loading && (
        <div style={{ padding: 24, color: "#999" }}>暂无数据</div>
      )}
    </div>
  );
}

export default DashBoard;
