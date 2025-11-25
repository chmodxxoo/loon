// 名称: mt秒杀时间匹配插件
// 描述: 为mt秒杀接口匹配0,12,14,16,18点时间戳
// 修改时间: 2025-11-25
// 触发URL: https://rights-apigw.meituan.com/api/rights/activity/secKill/info

(function() {
    'use strict';

    const body = $response.body;
    if (!body) {
        $done({});
        return;
    }

    try {
        // 预设的秒杀时间点（小时）
        const TARGET_HOURS = [0, 12, 14, 16, 18];

        // 获取当前时间
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentSeconds = now.getSeconds();

        console.log(`🕒 当前时间: ${now.toLocaleString()}`);

        // 找到下一个目标时间点
        let targetHour = null;
        let isTomorrow = false;

        // 按顺序检查每个时间点
        for (const hour of TARGET_HOURS) {
            if (currentHour < hour || (currentHour === hour && currentMinutes === 0 && currentSeconds === 0)) {
                targetHour = hour;
                break;
            }
        }

        // 如果当前时间超过所有预设时间点，则使用第二天的第一个时间点
        if (targetHour === null) {
            targetHour = TARGET_HOURS[0];
            isTomorrow = true;
        }

        // 创建目标时间对象
        const targetDate = new Date();
        if (isTomorrow) {
            targetDate.setDate(targetDate.getDate() + 1);
        }
        targetDate.setHours(targetHour, 0, 0, 0);

        // 获取时间戳（秒级）
        const targetTimestamp = Math.floor(targetDate.getTime() / 1000);
        const currentTimestamp = Math.floor(now.getTime() / 1000);

        console.log(`🎯 匹配时间点: ${targetHour}:00 ${isTomorrow ? '(明天)' : '(今天)'}`);
        console.log(`⏰ 目标时间: ${targetDate.toLocaleString()}`);
        console.log(`📊 目标时间戳: ${targetTimestamp}`);
        console.log(`📊 当前时间戳: ${currentTimestamp}`);

        // 修改响应体
        let modifiedBody;
        if (typeof body === 'string') {
            const data = JSON.parse(body);

            // 修改currentTime字段
            if (data.currentTime !== undefined) {
                console.log(`🔧 修改前 currentTime: ${data.currentTime}`);
                data.currentTime = targetTimestamp;
                console.log(`🔧 修改后 currentTime: ${data.currentTime}`);
            }

            // 如果有其他相关时间字段也可以一并修改
            const timeFields = ['currentTime', 'serverTime', 'timestamp', 'time'];
            timeFields.forEach(field => {
                if (data[field] !== undefined) {
                    console.log(`🔧 修改 ${field}: ${data[field]} -> ${targetTimestamp}`);
                    data[field] = targetTimestamp;
                }
            });

            // 检查data字段（常见于mtAPI）
            if (data.data && typeof data.data === 'object') {
                timeFields.forEach(field => {
                    if (data.data[field] !== undefined) {
                        console.log(`🔧 修改 data.${field}: ${data.data[field]} -> ${targetTimestamp}`);
                        data.data[field] = targetTimestamp;
                    }
                });
            }

            modifiedBody = JSON.stringify(data);
        } else {
            modifiedBody = body;
        }

        console.log(`✅ mt秒杀时间匹配完成`);
        $.notify('美团秒杀时间', '修改成功', `✅`);
        $done({
            body: modifiedBody
        });

    } catch (error) {
        console.log(`❌ 插件执行错误: ${error}`);
        console.log(`❌ 错误详情: ${error.stack}`);
        $done({
            body: body
        });
    }
})();


// 兼容 Loon 的 Env 类
function Env() {
    const isLoon = typeof $loon !== 'undefined';

    const wrapPromise = (options, method) => {
        return new Promise((resolve, reject) => {
            const httpClientMethod = method === 'POST' ? $httpClient.post : (method === 'PUT' ? $httpClient.put : $httpClient.get);
            httpClientMethod(options, (err, resp, body) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ body, status: resp.statusCode, headers: resp.headers });
                }
            });
        });
    };

    const http = {
        get: (options) => wrapPromise(options, 'GET'),
        post: (options) => {
            if (typeof options.body === 'object' && options.body !== null) {
                options.headers['Content-Type'] = 'application/json;charset=UTF-8';
                options.body = JSON.stringify(options.body);
            }
            return wrapPromise(options, 'POST');
        },
        put: (options) => {
            if (typeof options.body === 'object' && options.body !== null) {
                options.headers['Content-Type'] = 'application/json;charset=UTF-8';
                options.body = JSON.stringify(options.body);
            }
            return wrapPromise(options, 'PUT');
        }
    };

    const notify = (title, subtitle = '', body = '') => isLoon ? $notification.post(title, subtitle, body) : console.log(`${title}\n${subtitle}\n${body}`);
    const log = (msg) => console.log(msg);
    const logErr = (e) => console.log(e.stack || e);
    const done = (value = {}) => isLoon ? $done(value) : null;

    return { http, notify, log, logErr, done };
}
