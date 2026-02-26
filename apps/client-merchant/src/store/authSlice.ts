import { createSlice } from "@reduxjs/toolkit";
import type { ManagerRole } from "../api/users";

const MERCHANT_AUTH_STORAGE_KEY = "merchant-auth-storage";

export interface ManagerInfo {
    id: number;
    name: string;
    role: ManagerRole;
    phone: string;
    email: string;
}

// 仅 state 形状，不含 actions
interface AuthState {
    token: string | null;
    refreshToken: string | null;
    managerInfo: ManagerInfo | null;
    menuList: unknown[];
}

function loadPersisted(): Pick<AuthState, "token" | "refreshToken" | "managerInfo"> {
    try {
        const raw = localStorage.getItem(MERCHANT_AUTH_STORAGE_KEY);
        if (!raw) return { token: null, refreshToken: null, managerInfo: null };
        const data = JSON.parse(raw) as {
            accessToken?: string | null;
            refreshToken?: string | null;
            managerInfo?: ManagerInfo | null;
        };
        return {
            token: data.accessToken ?? null,
            refreshToken: data.refreshToken ?? null,
            managerInfo: data.managerInfo ?? null,
        };
    } catch {
        return { token: null, refreshToken: null, managerInfo: null };
    }
}

function savePersisted(accessToken: string | null, refreshToken: string | null, managerInfo: ManagerInfo | null) {
    try {
        localStorage.setItem(
            MERCHANT_AUTH_STORAGE_KEY,
            JSON.stringify({ accessToken, refreshToken, managerInfo })
        );
    } catch {
        // ignore
    }
}

function clearPersisted() {
    try {
        localStorage.removeItem(MERCHANT_AUTH_STORAGE_KEY);
    } catch {
        // ignore
    }
}

const persisted = loadPersisted();

const authSlice = createSlice({
    name: "auth",
    initialState: {
        token: persisted.token,
        refreshToken: persisted.refreshToken,
        managerInfo: persisted.managerInfo,
        menuList: [] as unknown[],
    } satisfies AuthState,
    reducers: {
        setLogin: (state, action: { payload: { accessToken: string; refreshToken: string; managerInfo: ManagerInfo } }) => {
            state.token = action.payload.accessToken;
            state.refreshToken = action.payload.refreshToken;
            state.managerInfo = action.payload.managerInfo;
            savePersisted(action.payload.accessToken, action.payload.refreshToken, action.payload.managerInfo);
        },
        setToken: (state, action: { payload: string }) => {
            state.token = action.payload;
            savePersisted(action.payload, state.refreshToken, state.managerInfo);
        },
        setMenu: (state, action: { payload: unknown[] }) => {
            state.menuList = action.payload;
        },
        logout: (state) => {
            state.token = null;
            state.refreshToken = null;
            state.managerInfo = null;
            state.menuList = [];
            clearPersisted();
        },
    },
});

export const { setLogin, setToken, setMenu, logout } = authSlice.actions;
export default authSlice.reducer;
