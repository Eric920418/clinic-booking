/**
 * LINE 整合工具
 * 對應規格：第 8 節 LINE 整合
 */

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

interface LineMessage {
  type: 'text';
  text: string;
}

/**
 * 發送 LINE 訊息
 * 對應規格：第 8.2 節 LINE Messaging API
 */
export async function sendLineMessage(
  userId: string,
  messages: LineMessage[]
): Promise<boolean> {
  // 非生產環境或未設定 Token 時，僅記錄訊息（Mock 模式）
  // 這樣在開發和測試環境都會 mock，不會實際呼叫 LINE API
  if (process.env.NODE_ENV !== 'production' || !LINE_CHANNEL_ACCESS_TOKEN) {
    console.log('[LINE Mock] Sending message to:', userId, messages);
    return true;
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[LINE] Failed to send message:', error);
    return false;
  }
}

/**
 * 發送驗證碼訊息
 * 對應規格：驗證碼訊息格式
 * 「您的驗證碼是：{code}，5 分鐘內有效」
 */
export async function sendVerificationCode(
  userId: string,
  code: string
): Promise<boolean> {
  return sendLineMessage(userId, [
    {
      type: 'text',
      text: `您的驗證碼是：${code}，5 分鐘內有效`,
    },
  ]);
}

/**
 * 發送預約成功通知
 * 對應規格：「預約成功！{date} {time} {doctor} {treatment}」
 */
export async function sendAppointmentConfirmation(
  userId: string,
  date: string,
  time: string,
  doctor: string,
  treatment: string
): Promise<boolean> {
  return sendLineMessage(userId, [
    {
      type: 'text',
      text: `預約成功！\n📅 ${date}\n⏰ ${time}\n👨‍⚕️ ${doctor}\n💊 ${treatment}`,
    },
  ]);
}

/**
 * 發送預約修改通知
 * 對應規格：「預約已修改！新時段：{date} {time}」
 */
export async function sendAppointmentModification(
  userId: string,
  date: string,
  time: string
): Promise<boolean> {
  return sendLineMessage(userId, [
    {
      type: 'text',
      text: `預約已修改！\n📅 新時段：${date} ${time}`,
    },
  ]);
}

/**
 * 發送預約取消通知
 * 對應規格：「預約已取消。如有需要請重新預約」
 */
export async function sendAppointmentCancellation(userId: string): Promise<boolean> {
  return sendLineMessage(userId, [
    {
      type: 'text',
      text: '預約已取消。如有需要請重新預約。',
    },
  ]);
}

/**
 * 發送停診通知
 * 對應規格：「{doctor} 醫師 {date} 停診，您的預約已取消」
 */
export async function sendClinicClosureNotification(
  userId: string,
  doctor: string,
  date: string
): Promise<boolean> {
  return sendLineMessage(userId, [
    {
      type: 'text',
      text: `${doctor} 醫師 ${date} 停診，您的預約已取消。造成不便敬請見諒。`,
    },
  ]);
}

