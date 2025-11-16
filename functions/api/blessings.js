// --- 把下面所有代码复制到你的 Worker ---

// CORS 预检请求和响应头，允许你的网页访问
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // 允许所有域名访问，简单起见
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env, ctx) {
    // 专门处理浏览器发送的 CORS 预检请求 (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // 只响应 /api/blessings 这一个路径
    if (url.pathname !== "/api/blessings") {
      return new Response("Not found", { status: 404 });
    }
    
    // --- 关键：确保你绑定了名为 BIRTHDAY_BLESSINGS 的 KV ---
    const KV = env.BIRTHDAY_BLESSINGS;
    if (!KV) {
        return new Response("KV Namespace not bound", { status: 500 });
    }

    // 处理“获取祝福”的请求 (GET)
    if (request.method === "GET") {
      // 从KV中读取"all_blessings"这个键的值，我们假设它是一个JSON字符串
      const data = await KV.get("all_blessings", { type: "json" });
      
      // 如果还没有数据（比如第一次），返回一个空数组
      const blessings = data || [];
      
      // 返回 JSON 数据，并带上CORS头
      return new Response(JSON.stringify(blessings), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // 处理“提交祝福”的请求 (POST)
    if (request.method === "POST") {
      try {
        // 1. 读取旧数据
        const oldBlessings = (await KV.get("all_blessings", { type: "json" })) || [];
        
        // 2. 获取新提交的祝福
        const newBlessing = await request.json();

        // 3. 把新祝福加到数组里 (加在最前面，实现倒序)
        oldBlessings.unshift(newBlessing);

        // 4. 把更新后的完整数组存回KV
        // 注意：KV的 .put() 是覆盖写入
        await KV.put("all_blessings", JSON.stringify(oldBlessings));
        
        // 5. 返回成功
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (e) {
        return new Response(e.message, { status: 500, headers: corsHeaders });
      }
    }

    // 其他请求方法
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  },
};

// --- 代码结束 ---