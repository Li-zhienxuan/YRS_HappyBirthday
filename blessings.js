// _worker.js

// 绑定到你的 KV 命名空间名称
const KV_NAMESPACE = 'BIRTHDAY_BLESSINGS'; 

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // 1. 检查是否为我们的 API 路径
        if (url.pathname === "/api/blessings") {
            const kv = env[KV_NAMESPACE]; // 获取 KV 绑定实例

            if (!kv) {
                // 如果 KV 绑定未找到 (配置错误)，返回 500
                return new Response("KV namespace binding missing.", { status: 500 });
            }

            // 2. 处理 GET 请求（读取祝福）
            if (request.method === "GET") {
                try {
                    const keys = await kv.list();
                    const blessingPromises = keys.keys.map(keyInfo => kv.get(keyInfo.name, 'json'));
                    let blessings = await Promise.all(blessingPromises);
                    
                    // 过滤掉可能存在的 null 值
                    blessings = blessings.filter(b => b !== null);

                    // 按时间戳降序排列，新的在前 (假设 key name 是时间戳)
                    blessings.sort((a, b) => b.timestamp - a.timestamp);

                    return new Response(JSON.stringify(blessings), {
                        headers: { 'Content-Type': 'application/json' },
                    });
                } catch (error) {
                    console.error("KV Read Error:", error);
                    return new Response(JSON.stringify({ error: "Failed to read blessings." }), { status: 500 });
                }
            }

            // 3. 处理 POST 请求（提交祝福）
            if (request.method === "POST") {
                try {
                    const data = await request.json();
                    const name = data.name ? String(data.name).trim() : '匿名用户';
                    const blessing = data.blessing ? String(data.blessing).trim() : '生日快乐';

                    if (!name || !blessing) {
                        return new Response(JSON.stringify({ error: "Name and blessing are required." }), { status: 400 });
                    }

                    // 创建时间戳作为唯一键
                    const timestamp = Date.now(); 
                    const key = `blessing:${timestamp}`;
                    const value = { name, blessing, timestamp };

                    // 写入 KV (TTL: 30天)
                    await kv.put(key, JSON.stringify(value), { expirationTtl: 60 * 60 * 24 * 30 }); 

                    return new Response(JSON.stringify({ message: "Blessing received.", id: key }), {
                        status: 201, 
                        headers: { 'Content-Type': 'application/json' },
                    });

                } catch (error) {
                    console.error("KV Write Error:", error);
                    return new Response(JSON.stringify({ error: "Invalid JSON or server error." }), { status: 400 });
                }
            }
            
            // 4. 对于 API 路径，但不是 GET/POST 的请求，返回 405
            return new Response("Method Not Allowed", { status: 405 });
        }

        // 5. 如果请求不是 API 路径，让 Cloudflare Pages 自动处理静态资产 (index.html/CSS/JS)
        // 在 Pages 的根目录 Worker 模式下，未被 Worker 拦截的请求会自动回退到 Pages 的静态文件。
        // 因为你的 /api/blessings 被上面的 if 语句拦截了，其他请求 (如 /) 将由 Pages 正常服务 index.html。
        
        // 确保 Worker 不处理非 API 路径，让 Pages 处理
        return env.ASSETS.fetch(request); 
    }
};