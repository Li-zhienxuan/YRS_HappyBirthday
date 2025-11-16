// constants
const KEY = 'all_blessings';

export async function onRequest(context) {
    const { request, env } = context;

    // 检查是否绑定了 KV 存储
    if (!env.BLESSINGS_KV) {
        return new Response(JSON.stringify({ error: "KV binding not found." }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    // 1. 处理 GET 请求 (加载祝福)
    if (request.method === 'GET') {
        try {
            // 从 KV 中获取存储的祝福列表（默认值为空数组的JSON字符串）
            const storedBlessings = await env.BLESSINGS_KV.get(KEY, { type: "json" });
            const blessings = storedBlessings || [];

            return new Response(JSON.stringify(blessings), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: "Failed to load blessings.", details: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
    }

    // 2. 处理 POST 请求 (提交祝福)
    if (request.method === 'POST') {
        try {
            const newBlessing = await request.json();
            
            // 简单的数据校验
            if (!newBlessing.name || !newBlessing.blessing) {
                return new Response(JSON.stringify({ error: "Name and blessing are required." }), { status: 400, headers: { "Content-Type": "application/json" } });
            }

            // 1. 读取现有祝福列表
            const storedBlessings = await env.BLESSINGS_KV.get(KEY, { type: "json" });
            const blessings = storedBlessings || [];
            
            // 2. 添加新祝福
            const newEntry = {
                name: newBlessing.name.substring(0, 50), // 限制长度
                blessing: newBlessing.blessing.substring(0, 500), // 限制长度
                timestamp: Date.now()
            };
            blessings.unshift(newEntry); // 添加到数组开头

            // 3. 写入 KV (最多保留最近 100 条祝福)
            await env.BLESSINGS_KV.put(KEY, JSON.stringify(blessings.slice(0, 100)));

            return new Response(JSON.stringify({ success: true, message: "Blessing saved." }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        } catch (e) {
            return new Response(JSON.stringify({ error: "Failed to save blessing.", details: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
    }
    
    // 不支持的请求方法
    return new Response('Method Not Allowed', { status: 405 });
}