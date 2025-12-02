// ==UserScript==
// @name         🚀 iKuuu机场每日签到
// @namespace    https://bbs.tampermonkey.net.cn/
// @version      1.1.4
// @description  每天iKuuu机场自动签到领流量，必须使用脚本猫，请勿使用油猴
// @author       Vikrant
// @match        https://docs.scriptcat.org/dev/background.html#promise
// @icon         https://ikuuu.org/favicon.ico
// @crontab      * * once * *
// @grant        GM_xmlhttpRequest
// @grant        GM_log
// @grant        GM_notification
// @connect      ikuuu.org
// @license      GNU GPLv3
// ==/UserScript==

return new Promise((resolve, reject) => {
    let i = 0;
    let j = 0;
    GM_xmlhttpRequest({
        method: "GET",
        url: "https://ikuuu.org/user",
        onload: (xhr) => {
            if (xhr.finalUrl == "https://ikuuu.org/auth/login") {
                GM_notification({
                    title: "iKuuu未登录！",
                    text: "请点击登陆后重新运行脚本",
                    onclick: (id) => {
                        GM_openInTab("https://ikuuu.org/auth/login");
                        GM_closeNotification(id);
                    },
                    timeout: 10000,
                });
                clearInterval(scan);
                reject("未登录");
            } else if (xhr.finalUrl == "https://ikuuu.org/user") {
                //
            } else {
                clearInterval(scan);
                reject("网页跳转向了一个未知的网址");
            }
        },
    });
    function main() {
        setTimeout(() => {
            GM_xmlhttpRequest({
                method: "POST",
                url: "https://ikuuu.org/user/checkin",
                responseType: "json",
                timeout: 5000,
                onload: (xhr) => {
                    let msg = xhr.response.msg;
                    if (xhr.status == 200) {
                        clearInterval(scan);
                        resolve(msg);
                    } else {
                        GM_log("请求失败，再试一次。", "info");
                        ++i;
                        main();
                    }
                },
                ontimeout: () => {
                    GM_log("请求超时，再试一次。", "info");
                    ++i;
                    main();
                },
                onabort: () => {
                    GM_log("请求终止，再试一次。", "info");
                    ++i;
                    main();
                },
                onerror: () => {
                    GM_log("请求错误，再试一次。", "info");
                    ++i;
                    main();
                },
            });
        }, 1000 + Math.random() * 4000);
    }
    let scan = setInterval(() => {
        ++j;
        if (i >= 7) {
            GM_notification({
                title: "出错超过七次，已退出脚本。",
                text: "请检查问题并重新运行脚本。",
            });
            clearInterval(scan);
            reject("出错超过七次，已退出脚本。");
        } else if (j >= 32) {
            reject("脚本运行超时");
        }
    }, 3000);
    main();
});

/*
 .o8
"888
 888oooo.  oooo    ooo
 d88' `88b  `88.  .8'
 888   888   `88..8'
 888   888    `888'
 `Y8bod8P'     .8'
           .o..P'
           `Y8P'

oooooo     oooo  o8o  oooo                                           .
 `888.     .8'   `"'  `888                                         .o8
  `888.   .8'   oooo   888  oooo  oooo d8b  .oooo.   ooo. .oo.   .o888oo
   `888. .8'    `888   888 .8P'   `888""8P `P  )88b  `888P"Y88b    888
    `888.8'      888   888888.     888      .oP"888   888   888    888
     `888'       888   888 `88b.   888     d8(  888   888   888    888 .
      `8'       o888o o888o o888o d888b    `Y888""8o o888o o888o   "888"
*/
