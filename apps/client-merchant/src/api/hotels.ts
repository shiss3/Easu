import { post, get, patch, type ApiResponse } from "../utils/http/request";

// 审核状态枚举
export type ReviewProcess = "PENDING" | "PUBLISHED" | "REJECTED" | "DRAFT";

// 房型信息
export interface RoomType {
  name: string;
  price: number;
  bedInfo: string;
  images: string[];
  inventory: number;
}

//创建酒店请求体
export interface CreateHotelPayload {
  name: string;
  address: string;
  city: string;
  star: number;
  coverImage: string;
  images: string[];
  description?: string;
  tags: string[];
  priceDesc?: string;

  roomTypes: RoomType[];
}

// 审核意见
export interface ReviewHotelPayload {
  action: "APPROVE" | "REJECT";
  adminNote?: string;
}

// 创建酒店成功返回的酒店信息
export interface Hotel {
  id: number;
  name: string;
  address: string;
  city: string;
  star: number;
  coverImage: string;
  images: string[];
  checking: ReviewProcess;
  status: number;
  [key: string]: unknown;
}

// ---------- 商户端接口 ----------

// 酒店列表项
export interface HotelListItem {
  id: number;
  name: string;
  address: string;
  city: string;
  checking: ReviewProcess;
  status: number;
  ownerId: number | null;
}

// 工作台统计：商户端 onlineCount/pendingCount/rejectedCount，管理员端 totalCount/pendingCount
export interface DashboardStatsMerchant {
  onlineCount: number;
  pendingCount: number;
  rejectedCount: number;
}

export interface DashboardStatsAdmin {
  totalCount: number;
  pendingCount: number;
}

// 工作台数据获取
export function getDashboardStats(): Promise<
  ApiResponse<DashboardStatsMerchant | DashboardStatsAdmin>
> {
  return get<DashboardStatsMerchant | DashboardStatsAdmin>("/hotel-manager/dashboard/stats");
}

// 获取酒店列表；支持name、checking、status筛选
export function getHotelList(params?: {
  name?: string;
  checking?: ReviewProcess;
  status?: number;
}): Promise<ApiResponse<HotelListItem[]>> {
  return get<HotelListItem[]>("/hotel-manager/hotels", params);
}

// 获取酒店详情
export interface HotelDetailForEdit {
  id: number;
  name: string;
  address: string;
  city: string;
  star: number;
  coverImage: string;
  images: string[];
  description?: string;
  tags: string[];
  priceDesc?: string;
  checking: ReviewProcess;
  status: number;
  // 管理员填写的审核意见
  adminNote?: string;
  roomTypes: {
    id?: number;
    name: string;
    price: number;
    bedInfo: string;
    images: string[];
    inventory: number;
  }[];
}

export function getHotelDetail(id: number): Promise<ApiResponse<HotelDetailForEdit>> {
  return get<HotelDetailForEdit>(`/hotel-manager/hotels/${id}`);
}

// 酒店更新：商户传完整酒店信息（会置为待审核）；管理员传{ action, adminNote }
export function updateHotel(
  id: number,
  payload: CreateHotelPayload | ReviewHotelPayload
): Promise<ApiResponse<null>> {
  return patch<null>(`/hotel-manager/hotels/${id}`, payload);
}


// 管理员下线酒店（仅 status=1 且 checking=PUBLISHED 时可下线）
export function setHotelOffline(id: number): Promise<ApiResponse<null>> {
  return post<null>(`/hotel-manager/admin/offline/${id}`, {});
}

// 管理员上线酒店（status=0 时可上线，上线后 checking 置为 PENDING 待审核）
export function setHotelOnline(id: number): Promise<ApiResponse<null>> {
  return post<null>(`/hotel-manager/admin/online/${id}`, {});
}

// 商户创建酒店
export function createMerchantHotel(
  payload: CreateHotelPayload
): Promise<ApiResponse<Hotel>> {
  return post<Hotel>("/hotel-manager/merchant/hotels", payload);
}


