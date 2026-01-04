/* ===========================
 * Nav-site Data Layer
 * =========================== */

export const STORAGE_KEY = 'nav_site_data_v2';
export const GROUP_ORDER_KEY = 'nav_group_order';
export const DEFAULT_CONF_URL =
    'https://raw.githubusercontent.com/OxYGC/dev-station/refs/heads/main/demo-nav/data/default-conf.json';

/**
 * 应用内唯一状态源
 */
export let state = {
    config: {
        title: '',
        subTitle: '',
        footerText: ''
    },
    categoryList: [],
    data: []
};

/* ===========================
 * 工具函数
 * =========================== */

function safeJSONParse(raw) {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/* ===========================
 * 持久化
 * =========================== */

export function persistState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    const groupOrder = state.categoryList.map(c => c.id);
    localStorage.setItem(GROUP_ORDER_KEY, JSON.stringify(groupOrder));
}

/* ===========================
 * 分组顺序恢复
 * =========================== */

export function applyGroupOrder() {
    const raw = localStorage.getItem(GROUP_ORDER_KEY);
    if (!raw) return;

    const order = safeJSONParse(raw);
    if (!Array.isArray(order)) return;

    const map = new Map(state.categoryList.map(c => [c.id, c]));
    state.categoryList = order
        .map(id => map.get(id))
        .filter(Boolean);
}

/* ===========================
 * 主加载流程
 * =========================== */

export async function loadAppState() {
    // 1️⃣ 优先 localStorage
    const localRaw = localStorage.getItem(STORAGE_KEY);
    if (localRaw) {
        const localState = safeJSONParse(localRaw);
        if (localState?.categoryList && localState?.data) {
            state = localState;
            console.log('[Nav-site] Loaded from localStorage');
            return state;
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    // 2️⃣ 拉 default-conf.json
    console.log('[Nav-site] Loading default-conf.json');
    const confResp = await fetch(DEFAULT_CONF_URL);
    if (!confResp.ok) {
        throw new Error('Failed to load default-conf.json');
    }
    const conf = await confResp.json();

    // 3️⃣ 解析 config（严格字段）
    state.config = {
        title: conf.config?.title || '',
        subTitle: conf.config?.subTitle || '',
        footerText: conf.config?.footerText || ''
    };

    // 4️⃣ 使用 api.homeUrl 拉真实站点数据
    const apiUrl = conf.api?.homeUrl;
    if (!apiUrl) {
        throw new Error('default-conf.json missing api.homeUrl');
    }

    console.log('[Nav-site] Loading nav data:', apiUrl);
    const dataResp = await fetch(apiUrl);
    if (!dataResp.ok) {
        throw new Error('Failed to load nav data');
    }

    const remote = await dataResp.json();

    // 5️⃣ 严格字段映射
    state.categoryList = Array.isArray(remote.categoryList)
        ? remote.categoryList.map(c => ({
            id: c.id,
            name: c.name,
            desc: c.desc,
            weight: c.weight ?? 0
        }))
        : [];

    state.data = Array.isArray(remote.data)
        ? remote.data.map(d => ({
            id: d.id,
            categoryId: d.categoryId,
            name: d.name,
            desc: d.desc,
            url: d.url,
            logoUrl: d.logoUrl,
            weight: d.weight ?? 0,
            date: d.date
        }))
        : [];

    // 6️⃣ 保存为本地基准
    persistState();

    console.log('[Nav-site] Initialized from remote');
    return state;
}

/* ===========================
 * 重置（调试用）
 * =========================== */

export function clearAllData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(GROUP_ORDER_KEY);

    state = {
        config: { title: '', subTitle: '', footerText: '' },
        categoryList: [],
        data: []
    };

    console.log('[Nav-site] All data cleared');
}