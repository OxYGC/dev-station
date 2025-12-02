// ==UserScript==
// @name        网易云音乐电脑签到
// @namespace   https://docs.scriptcat.org/
// @version     1.0.4
// @description 仅执行网易云音乐电脑签到
// @author      GC/ tampermonkey.net.cn@subot
// @icon         https://music.163.com/favicon.ico
// @grant       GM_xmlhttpRequest
// @grant       GM_notification
// @connect      music.163.com
// @crontab      * * once * *
// ==/UserScript==

return new Promise(async (resolve, reject) => {
    try {
        // 封装电脑签到请求函数 (模仿正常脚本的写法)
        const sign = () => {
            return new Promise((resolve, reject) => {
                const url = `https://music.163.com/api/point/dailyTask?type=1` ;
                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    withCredentials: true, // 关键：携带 Cookie
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
                        "Referer": "https://music.163.com/"
                    },
                    onload: function (response) {
                        if (response.status >= 200 && response.status < 300) {
                            try {
                                const data = JSON.parse(response.responseText);
                                resolve(data);
                            } catch (e) {
                                reject(new Error(`解析响应失败: ${e.message}`));
                            }
                        } else {
                            reject(new Error(`HTTP请求失败: ${response.status}${response.statusText}`));
                        }
                    },
                    onerror: function (error) {
                        reject(new Error(`网络请求失败: ${error}`));
                    },
                    ontimeout: function () {
                        reject(new Error('请求超时'));
                    },
                    timeout: 10000 // 10秒超时
                });
            });
        };

        // 执行电脑签到
        const pc = await sign();

        // 构造通知信息
        // 网易云API返回的 code: 200 表示成功, -2 表示已签到
        const msg = (pc.code === 200 || pc.code === -2)
            ? `网易云电脑签到成功！(${pc.msg || pc.code})`
            : `网易云电脑签到失败：${pc.msg || pc.code}`;

        // 打印日志
        console.log(msg);

        // 弹出通知
        GM_notification({
            title: "网易云电脑签到",
            text: msg,
            timeout: 5000
        });

        resolve(msg);
    } catch (err) {
        const errorMsg = `网易云电脑签到出错: ${err.toString()}`;
        GM_notification({
            title: "签到失败",
            text: errorMsg,
            timeout: 5000
        });
        console.error(errorMsg);
        reject(err);
    }
});
