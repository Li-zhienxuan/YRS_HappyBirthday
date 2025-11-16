// --- functions/blessings.js 最终版代码 ---

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export default {
    async fetch(request, env, ctx) {
        // 1. 处理预检请求
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }
        
        // 2. 检查 KV 绑定是否可用
        const KV = env.BIRTHDAY_BLESSINGS;
        if (!KV) {
            // 如果看到这个错误，说明 Pages 上的 KV 绑定名称不对
            return new Response("KV Namespace not bound. Please check the 'Bindings' in Pages settings.", { status: 500, headers: corsHeaders });
        }

        // 3. 处理 GET 请求 (获取祝福)
        if (request.method === "GET") {
            try {
                // 读取数据，如果没有则返回空数组
                const data = await KV.get("all_blessings", { type: "json" });
                const blessings = data || [];
                
                return new Response(JSON.stringify(blessings), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            } catch (e) {
                return new Response(`KV Read Error: ${e.message}`, { status: 500, headers: corsHeaders });
            }
        }

        // 4. 处理 POST 请求 (提交祝福)
        if (request.method === "POST") {
            try {
                // 读取旧数据
                const oldBlessings = (await KV.get("all_blessings", { type: "json" })) || [];
                const newBlessing = await request.json();

                if (!newBlessing.name || !newBlessing.blessing) {
                    return new Response("Missing name or blessing payload", { status: 400, headers: corsHeaders });
                }

                // 添加新祝福到最前面
                oldBlessings.unshift(newBlessing);
                await KV.put("all_blessings", JSON.stringify(oldBlessings));
                
                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });

            } catch (e) {
                return new Response(`KV Write Error: ${e.message}`, { status: 500, headers: corsHeaders });
            }
        }

        // 不允许其他方法
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    },
};