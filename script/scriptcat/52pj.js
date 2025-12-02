// ==UserScript==
// @name         吾爱破解每日定时签到【脚本猫专用】
// @version      0.4.0-beta
// @description  定时脚本，每日1次，需要先登陆www.52pojie.cn。（作者不提供任何保证，使用本脚本一切后果自负，否则别用）
// @author       DreamNya
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @connect      52pojie.cn
// @crontab      1-59 * once * *
// ==/UserScript==

return new Promise((resolve, reject) => {
    Main();

    function Main(ran = false) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://www.52pojie.cn/home.php?mod=task&do=apply&id=2',
            onload: (xhr) => {
                console.log(xhr);
                const result = Check(xhr.responseText);
                if (result) return;
                try {
                    if (ran) throw new Error('sencond run');
                    // 一个破签到几千行混淆？ 不会真以为有人会去看吧 不会吧 不会吧
                    const script = xhr.responseText
                        .match(/<script.*?>[\s\S]*<\/script>/)[0]
                        .replace(/<\/?script.*?>/g, '');
                    try {
                        EVAL(script);
                    } catch (err1) {
                        console.error(err1);
                        try {
                            eval(script);
                        } catch (err2) {
                            console.error(err2);
                            Fail('未知错误-详见调试（吾爱开始更换签到接口 脚本随时可能失效）1');
                        }
                    }
                } catch (err3) {
                    console.error(err3);
                    Fail('未知错误-详见调试（吾爱开始更换签到接口 脚本随时可能失效）2');
                }
            },
            ontimeout: (xhr) => {
                console.log(xhr);
                Fail('网络错误-Timeout');
            },
            onerror: (xhr) => {
                console.log(xhr);
                Fail('网络错误-Error');
            },
        });
    }

    function EVAL(string) {
        const newString = string.replace(/window.*?;/, (m) => {
            let a = m.match(/=.*;/);
            if (!a) {
                //Fail();
                throw new Error
            } else {
                let b = a[0];
                let c = b.replace(/=|;/g, '');
                if (c == b) {
                    //Fail();
                    throw new Error
                } else {
                    return `GMxhr(${c});`;
                }
            }
        });
        eval(newString);
    }

    function GMxhr(url) {
        GM_xmlhttpRequest({
            url: 'https://www.52pojie.cn' + url,
            method: 'GET',
            onload: (xhr) => {
                console.log(xhr);
                const result = Check(xhr.responseText);
                if (!result) {
                    Fail();
                }
            },
        });
    }

    function Fail(text = '接口更新失效') {
        const finalText = '吾爱破解定时签到失败 - ' + text;
        GM_notification(finalText);
        reject(finalText);
    }

    function Check(responseText) {
        const presetNotify = {
            任务已完成: '吾爱破解定时签到成功',
            本期您已申请过此任务: '吾爱破解定时签到失败 - 重复签到',
            您需要先登录才能继续本操作: '吾爱破解定时签到失败 - 未登录',
        };
        const presetFail = {
            请完成安全验证: '触发安全验证-手动消除后重试',
        };
        for (const preset in presetNotify) {
            if (responseText.includes(preset)) {
                Notify(presetNotify[preset]);
                return true;
            }
        }
        for (const preset in presetFail) {
            if (responseText.includes(preset)) {
                Fail(presetFail[preset]);
                return true;
            }
        }
        return false;
    }

    function Notify(text) {
        GM_notification(text);
        resolve(text);
    }

    XMLHttpRequest.prototype.send = function (data) {
        // 咱们脚本猫就是NB 我管你怎么混淆的 最后还不是乖乖得来通信
        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://www.52pojie.cn/waf_zw_verify',
            data,
            onload: (xhr) => {
                console.log(xhr);
                Main(true);
            },
        });
    };

    const realStringify = JSON.stringify;
    JSON.stringify = function (obj) {
        // 有用吗？ 有用吗？ 有用吗？
        if (obj.hostname) obj.hostname = 'www.52pojie.cn';
        if (obj.scheme) obj.scheme = 'https';
        if (obj.fp_infos.protocol) obj.fp_infos.protocol = 'https';
        if (obj.protocol) obj.protocol = 'https';
        console.log(obj);
        return realStringify(obj);
    };
});

