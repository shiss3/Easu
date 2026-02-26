import { useLocation } from "react-router-dom";
import { Breadcrumb } from "antd";

// 面包屑组件，显示当前路由信息

interface MenuItem {
  key: string;
  label: string;
  children?: MenuItem[];
}

// 静态菜单结构，与侧边栏保持一致，仅用于展示当前路由对应的层级标题
const staticMenu: MenuItem[] = [
  {
    key: "/home",
    label: "工作台",
  },
  {
    key: "/hotels",
    label: "酒店管理",
    children: [
      {
        key: "/home/hotels/list",
        label: "酒店列表",
      },
      {
        key: "/home/hotels/add",
        label: "新增酒店",
      },
    ],
  },
  {
    key: "/home/personal",
    label: "个人中心",
  },
];

function getBreadcrumbLabels(path: string): string[] {
  for (const item of staticMenu) {
    if (item.children) {
      const child = item.children.find((c) => c.key === path);
      if (child) {
        return [item.label, child.label];
      }
    }
    if (item.key === path) {
      return [item.label];
    }
  }
  return [];
}

function MyBreadCrumb() {
  const location = useLocation();
  const labels = getBreadcrumbLabels(location.pathname);
  const breadList = labels.map((label) => ({ title: label }));
  return <Breadcrumb items={breadList} className="mt mb" />;
}

export default MyBreadCrumb;

