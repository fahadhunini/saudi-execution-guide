export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const body = req.body || {};

    const question =
      body.question ||
      body.q ||
      body.message ||
      "";

    if (!question.trim()) {
      return res.status(400).json({
        error: "اكتب السؤال أولًا"
      });
    }

    const context =
      body.context ||
      body.executionContext ||
      "";

    const history = Array.isArray(body.history)
      ? body.history.slice(-8)
      : [];

    const messages = [
      {
        role: "system",
        content: `
أنت مساعد قانوني ذكي باللغة العربية داخل مشروع "الشرح الميسر لنظام التنفيذ السعودي".

مهمتك:
- الإجابة بوضوح ودقة.
- شرح المسائل القانونية بأسلوب مفهوم.
- الاستفادة من نصوص وشرح نظام التنفيذ المرسل لك في السياق.
- إذا كان السؤال متعلقًا بمادة نظامية، وضّح رقم المادة متى كان ذلك متاحًا.
- ميّز بين النص النظامي والشرح أو الاستنتاج.
- لا تدّعي أن إجابتك تمثل رأيًا رسميًا لوزارة العدل أو جهة حكومية.
- إذا لم تكن المعلومات كافية، صرّح بذلك بدل اختلاق معلومة.
- يمكنك الإجابة عن الأسئلة العامة أيضًا، ولا تحصر المستخدم في صيغة سؤال محددة.
        `.trim()
      },
      ...history
        .filter(
          m =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        )
        .map(m => ({
          role: m.role,
          content: m.content
        })),
      {
        role: "user",
        content: context
          ? `السياق من المشروع:\n${context}\n\nالسؤال:\n${question}`
          : question
      }
    ];

    const response = await fetch(
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_OIDC_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "openai/gpt-6-astra",
          messages,
          max_tokens: 1800
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("AI Gateway error:", data);

      return res.status(response.status).json({
        error: "تعذر تشغيل المساعد الذكي",
        details: data
      });
    }

    const answer =
      data?.choices?.[0]?.message?.content ||
      "لم أتمكن من إنشاء إجابة.";

    return res.status(200).json({
      answer
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "حدث خطأ أثناء الاتصال بالمساعد الذكي"
    });
  }
}
