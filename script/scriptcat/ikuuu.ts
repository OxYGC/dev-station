// ==UserScript==
// @name         iKuuu自动签到（ScriptCat版）
// @namespace    https://bbs.tampermonkey.net.cn/
// @version      1.0.0
// @description  每日执行自动签到，支持自动登录和网络检测
// @author       d3f4ult
// @crontab      * * once * *
// @grant        GM_xmlhttpRequest
// @grant        GM_log
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        GM_closeNotification
// @homepage     https://ikuuu.one
// ==/UserScript==

return new Promise((resolve, reject) => {
    const CONFIG = {
        AUTO_LOGIN: false,         // 是否启用自动登录
        USERNAME: "",       // 你的用户名
        PASSWORD: "",       // 你的密码
        DOMAIN: "https://ikuuu.one",
        MAX_RETRIES: 3,           // 最大重试次数
        NETWORK_CHECK_INTERVAL: 1800000,  // 检查网络的间隔时间（毫秒）
        MAX_WAIT_TIME: 3600000         // 最大等待时间（1小时）
    };

    let errorCount = 0;
    let timeoutCount = 0;
    let networkCheckTimer = null;
    let scriptStartTime = Date.now();

    // 检查网络连接
    function checkNetwork() {
        GM_log("=== 开始网络检测 ===");
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "HEAD",
                url: CONFIG.DOMAIN,
                timeout: 5000,  // 增加超时时间到5秒
                onload: (response) => {
                    GM_log(`网络检测响应状态: ${response.status}`);
                    // 只要收到响应就认为网络正常
                    if (response.status >= 200 && response.status < 600) {
                        GM_log("网络检测成功");
                        resolve(true);
                    } else {
                        GM_log(`网络检测失败，状态码: ${response.status}`);
                        resolve(false);
                    }
                },
                onerror: (error) => {
                    GM_log(`网络检测失败，错误信息: ${error}`);
                    resolve(false);
                },
                ontimeout: () => {
                    GM_log("网络检测请求超时");
                    resolve(false);
                }
            });
        });
    }

    // 显示通知
    function showNotification(title, text, options = {}) {
        GM_notification({
            title: `iKuuu - ${title}`,
            text,
            timeout: options.timeout || 5000,
            highlight: options.highlight || false,
            onclick: options.onclick
        });
    }

    // 等待网络连接
    function waitForNetwork() {
        GM_log("=== 进入网络等待函数 ===");
        return new Promise(async (resolveMain, rejectMain) => {
            let isFirstCheck = true;
            let checkCount = 0;

            // 检查是否超时
            const checkTimeout = () => {
                const elapsed = Date.now() - scriptStartTime;
                GM_log(`已等待时间: ${elapsed}ms, 最大等待时间: ${CONFIG.MAX_WAIT_TIME}ms`);

                if (elapsed > CONFIG.MAX_WAIT_TIME) {
                    GM_log("达到最大等待时间，终止执行");
                    if (networkCheckTimer) {
                        clearInterval(networkCheckTimer);
                        networkCheckTimer = null;
                    }
                    showNotification('执行超时', '脚本等待网络连接时间过长，已终止执行', { highlight: true });
                    rejectMain('等待网络连接超时');
                    return true;
                }
                return false;
            };

            // 网络检查函数
            const doNetworkCheck = async () => {
                checkCount++;
                GM_log(`=== 开始第 ${checkCount} 次网络检查 ===`);

                if (checkTimeout()) {
                    GM_log("检测到超时，停止检查");
                    return;
                }

                const isOnline = await checkNetwork();
                GM_log(`网络检查结果: ${isOnline ? '在线' : '离线'}`);

                if (isOnline) {
                    GM_log("检测到网络恢复");
                    if (networkCheckTimer) {
                        GM_log("清除定时器");
                        clearInterval(networkCheckTimer);
                        networkCheckTimer = null;
                    }
                    showNotification('网络正常', '网络连接正常，继续执行操作');
                    resolveMain(true);
                } else {
                    GM_log(`网络仍然离线，isFirstCheck=${isFirstCheck}, hasTimer=${!!networkCheckTimer}`);
                    if (isFirstCheck || !networkCheckTimer) {
                        showNotification('等待网络', '网络连接不可用，等待恢复后继续执行...', {
                            timeout: CONFIG.NETWORK_CHECK_INTERVAL * 2
                        });
                        GM_log("显示等待网络通知");

                        if (!networkCheckTimer) {
                            GM_log(`设置定期检查，间隔：${CONFIG.NETWORK_CHECK_INTERVAL}ms`);
                            networkCheckTimer = setInterval(() => {
                                GM_log("定时器触发新的检查");
                                doNetworkCheck();
                            }, CONFIG.NETWORK_CHECK_INTERVAL);
                        }
                    }
                    isFirstCheck = false;
                }
            };

            // 开始首次检查
            GM_log("开始首次网络检查");
            await doNetworkCheck();
        });
    }

    // 自动登录
    async function doLogin() {
        if (!await waitForNetwork()) return;

        if (!CONFIG.USERNAME || !CONFIG.PASSWORD) {
            showNotification('登录失败', '请先配置用户名和密码', { highlight: true });
            reject('未配置登录信息');
            return;
        }

        GM_xmlhttpRequest({
            method: "POST",
            url: `${CONFIG.DOMAIN}/auth/login`,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data: `email=${encodeURIComponent(CONFIG.USERNAME)}&passwd=${encodeURIComponent(CONFIG.PASSWORD)}`,
            timeout: 5000,
            onload: function (response) {
                try {
                    const result = JSON.parse(response.responseText);
                    if (result.ret === 1) {
                        GM_log("登录成功");
                        autoCheck();
                    } else {
                        showNotification('登录失败', result.msg, { highlight: true });
                        reject(result.msg);
                    }
                } catch (error) {
                    reject('登录响应解析失败');
                }
            },
            onerror: function (error) {
                reject('登录请求失败：' + error);
            },
            ontimeout: function () {
                reject('登录请求超时');
            }
        });
    }

    // 修改检查登录状态函数中的判断逻辑
    async function checkLogin() {
        GM_log("=== 开始检查登录状态 ===");
        try {
            GM_log("等待网络连接...");
            const networkAvailable = await waitForNetwork();
            GM_log(`网络连接状态: ${networkAvailable}`);

            if (!networkAvailable) {
                GM_log("网络不可用，退出登录检查");
                return;
            }

            GM_log("开始发送登录检查请求");
            GM_xmlhttpRequest({
                method: "GET",
                url: `${CONFIG.DOMAIN}/user`,
                timeout: 5000,
                onload: function (response) {
                    GM_log(`登录检查响应: ${response.finalUrl}`);
                    // 修改域名判断逻辑
                    if (response.finalUrl.includes('/auth/login')) {
                        if (CONFIG.AUTO_LOGIN) {
                            doLogin();
                        } else {
                            showNotification('未登录', '请点击登录后重新运行脚本', {
                                onclick: (id) => {
                                    GM_openInTab(`${CONFIG.DOMAIN}/auth/login`);
                                    GM_closeNotification(id);
                                }
                            });
                            reject("未登录");
                        }
                    } else if (response.finalUrl.includes('/user')) {
                        // 只要包含 /user 路径就认为是已登录
                        autoCheck();
                    } else {
                        GM_log(`未知的响应URL: ${response.finalUrl}`);
                        reject("网页跳转向了一个未知的网址");
                    }
                },
                // ... 其余代码保持不变 ...
            });
        } catch (error) {
            GM_log(`检查登录出错：${error}`);
            reject(error);
        }
    }

    // 执行签到
    async function autoCheck() {
        if (!await waitForNetwork()) return;

        GM_xmlhttpRequest({
            method: "POST",
            url: `${CONFIG.DOMAIN}/user/checkin`,
            timeout: 5000,
            onload: function (response) {
                try {
                    const result = JSON.parse(response.responseText);
                    GM_log("签到结果: " + JSON.stringify(result, null, 2));

                    if (result.ret === 1) {
                        showNotification('签到成功', result.msg);
                        resolve('签到成功');
                    } else {
                        showNotification('签到失败', result.msg, { highlight: true });
                        reject('签到失败: ' + result.msg);
                    }
                } catch (error) {
                    reject('签到响应解析失败');
                }
            },
            onerror: async function () {
                if (errorCount < CONFIG.MAX_RETRIES) {
                    errorCount++;
                    GM_log(`签到失败，第 ${errorCount} 次重试...`);
                    if (await waitForNetwork()) {
                        setTimeout(autoCheck, 3000);
                    }
                } else {
                    showNotification('签到失败', '请检查网络连接或登录状态', { highlight: true });
                    reject(`签到失败：已重试${CONFIG.MAX_RETRIES}次`);
                }
            },
            ontimeout: async function () {
                if (timeoutCount < CONFIG.MAX_RETRIES) {
                    timeoutCount++;
                    if (await waitForNetwork()) {
                        setTimeout(autoCheck, 3000);
                    }
                } else {
                    showNotification('签到超时', '无法连接到服务器，请检查网络设置', { highlight: true });
                    reject(`签到超时：已重试${CONFIG.MAX_RETRIES}次`);
                }
            }
        });
    }

    // 开始执行
    checkLogin();
});