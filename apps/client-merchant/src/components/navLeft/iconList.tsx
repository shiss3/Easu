import type { ReactNode } from "react";
import {
  DashboardOutlined,
  BankOutlined,
  UnorderedListOutlined,
  UserOutlined,
  AppstoreAddOutlined,
} from "@ant-design/icons";

const icons: Record<string, ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  BankOutlined: <BankOutlined />,
  UnorderedListOutlined: <UnorderedListOutlined />,
  UserOutlined: <UserOutlined />,
  AppstoreAddOutlined: <AppstoreAddOutlined />,
};

export default icons;