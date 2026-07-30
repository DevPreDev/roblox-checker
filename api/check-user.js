export default async function handler(req, res) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Не указан userId' });
  }

  try {
    // 1. Проверяем подписку через официальный API Roblox (Premium / Roblox Plus)
    const apiRes = await fetch(`https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`);
    
    let isSubscribed = false;
    if (apiRes.ok) {
      isSubscribed = await apiRes.json(); // Возвращает true или false
    }

    return res.status(200).json({
      userId: userId,
      hasPremium: isSubscribed,
      hasRobloxPlus: isSubscribed
    });

  } catch (error) {
    return res.status(500).json({ error: 'Ошибка запроса к API Roblox' });
  }
}
