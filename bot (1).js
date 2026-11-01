// בוט וואטסאפ עם תפריט רשימה - Meta WhatsApp Cloud API
// הרצה: npm install express && node bot.js   (דורש Node 18 ומעלה)
//
// משתני סביבה נדרשים:
//   WHATSAPP_TOKEN    - טוקן גישה מ-Meta (מומלץ טוקן קבוע של System User)
//   PHONE_NUMBER_ID   - מזהה מספר הטלפון מלוח הבקרה של Meta
//   VERIFY_TOKEN      - מילת סיסמה כלשהי שתבחרי, תשמש לאימות ה-Webhook

const express = require("express");
const app = express();
app.use(express.json());

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.PHONE_NUMBER_ID;
const VERIFY = process.env.VERIFY_TOKEN || "my_secret_verify";

// ===== כאן עורכים את התוכן =====
const GREETING = "שלום! 👋\nמה שלומך? מה נשמע?\nבמה תרצי להתעניין?";

const MENU_ROWS = [
  { id: "scholarship", title: "מלגות", description: "מידע על מלגות והגשת מועמדות" },
  { id: "trips", title: "מסעות לחו״ל", description: "מסעות, תאריכים ופרטים" },
  { id: "events", title: "אירועים", description: "האירועים הקרובים שלנו" },
  { id: "lunch", title: "מפגשי צהריים נשיים", description: "אוכל טוב, חברה טובה" },
  { id: "human", title: "דברי עם נציגה", description: "נחזור אלייך אישית" },
];

const ANSWERS = {
  scholarship: "🎓 *מלגות*\nכאן כותבים את הפרטים על המלגות, תנאי הסף ולינק להגשה.",
  trips: "✈️ *מסעות לחו״ל*\nכאן כותבים על המסעות הקרובים, תאריכים, מחירים ולינק להרשמה.",
  events: "🎉 *אירועים*\nכאן כותבים על האירועים הקרובים, מקום ושעה ולינק להרשמה.",
  lunch: "🍽️ *מפגשי צהריים נשיים*\nמפגשים עם אוכל טוב, אווירה נעימה ונשים מדהימות. כאן כותבים תאריך, מיקום ואיך להירשם.",
  human: "בשמחה! השאירי כאן הודעה ונחזור אלייך בהקדם 💛",
};

const BACK_HINT = "\n\nלחזרה לתפריט שלחי: תפריט";
// ================================

const API = `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`;

async function send(payload) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  if (!res.ok) console.error("Send error:", await res.text());
}

const sendText = (to, body) =>
  send({ to, type: "text", text: { body } });

const sendMenu = (to) =>
  send({
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: GREETING },
      action: {
        button: "לבחירת נושא",
        sections: [{ title: "נושאים", rows: MENU_ROWS }],
      },
    },
  });

// אימות Webhook מול Meta
app.get("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === VERIFY
  ) {
    return res.status(200).send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

// קבלת הודעות
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // עונים מיד ל-Meta
  try {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg) return;
    const from = msg.from;

    // המשתמשת בחרה פריט מהרשימה
    if (msg.type === "interactive" && msg.interactive?.list_reply) {
      const id = msg.interactive.list_reply.id;
      await sendText(from, (ANSWERS[id] || "לא הבנתי, ננסה שוב?") + BACK_HINT);
      return;
    }

    // כל הודעת טקסט אחרת - מציגים את התפריט
    await sendMenu(from);
  } catch (e) {
    console.error(e);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
