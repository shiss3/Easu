import { Card, Descriptions } from "antd";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import type { ManagerRole } from "../api/users";

const ROLE_LABEL: Record<ManagerRole, string> = {
  MERCHANT: "商户",
  ADMIN: "管理员",
};

export default function Personal() {
  const managerInfo = useSelector((s: RootState) => s.authSlice.managerInfo);

  if (!managerInfo) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <p style={{ color: "#999" }}>暂无用户信息，请重新登录。</p>
        </Card>
      </div>
    );
  }

  const items: { key: string; label: string; children: string }[] = [
    { key: "name", label: "用户名", children: managerInfo.name },
    { key: "role", label: "身份", children: ROLE_LABEL[managerInfo.role] ?? managerInfo.role },
    { key: "phone", label: "电话", children: managerInfo.phone || "—" },
    { key: "email", label: "邮箱", children: managerInfo.email || "—" },
  ];

  return (
    <div style={{ padding: "0 0 24px" }}>
      <Card>
        <Descriptions title="基础信息" column={1} bordered items={items} />
      </Card>
    </div>
  );
}
