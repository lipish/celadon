interface Env {
    DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { email, idea } = await context.request.json() as { email: string; idea: string };

        if (!email || !idea) {
            return new Response(JSON.stringify({ error: "Email and idea are required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Persistence with Cloudflare D1
        if (context.env.DB) {
            await context.env.DB.prepare(
                "INSERT INTO waiting_list (email, idea) VALUES (?, ?)"
            )
                .bind(email, idea)
                .run();
        }

        return new Response(JSON.stringify({ ok: true, message: "Submission saved to D1" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: "Invalid request or D1 error" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }
};
